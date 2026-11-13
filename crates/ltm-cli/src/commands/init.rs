mod files;

use ltm_server::FileStore;
use std::{fs, path::Path};

const GUIDE: &str = include_str!("agent_guide.md");
const GUIDE_PATH: &str = ".ltm/AGENTS.md";
const POINTER: &str = "<!-- ltm -->\n과업지시서·프롬프트 작성 요청은 `.ltm/AGENTS.md`를 따른다.\n";

/// AI가 별도 학습 없이 LTM을 발견하도록 프로젝트 진입 문서에 안내를 등록한다 (UX-001 무학습 사용).
pub fn run(project: &Path) -> anyhow::Result<()> {
    fs::create_dir_all(project.join(".ltm/briefs"))?;
    // 저장소 쓰기와 같은 잠금을 유지해 여러 init의 읽기·추가·교체를 직렬화한다.
    let _lock = FileStore::new(project).lock_project()?;
    files::create_if_missing(&project.join(GUIDE_PATH), GUIDE)?;
    // 지시서·취향 노트는 커밋해 다음 작업자와 공유하고, 되돌리기 스냅샷만 제외한다.
    files::append_if(&project.join(".ltm/.gitignore"), true, "history/\n", |current| {
        !current
            .lines()
            .rev()
            .take_while(|line| !line.trim_start().starts_with('!'))
            .any(|line| matches!(line.trim(), "history/" | "/history/"))
    })?;

    // AGENTS.md는 항상, CLAUDE.md는 이미 있을 때만 갱신한다. 이미 등록돼 있으면 건드리지 않는다.
    for (name, create) in [("AGENTS.md", true), ("CLAUDE.md", false)] {
        // 이미 등록됐거나, AGENTS.md를 불러오는 문서(`@AGENTS.md`)면 안내가 두 번 읽히지 않게 건너뛴다.
        files::append_if(&project.join(name), create, POINTER, |current| {
            !current.contains("<!-- ltm -->") && (create || !current.contains("@AGENTS.md"))
        })?;
    }
    eprintln!("LTM initialized. Run `ltm ui` to open the editor (`ltm ui --no-open` for server only).");
    Ok(())
}
