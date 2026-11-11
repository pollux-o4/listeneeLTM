use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::{
    Actor, Change, ChangeEvent, Item, SECTION_KEYS, SectionKey,
    change::record,
    text::{now, sentence, validate_id},
};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Brief {
    pub id: String,
    pub title: String,
    /// 변경마다 1 증가. GUI는 이 값으로 다시 그릴지 판단한다.
    #[ts(type = "number")]
    pub revision: u64,
    /// RFC 3339
    pub updated_at: String,
    #[serde(default)]
    pub sections: BTreeMap<SectionKey, Vec<Item>>,
    #[serde(default)]
    pub decisions: Vec<super::Decision>,
    /// 최신이 앞. 길이는 `CHANGE_LOG_LIMIT`로 제한.
    #[serde(default)]
    pub changes: Vec<Change>,
}

#[derive(Debug, thiserror::Error, PartialEq)]
pub enum BriefError {
    #[error("invalid id `{0}`: use lowercase letters, digits and hyphens")]
    InvalidId(String),
    #[error("text must not be empty")]
    EmptyText,
}

impl Brief {
    pub fn new(id: &str, title: &str) -> Result<Self, BriefError> {
        validate_id(id)?;
        Ok(Self {
            id: id.to_owned(),
            title: sentence(title)?,
            revision: 0,
            updated_at: now(),
            sections: SECTION_KEYS.into_iter().map(|k| (k, Vec::new())).collect(),
            decisions: Vec::new(),
            changes: Vec::new(),
        })
    }

    /// 스냅샷의 내용으로 되돌리되 현재 revision과 갱신 시각을 이어간다.
    pub fn undo_to(&mut self, mut snapshot: Brief, by: Actor) {
        let undone = self
            .changes
            .iter()
            .find(|c| c.revision == snapshot.revision + 1)
            .map(|c| Box::new(c.event.clone()));
        snapshot.revision = self.revision + 1;
        snapshot.updated_at = self.updated_at.clone();
        record(
            &mut snapshot.changes,
            snapshot.revision,
            by,
            ChangeEvent::Undo { undone },
            snapshot.updated_at.clone(),
        );
        *self = snapshot;
    }

    pub fn items(&self, key: SectionKey) -> &[Item] {
        self.sections.get(&key).map_or(&[], Vec::as_slice)
    }
}

pub(crate) fn items_mut(brief: &mut Brief, key: SectionKey) -> &mut Vec<Item> {
    brief.sections.entry(key).or_default()
}

pub(crate) fn find_item_mut<'a>(brief: &'a mut Brief, id: &str) -> Option<&'a mut Item> {
    brief.sections.values_mut().flatten().find(|i| i.id == id)
}
