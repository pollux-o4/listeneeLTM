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
    /// 사람이 AI에게 남긴 요청(DATA-001). 처리해도 사람이 닫을 때까지 남는다.
    #[serde(default)]
    pub requests: Vec<super::Request>,
    /// 최신이 앞. 길이는 `CHANGE_LOG_LIMIT`로 제한.
    #[serde(default)]
    pub changes: Vec<Change>,
    /// AI가 이 지시서에서 취향을 분석한 직후의 revision(ADR-0008). 이후 바뀌면 다시 분석 대상.
    #[ts(optional, type = "number")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub analyzed_revision: Option<u64>,
    /// AI가 첫 작성 뒤 제품 기준으로 자기 리뷰·개선을 마친 revision(FLOW-001). 한 번만 한다.
    #[ts(optional, type = "number")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reviewed_revision: Option<u64>,
    /// 복제 원본 지시서 id(FLOW-002).
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub derived_from: Option<String>,
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
            requests: Vec::new(),
            changes: Vec::new(),
            analyzed_revision: None,
            reviewed_revision: None,
            derived_from: None,
        })
    }

    /// 복제해 새로 시작한다(FLOW-002): 내용·갈림길은 가져가고, 항목은 새 맥락에서 다시 보도록 확인 전으로,
    /// 기록·분석 버전은 비운다.
    pub fn derive(&self, id: &str, title: &str, by: Actor) -> Result<Self, BriefError> {
        let mut next = Self::new(id, title)?;
        next.sections = self.sections.clone();
        for item in next.sections.values_mut().flatten() {
            item.confirmed = false;
        }
        next.decisions = self.decisions.clone();
        next.derived_from = Some(self.id.clone());
        next.revision = 1;
        record(
            &mut next.changes,
            1,
            by,
            ChangeEvent::Derived { from: self.id.clone() },
            next.updated_at.clone(),
        );
        Ok(next)
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

    /// 갈림길이 살아 있는가: 조건이 없거나, 앞 갈림길이 살아 있고 조건의 선택지로 정해졌다.
    /// 조건은 먼저 있던 갈림길만 가리키므로(ask 검증) 재귀가 끝난다.
    pub fn decision_alive(&self, id: &str) -> bool {
        let Some(d) = self.decisions.iter().find(|d| d.id == id) else { return false };
        match &d.when {
            None => true,
            Some(when) => {
                let parent = self.decisions.iter().find(|p| p.id == when.decision);
                parent.is_some_and(|p| {
                    p.chosen.as_ref().is_some_and(|c| when.options.contains(c)) && self.decision_alive(&p.id)
                })
            }
        }
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
