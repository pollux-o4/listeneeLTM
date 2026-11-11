//! 취향 노트: 사용자의 질의·요구 패턴에서 드러난 판단 기준을 쌓아 두는 프로젝트 기억.
//! AI가 관찰해 제안(확인 전)하고, 사람은 확인·수정·내려놓기만 한다. 반복 관찰은 근거로 누적된다.
//! 다음 작업자(AI·사람)는 작업 전에 활성 항목만 읽는다(맥락 절제).
mod ops;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::model::{Actor, BriefError, Change, now, record};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Preference {
    pub id: String,
    /// 묶음 키(자유 문자열). 예: 결정, 탐색, 모션, 문서
    pub topic: String,
    /// 한 문장 기준. 예: "업계 관행으로 자명한 선택은 묻지 말고 정한 뒤 알린다"
    pub statement: String,
    /// 근거: 관찰된 요청을 짧게 요약(원문 인용 아님). 최신이 뒤.
    pub evidence: Vec<String>,
    pub by: Actor,
    pub confirmed: bool,
    /// 더 이상 적용하지 않음. 이력 보존을 위해 지우지 않는다.
    pub retired: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Preferences {
    #[ts(type = "number")]
    pub revision: u64,
    pub items: Vec<Preference>,
    pub changes: Vec<Change>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "op", rename_all = "camelCase", rename_all_fields = "camelCase")]
#[ts(export)]
pub enum PrefPatch {
    /// 새 기준. 같은 topic·statement가 이미 있으면 근거만 더한다(반복 관찰 = 강화).
    Note {
        topic: String,
        statement: String,
        evidence: String,
    },
    /// 기존 기준에 근거 추가
    Reinforce {
        id: String,
        evidence: String,
    },
    Edit {
        id: String,
        statement: String,
    },
    Confirm {
        id: String,
    },
    Retire {
        id: String,
    },
    Restore {
        id: String,
    },
}

#[derive(Debug, thiserror::Error, PartialEq)]
pub enum PrefError {
    #[error("preference not found: {0}")]
    NotFound(String),
    #[error("text must not be empty")]
    EmptyText,
    #[error("nothing to change")]
    NoOp,
}

impl From<BriefError> for PrefError {
    fn from(_: BriefError) -> Self {
        Self::EmptyText
    }
}

impl Preferences {
    pub fn apply(&mut self, patch: PrefPatch, by: Actor) -> Result<(), PrefError> {
        let mut next = self.clone();
        let event = ops::apply(&mut next, patch, by)?;
        next.revision += 1;
        record(&mut next.changes, next.revision, by, event, now());
        *self = next;
        Ok(())
    }
}
