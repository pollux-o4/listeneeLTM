use std::{fs, io, path::Path};

const GUIDE: &str = include_str!("agent_guide.md");
const GUIDE_PATH: &str = ".ltm/AGENTS.md";
const POINTER: &str = "<!-- ltm -->\n과업지시서·프롬프트 작성 요청은 `.ltm/AGENTS.md`를 따른다.\n";

/// AI가 별도 학습 없이 LTM을 발견하도록 프로젝트 진입 문서에 안내를 등록한다 (UX-001 무학습 사용).
pub fn run(project: &Path) -> anyhow::Result<()> {
    fs::create_dir_all(project.join(".ltm/briefs"))?;
    fs::write(project.join(GUIDE_PATH), GUIDE)?;
    eprintln!("wrote {GUIDE_PATH}");
    // 지시서·취향 노트는 커밋해 다음 작업자와 공유하고, 되돌리기 스냅샷만 제외한다.
    fs::write(project.join(".ltm/.gitignore"), "history/\n")?;

    // AGENTS.md는 항상, CLAUDE.md는 이미 있을 때만 갱신한다. 이미 등록돼 있으면 건드리지 않는다.
    for (name, create) in [("AGENTS.md", true), ("CLAUDE.md", false)] {
        let path = project.join(name);
        let current = match fs::read_to_string(&path) {
            Ok(text) => text,
            Err(e) if e.kind() == io::ErrorKind::NotFound && create => String::new(),
            Err(e) if e.kind() == io::ErrorKind::NotFound => continue,
            Err(e) => return Err(e.into()),
        };
        // 이미 등록됐거나, AGENTS.md를 불러오는 문서(`@AGENTS.md`)면 안내가 두 번 읽히지 않게 건너뛴다.
        if current.contains("<!-- ltm -->") || (!create && current.contains("@AGENTS.md")) {
            continue;
        }
        let sep = match current.as_str() {
            "" => "",
            s if s.ends_with("\n\n") => "",
            s if s.ends_with('\n') => "\n",
            _ => "\n\n",
        };
        fs::write(&path, format!("{current}{sep}{POINTER}"))?;
        eprintln!("registered LTM in {name}");
    }
    Ok(())
}
