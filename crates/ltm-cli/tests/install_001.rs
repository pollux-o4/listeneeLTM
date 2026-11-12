mod support;

use std::{fs, process::Stdio};
use support::Project;

const FILES: [&str; 4] = [".ltm/AGENTS.md", ".ltm/.gitignore", "AGENTS.md", "CLAUDE.md"];

fn snapshot(project: &Project) -> Vec<Vec<u8>> {
    FILES.iter().map(|file| fs::read(project.path().join(file)).unwrap()).collect()
}

#[test]
fn install_001_fresh_init_only_configures_and_explains_local_commands() {
    let project = Project::new();
    let output = project.init();
    assert!(String::from_utf8_lossy(&output.stderr).contains("ltm ui"));
    assert!(project.path().join(".ltm/briefs").is_dir());
    assert!(!project.path().join("CLAUDE.md").exists());
    assert_eq!(fs::read_to_string(project.path().join(".ltm/.gitignore")).unwrap(), "history/\n");
    let guide = fs::read_to_string(project.path().join(".ltm/AGENTS.md")).unwrap();
    assert!(guide.contains("pnpm exec ltm"));
    assert!(guide.contains("node_modules/.bin/ltm"));
    assert!(guide.contains("ltm.cmd"));
    assert!(guide.find("명령 탐색").unwrap() < guide.find("## 흐름").unwrap());
}

#[test]
fn install_001_preserves_user_files_and_repeated_init_is_identical() {
    let project = Project::new();
    fs::create_dir(project.path().join(".ltm")).unwrap();
    let originals: [&[u8]; 4] =
        [b"custom guide\n\xff", b"# custom\ncache/", b"project rules", b"claude rules\n"];
    for (name, content) in FILES.iter().zip(originals) {
        fs::write(project.path().join(name), content).unwrap();
    }

    project.init();
    let first = snapshot(&project);
    assert_eq!(first[0], originals[0]);
    for index in 1..FILES.len() {
        assert!(first[index].starts_with(originals[index]));
    }
    assert_eq!(String::from_utf8_lossy(&first[1]).matches("history/").count(), 1);
    for content in &first[2..] {
        assert_eq!(String::from_utf8_lossy(content).matches("<!-- ltm -->").count(), 1);
    }
    project.init();
    assert_eq!(snapshot(&project), first);
}

#[test]
fn install_001_keeps_existing_pointer_blocks_and_history_ignore() {
    let project = Project::new();
    fs::create_dir(project.path().join(".ltm")).unwrap();
    let originals = [
        "custom guide",
        "# keep\r\n/history/\r\n",
        "<!-- ltm -->\ncustom pointer",
        "<!-- ltm -->\nclaude pointer",
    ];
    for (name, content) in FILES.iter().zip(originals) {
        fs::write(project.path().join(name), content).unwrap();
    }
    project.init();
    project.init();
    assert_eq!(snapshot(&project), originals.map(|s| s.as_bytes().to_vec()));
}

#[test]
fn install_001_does_not_duplicate_claude_agents_import() {
    let project = Project::new();
    let content = "# Instructions\n@AGENTS.md\n";
    fs::write(project.path().join("CLAUDE.md"), content).unwrap();
    project.init();
    assert_eq!(fs::read_to_string(project.path().join("CLAUDE.md")).unwrap(), content);
}

#[test]
fn install_001_concurrent_initializers_preserve_content_without_duplicates() {
    let project = Project::new();
    fs::write(project.path().join("AGENTS.md"), "project rules").unwrap();
    fs::write(project.path().join("CLAUDE.md"), "claude rules").unwrap();
    let mut children: Vec<_> = (0..8)
        .map(|_| project.command().arg("init").stdout(Stdio::null()).stderr(Stdio::null()).spawn().unwrap())
        .collect();
    for child in &mut children {
        assert!(child.wait().unwrap().success());
    }
    let first = snapshot(&project);
    for (index, prefix) in [(2, "project rules"), (3, "claude rules")] {
        let text = String::from_utf8_lossy(&first[index]);
        assert!(text.starts_with(prefix));
        assert_eq!(text.matches("<!-- ltm -->").count(), 1);
    }
    assert_eq!(first[1], b"history/\n");
    project.init();
    assert_eq!(snapshot(&project), first);
    assert!(
        !fs::read_dir(project.path()).unwrap().any(|entry| entry
            .unwrap()
            .path()
            .extension()
            .is_some_and(|ext| ext == "tmp"))
    );
}

#[test]
fn install_001_unreadable_text_is_never_replaced() {
    let project = Project::new();
    let original = b"rules\xff";
    fs::write(project.path().join("AGENTS.md"), original).unwrap();
    assert!(!project.command().arg("init").output().unwrap().status.success());
    assert_eq!(fs::read(project.path().join("AGENTS.md")).unwrap(), original);
}

#[cfg(unix)]
#[test]
fn install_001_symlinks_are_not_replaced_and_permissions_are_preserved() {
    use std::os::unix::fs::{PermissionsExt, symlink};
    let project = Project::new();
    let agents = project.path().join("AGENTS.md");
    fs::write(&agents, "private rules").unwrap();
    fs::set_permissions(&agents, fs::Permissions::from_mode(0o600)).unwrap();
    let claude = project.path().join("CLAUDE.md");
    symlink("AGENTS.md", &claude).unwrap();
    project.init();
    assert!(fs::symlink_metadata(&claude).unwrap().is_symlink());
    assert!(fs::read_to_string(&agents).unwrap().starts_with("private rules"));
    assert_eq!(fs::metadata(&agents).unwrap().permissions().mode() & 0o777, 0o600);
}

#[test]
fn install_001_history_ignore_overrides_existing_negation_without_removing_it() {
    let project = Project::new();
    fs::create_dir(project.path().join(".ltm")).unwrap();
    let path = project.path().join(".ltm/.gitignore");
    let original = "history/\n!history/\n";
    fs::write(&path, original).unwrap();
    project.init();
    let first = fs::read_to_string(&path).unwrap();
    assert!(first.starts_with(original));
    assert!(first.ends_with("\nhistory/\n"));
    project.init();
    assert_eq!(fs::read_to_string(path).unwrap(), first);
}

#[cfg(unix)]
#[test]
fn install_001_does_not_replace_symlink_needing_an_update() {
    use std::os::unix::fs::symlink;
    let project = Project::new();
    let original = "external instructions";
    fs::write(project.path().join("external.md"), original).unwrap();
    let agents = project.path().join("AGENTS.md");
    symlink("external.md", &agents).unwrap();
    assert!(!project.command().arg("init").output().unwrap().status.success());
    assert!(fs::symlink_metadata(&agents).unwrap().is_symlink());
    assert_eq!(fs::read_to_string(agents).unwrap(), original);
}
