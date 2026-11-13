use super::{
    FileStore, StoreError,
    files::{read_json, write_json},
};
use ltm_core::{Actor, PrefPatch, Preferences};

impl FileStore {
    pub fn preferences(&self) -> Result<Preferences, StoreError> {
        Ok(read_json(&self.root.join("preferences.json"))?.unwrap_or_default())
    }

    pub fn patch_preferences(&self, patch: PrefPatch, by: Actor) -> Result<Preferences, StoreError> {
        let _lock = self.lock_project()?;
        let mut prefs = self.preferences()?;
        prefs.apply(patch, by)?;
        write_json(&self.root.join("preferences.json"), &prefs)?;
        Ok(prefs)
    }
}
