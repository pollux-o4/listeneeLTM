use super::{
    FileStore, StoreError,
    files::{json_stems, read_json, write_json},
};
use ltm_core::{Brief, validate_id};
use std::{fs, path::PathBuf};

const HISTORY_LIMIT: usize = 50;

impl FileStore {
    fn history_dir(&self, id: &str) -> Result<PathBuf, StoreError> {
        validate_id(id)?;
        Ok(self.root.join("history").join(id))
    }

    pub(super) fn push_history(&self, before: &Brief) -> Result<(), StoreError> {
        let dir = self.history_dir(&before.id)?;
        write_json(&dir.join(format!("{}.json", before.revision)), before)?;
        let mut revs = revisions(&dir)?;
        revs.sort_unstable();
        for old in revs.iter().take(revs.len().saturating_sub(HISTORY_LIMIT)) {
            fs::remove_file(dir.join(format!("{old}.json")))?;
        }
        Ok(())
    }
    pub(super) fn latest_history(&self, id: &str) -> Result<(u64, Brief), StoreError> {
        let dir = self.history_dir(id)?;
        let latest = revisions(&dir)?.into_iter().max().ok_or(StoreError::NothingToUndo)?;
        let snapshot = read_json(&dir.join(format!("{latest}.json")))?.ok_or(StoreError::NothingToUndo)?;
        Ok((latest, snapshot))
    }

    pub(super) fn remove_history(&self, id: &str, revision: u64) -> Result<(), StoreError> {
        Ok(fs::remove_file(self.history_dir(id)?.join(format!("{revision}.json")))?)
    }

    pub fn can_undo(&self, id: &str) -> Result<bool, StoreError> {
        Ok(!revisions(&self.history_dir(id)?)?.is_empty())
    }
}
fn revisions(dir: &std::path::Path) -> Result<Vec<u64>, StoreError> {
    Ok(json_stems(dir)?.iter().filter_map(|s| s.parse().ok()).collect())
}
