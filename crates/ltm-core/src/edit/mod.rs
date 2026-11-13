mod decisions;
mod items;
mod requests;
mod style;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::model::{Actor, Brief, BriefError, ChangeEvent, DecisionOption, now, record};

/// AI(CLI·파일)와 사람(GUI)이 공유하는 편집 연산. 누가 했는지는 적용 시 `Actor`로 받는다.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, schemars::JsonSchema)]
#[serde(tag = "op", rename_all = "camelCase", rename_all_fields = "camelCase")]
#[ts(export)]
pub enum BriefPatch {
    SetTitle {
        value: String,
    },
    AddItem {
        section: crate::model::SectionKey,
        text: String,
        /// 자세히(선택). 제목에 못 담는 풀이·조건.
        #[serde(default)]
        #[ts(optional)]
        detail: Option<String>,
    },
    /// `detail`을 생략하면 그대로 두고, 빈 문자열이면 지운다.
    EditItem {
        id: String,
        text: String,
        #[serde(default)]
        #[ts(optional)]
        detail: Option<String>,
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
    /// AI가 첫 작성 뒤 제품 기준으로 자기 리뷰·개선을 마쳤다(FLOW-001).
    MarkReviewed,
    /// 사람이 항목·갈림길에 AI에게 할 말을 남긴다.
    Request {
        target: crate::model::RequestTarget,
        text: String,
    },
    /// AI가 열린 요청을 모두 맡는다(처리 시작). 사람 화면에 '처리 중'으로 보인다.
    TakeRequests,
    /// AI가 요청을 처리했다: 답(무엇을 했는지 또는 질문의 답)을 한 줄로 남긴다.
    ResolveRequest {
        id: String,
        reply: String,
    },
    /// 사람이 답을 봤다고 표시한다(선택).
    AcknowledgeRequest {
        id: String,
    },
    RemoveRequest {
        id: String,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, schemars::JsonSchema)]
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
    /// 앞 갈림길의 선택에 따라서만 묻는다(DATA-001).
    #[serde(default)]
    #[ts(optional)]
    pub when: Option<crate::model::DecisionWhen>,
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
    #[error("rejected: `{field}` {reason}. Fix: {hint}")]
    Style { field: &'static str, reason: String, hint: String },
    #[error("`when` must point to an existing decision and its options")]
    InvalidCondition,
    #[error("decision `{0}` is waiting on an earlier choice")]
    DormantDecision(String),
    #[error("request not found: {0}")]
    UnknownRequest(String),
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
            BriefPatch::AddItem { section, text, detail } => {
                items::add(self, section, &text, detail.as_deref(), by)
            }
            BriefPatch::EditItem { id, text, detail } => items::edit(self, &id, &text, detail.as_deref(), by),
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
            BriefPatch::Request { target, text } => requests::add(self, target, &text),
            BriefPatch::TakeRequests => requests::take(self),
            BriefPatch::ResolveRequest { id, reply } => requests::resolve(self, &id, &reply, by),
            BriefPatch::AcknowledgeRequest { id } => requests::acknowledge(self, &id),
            BriefPatch::RemoveRequest { id } => requests::remove(self, &id),
            BriefPatch::MarkReviewed => {
                self.reviewed_revision = Some(self.revision + 1);
                Ok(ChangeEvent::Reviewed {})
            }
        }
    }
}
