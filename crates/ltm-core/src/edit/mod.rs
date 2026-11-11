mod decisions;
mod items;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::model::{Actor, Brief, BriefError, ChangeEvent, DecisionOption, now, record};

/// AI(CLI·파일)와 사람(GUI)이 공유하는 편집 연산. 누가 했는지는 적용 시 `Actor`로 받는다.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "op", rename_all = "camelCase", rename_all_fields = "camelCase")]
#[ts(export)]
pub enum BriefPatch {
    SetTitle {
        value: String,
    },
    AddItem {
        section: crate::model::SectionKey,
        text: String,
    },
    EditItem {
        id: String,
        text: String,
    },
    RemoveItem {
        id: String,
    },
    ConfirmItem {
        id: String,
    },
    ConfirmSection {
        section: crate::model::SectionKey,
    },
    /// 갈림길 만들기. `decide: true`면 추천대로 미리 정해 두고 사용자가 바꿀 수 있게 한다.
    Ask {
        decision: NewDecision,
    },
    Choose {
        decision: String,
        option: String,
    },
    /// 열린 갈림길을 모두 추천대로 정한다.
    AcceptRecommended,
    /// AI가 이 지시서에서 취향 분석을 마쳤다(학습 상태, ADR-0008).
    MarkAnalyzed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NewDecision {
    pub id: String,
    pub section: crate::model::SectionKey,
    pub question: String,
    pub why: String,
    pub options: Vec<DecisionOption>,
    pub recommended: String,
    #[serde(default)]
    #[ts(optional)]
    pub decide: Option<bool>,
}

#[derive(Debug, thiserror::Error, PartialEq)]
pub enum PatchError {
    #[error("item not found: {0}")]
    UnknownItem(String),
    #[error("decision not found: {0}")]
    UnknownDecision(String),
    #[error("option `{option}` not in decision `{decision}`")]
    UnknownOption { decision: String, option: String },
    #[error("decision already exists: {0}")]
    DuplicateDecision(String),
    #[error("decision needs at least two options and a recommended option among them")]
    InvalidDecision,
    #[error("option `{0}` appears more than once in the decision")]
    DuplicateOption(String),
    #[error("text must not be empty")]
    EmptyText,
    #[error(transparent)]
    InvalidId(BriefError),
    #[error("nothing to change")]
    NoOp,
}

impl From<BriefError> for PatchError {
    fn from(error: BriefError) -> Self {
        match error {
            BriefError::EmptyText => Self::EmptyText,
            error @ BriefError::InvalidId(_) => Self::InvalidId(error),
        }
    }
}

impl Brief {
    /// 연산 하나를 원자적으로 적용한다. 실패하면 아무것도 바뀌지 않는다.
    pub fn apply(&mut self, patch: BriefPatch, by: Actor) -> Result<(), PatchError> {
        let mut next = self.clone();
        let event = next.apply_inner(patch, by)?;
        next.revision += 1;
        next.updated_at = now();
        record(&mut next.changes, next.revision, by, event, next.updated_at.clone());
        *self = next;
        Ok(())
    }

    fn apply_inner(&mut self, patch: BriefPatch, by: Actor) -> Result<ChangeEvent, PatchError> {
        match patch {
            BriefPatch::SetTitle { value } => items::set_title(self, &value),
            BriefPatch::AddItem { section, text } => items::add(self, section, &text, by),
            BriefPatch::EditItem { id, text } => items::edit(self, &id, &text, by),
            BriefPatch::RemoveItem { id } => items::remove(self, &id),
            BriefPatch::ConfirmItem { id } => items::confirm(self, &id),
            BriefPatch::ConfirmSection { section } => items::confirm_section(self, section),
            BriefPatch::Ask { decision } => decisions::ask(self, decision, by),
            BriefPatch::Choose { decision, option } => decisions::choose(self, &decision, &option, by),
            BriefPatch::AcceptRecommended => decisions::accept_recommended(self, by),
            BriefPatch::MarkAnalyzed => {
                // 적용 후 revision을 기록해, 이후 변경이 있으면 다시 분석 대상이 된다.
                self.analyzed_revision = Some(self.revision + 1);
                Ok(ChangeEvent::Analyzed {})
            }
        }
    }
}
