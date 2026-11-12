mod brief;
mod files;
mod history;
mod preferences;

use std::{
    io,
    path::{Path, PathBuf},
};

use ltm_core::{BriefError, PatchError, PrefError};

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error(transparent)]
    Invalid(#[from] BriefError),
    #[error(transparent)]
    Patch(#[from] PatchError),
    #[error("brief not found: {0}")]
    NotFound(String),
    #[error("brief already exists: {0}")]
    Exists(String),
    #[error("brief id in {path} does not match the file name: found `{found}`")]
    IdentityMismatch { path: String, found: String },
    #[error(transparent)]
    Pref(#[from] PrefError),
    #[error("nothing to undo")]
    NothingToUndo,
    #[error(transparent)]
    Io(#[from] io::Error),
    #[error("corrupt file {path}: {source} (fix or remove the file; nothing was changed)")]
    Corrupt { path: String, source: serde_json::Error },
    #[error(transparent)]
    Encode(#[from] serde_json::Error),
}

/// 프로젝트별 격리 저장소.
/// - 현재: `<project>/.ltm/briefs/<id>.json`
/// - 되돌리기: `<project>/.ltm/history/<id>/<revision>.json` (적용 직전 상태)
/// - 취향 노트: `<project>/.ltm/preferences.json` (프로젝트에 커밋해 다음 작업자와 공유)
///
/// 쓰기(읽고-고치고-쓰기)는 `.ltm/.lock` 파일 잠금 안에서 한다. AI(CLI 프로세스)와 GUI(서버)가
/// 거의 동시에 써도 연산이 차례로 적용돼 서로의 변경을 지우지 않는다.
// shortcut: 동기 파일 I/O, 단일 사용자 로컬 도구라 충분, 같은 항목을 서로 다르게 고치는 충돌을 알려야 하면 revision 조건부 쓰기 도입
#[derive(Debug, Clone)]
pub struct FileStore {
    root: PathBuf,
}

impl FileStore {
    pub fn new(project_root: impl AsRef<Path>) -> Self {
        Self { root: project_root.as_ref().join(".ltm") }
    }
}
