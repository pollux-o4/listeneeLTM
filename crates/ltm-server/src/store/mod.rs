mod files;
mod history;

use files::{json_stems, read_json, write_json};
use std::{
    io,
    path::{Path, PathBuf},
};

use ltm_core::{
    Actor, Brief, BriefError, BriefPatch, BriefSummary, PatchError, PrefError, PrefPatch, Preferences,
    validate_id,
};

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

    fn brief_path(&self, id: &str) -> Result<PathBuf, StoreError> {
        validate_id(id)?;
        Ok(self.root.join("briefs").join(format!("{id}.json")))
    }

    pub fn get(&self, id: &str) -> Result<Brief, StoreError> {
        read_json(&self.brief_path(id)?)?.ok_or_else(|| StoreError::NotFound(id.to_owned()))
    }

    /// 읽을 수 있는 지시서만 나열한다. 손상됐거나 이름이 규칙을 벗어난 파일 하나가
    /// 나머지 지시서로 가는 길을 막지 않는다(그 파일은 `get`이 경로와 함께 알린다).
    pub fn list(&self) -> Result<Vec<BriefSummary>, StoreError> {
        let mut out = Vec::new();
        for id in json_stems(&self.root.join("briefs"))? {
            match self.get(&id) {
                Ok(brief) => out.push(BriefSummary::from(&brief)),
                Err(StoreError::Invalid(_) | StoreError::Corrupt { .. }) => {}
                Err(e) => return Err(e),
            }
        }
        // 안정된 순서: 편집해도 탭 위치가 바뀌지 않는다.
        out.sort_by(|a, b| a.id.cmp(&b.id));
        Ok(out)
    }

    pub fn create(&self, id: &str, title: &str) -> Result<Brief, StoreError> {
        let _lock = self.lock()?;
        if self.brief_path(id)?.exists() {
            return Err(StoreError::Exists(id.to_owned()));
        }
        let brief = Brief::new(id, title)?;
        write_json(&self.brief_path(id)?, &brief)?;
        Ok(brief)
    }

    pub fn patch(&self, id: &str, patch: BriefPatch, by: Actor) -> Result<Brief, StoreError> {
        let _lock = self.lock()?;
        let before = self.get(id)?;
        let mut after = before.clone();
        after.apply(patch, by)?;
        self.push_history(&before)?;
        write_json(&self.brief_path(id)?, &after)?;
        Ok(after)
    }

    /// 직전 변경을 되돌린다. revision은 계속 증가해 GUI가 변화를 감지한다.
    pub fn undo(&self, id: &str, by: Actor) -> Result<Brief, StoreError> {
        let _lock = self.lock()?;
        let mut restored = self.get(id)?;
        let (revision, snapshot) = self.latest_history(id)?;
        restored.undo_to(snapshot, by);
        write_json(&self.brief_path(id)?, &restored)?;
        self.remove_history(id, revision)?;
        Ok(restored)
    }

    pub fn preferences(&self) -> Result<Preferences, StoreError> {
        Ok(read_json(&self.root.join("preferences.json"))?.unwrap_or_default())
    }

    pub fn patch_preferences(&self, patch: PrefPatch, by: Actor) -> Result<Preferences, StoreError> {
        let _lock = self.lock()?;
        let mut prefs = self.preferences()?;
        prefs.apply(patch, by)?;
        write_json(&self.root.join("preferences.json"), &prefs)?;
        Ok(prefs)
    }
}
