use super::{
    FileStore, StoreError,
    files::{json_stems, read_json, write_json},
};
use ltm_core::{Actor, Brief, BriefPatch, BriefSummary, validate_id};
use std::path::PathBuf;

impl FileStore {
    pub(super) fn brief_path(&self, id: &str) -> Result<PathBuf, StoreError> {
        validate_id(id)?;
        Ok(self.root.join("briefs").join(format!("{id}.json")))
    }

    pub fn get(&self, id: &str) -> Result<Brief, StoreError> {
        let path = self.brief_path(id)?;
        let brief: Brief = read_json(&path)?.ok_or_else(|| StoreError::NotFound(id.to_owned()))?;
        if brief.id != id {
            return Err(StoreError::IdentityMismatch { path: path.display().to_string(), found: brief.id });
        }
        Ok(brief)
    }

    /// 읽을 수 있는 지시서만 나열한다. 손상됐거나 이름이 규칙을 벗어난 파일 하나가
    /// 나머지 지시서로 가는 길을 막지 않는다(그 파일은 `get`이 경로와 함께 알린다).
    pub fn list(&self) -> Result<Vec<BriefSummary>, StoreError> {
        let mut out = Vec::new();
        let prefs = self.preferences()?;
        for id in json_stems(&self.root.join("briefs"))? {
            match self.get(&id) {
                Ok(brief) => out.push(BriefSummary::new(&brief, &prefs)),
                Err(
                    StoreError::Invalid(_) | StoreError::Corrupt { .. } | StoreError::IdentityMismatch { .. },
                ) => {}
                Err(e) => return Err(e),
            }
        }
        // 안정된 순서: 편집해도 탭 위치가 바뀌지 않는다.
        out.sort_by(|a, b| a.id.cmp(&b.id));
        Ok(out)
    }

    pub fn create(&self, id: &str, title: &str) -> Result<Brief, StoreError> {
        let _lock = self.lock_project()?;
        let path = self.brief_path(id)?;
        if path.exists() {
            return Err(StoreError::Exists(id.to_owned()));
        }
        let brief = Brief::new(id, title)?;
        write_json(&path, &brief)?;
        Ok(brief)
    }

    /// 기존 지시서를 복제해 새로 시작한다(FLOW-002). 원본은 바뀌지 않는다.
    pub fn duplicate(&self, from: &str, id: &str, title: &str, by: Actor) -> Result<Brief, StoreError> {
        let _lock = self.lock_project()?;
        let path = self.brief_path(id)?;
        if path.exists() {
            return Err(StoreError::Exists(id.to_owned()));
        }
        let source = self.get(from)?;
        self.duplicate_locked(&source, id, title, by)
    }

    /// 원본 id 뒤에 `-2`부터 붙여 비어 있는 첫 id로 복제한다(FLOW-002).
    pub fn duplicate_next(&self, from: &str, title: &str, by: Actor) -> Result<Brief, StoreError> {
        let _lock = self.lock_project()?;
        let source = self.get(from)?;
        let mut number = 2u64;
        loop {
            let suffix = format!("-{number}");
            let mut stem = source.id.clone();
            while validate_id(&format!("{stem}{suffix}")).is_err() && !stem.is_empty() {
                stem.pop();
            }
            let id = format!("{stem}{suffix}");
            let path = self.brief_path(&id)?;
            if !path.exists() {
                return self.duplicate_locked(&source, &id, title, by);
            }
            number += 1;
        }
    }

    fn duplicate_locked(
        &self,
        source: &Brief,
        id: &str,
        title: &str,
        by: Actor,
    ) -> Result<Brief, StoreError> {
        let path = self.brief_path(id)?;
        let brief = source.derive(id, title, by)?;
        write_json(&path, &brief)?;
        Ok(brief)
    }

    pub fn patch(&self, id: &str, patch: BriefPatch, by: Actor) -> Result<Brief, StoreError> {
        let _lock = self.lock_project()?;
        let before = self.get(id)?;
        let mut after = before.clone();
        after.apply(patch, by)?;
        // shortcut: 교체 실패 후 선행 스냅샷이 남을 수 있음, 다중 파일 트랜잭션이 필요해지면 재검토
        self.push_history(&before)?;
        write_json(&self.brief_path(id)?, &after)?;
        Ok(after)
    }

    /// 직전 변경을 되돌린다. revision은 계속 증가해 GUI가 변화를 감지한다.
    pub fn undo(&self, id: &str, by: Actor) -> Result<Brief, StoreError> {
        let _lock = self.lock_project()?;
        let mut restored = self.get(id)?;
        let (revision, snapshot) = self.latest_history(id)?;
        restored.undo_to(snapshot, by);
        write_json(&self.brief_path(id)?, &restored)?;
        self.remove_history(id, revision)?;
        Ok(restored)
    }
}
