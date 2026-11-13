use std::{fs, process::Command};

#[test]
fn licenses_prints_embedded_notices_without_initializing_a_project() {
    let project = std::env::temp_dir().join(format!("ltm-licenses-{}", std::process::id()));
    fs::create_dir(&project).unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_ltm"))
        .current_dir(&project)
        .args(["--project", "missing-project", "licenses"])
        .output()
        .unwrap();
    let contents = fs::read_dir(&project).unwrap().count();
    fs::remove_dir(&project).unwrap();

    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    assert!(output.stderr.is_empty());
    assert_eq!(output.stdout, include_bytes!("../../../docs/legal/THIRD_PARTY_NOTICES.txt"));
    assert_eq!(contents, 0, "license output must not initialize or write project data");
    let text = String::from_utf8(output.stdout).unwrap();
    for component in ["cargo:tokio@", "npm:galmuri@", "npm:react@", "musl 1.2.5"] {
        assert!(text.contains(component), "missing notices for {component}");
    }
}
