mod impacts;
mod stages;
mod summary;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use std::collections::BTreeMap;

use crate::model::{Brief, SectionKey};

pub(crate) use stages::open_alive;
pub use summary::{BriefSummary, LearningStatus};

/// 단계 상태. 우선순위 fork > empty > review > clear.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum StageStatus {
    /// 사용자가 정할 갈림길이 있다
    Fork,
    /// 필수인데 비어 있다
    Empty,
    /// 확인 전인 항목이 있다
    Review,
    Clear,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct StageView {
    pub section: SectionKey,
    pub status: StageStatus,
    pub required: bool,
    pub open_decisions: u32,
    pub unconfirmed: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum IssueKind {
    /// 전달 전 반드시 해소
    Blocking,
    /// 전달은 가능, 확인 권장
    Review,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Issue {
    pub kind: IssueKind,
    pub section: SectionKey,
    pub code: IssueCode,
}

/// GUI·CLI가 그대로 보여주는 판정 결과. 판정 규칙의 원본.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BriefView {
    pub brief: Brief,
    pub stages: Vec<StageView>,
    /// 막힌(fork·empty) 첫 단계 index. 모두 통과면 단계 수(=전달).
    pub current: u32,
    /// 막힘 없음 → 전달 가능
    pub ready: bool,
    pub issues: Vec<Issue>,
    /// 첫 작성을 마쳐 막힘이 없고, AI가 자기 리뷰를 아직 안 했다 → 제품 기준으로 리뷰·개선 1회(FLOW-001).
    pub self_review_due: bool,
    /// 조건이 맞지 않아 잠든 갈림길 id(DATA-001). 흐리게·잠금으로 보인다.
    pub dormant: Vec<String>,
    /// 고르면 다른 갈림길이 잠들거나 깨어나는 선택지들(UX-001 갈림길 의존: 고르기 전에 보인다).
    pub impacts: Vec<OptionImpact>,
    /// 갈림길에서 파생된 항목 id. UI는 이 도메인 id를 사용한다.
    pub decision_items: BTreeMap<String, String>,
}

/// 선택지 하나를 골랐을 때 다른 갈림길에 생기는 변화.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptionImpact {
    pub decision: String,
    pub option: String,
    pub sleeps: Vec<String>,
    pub wakes: Vec<String>,
}

impl From<Brief> for BriefView {
    fn from(brief: Brief) -> Self {
        let stages = stages::for_brief(&brief);
        let current = stages::current(&stages);
        let ready = stages::ready(&stages);
        let issues = stages::issues(&brief, &stages);
        let wrote = brief.sections.values().flatten().any(|i| i.by == crate::model::Actor::Ai);
        let self_review_due = ready && wrote && brief.reviewed_revision.is_none();
        let dormant =
            brief.decisions.iter().filter(|d| !brief.decision_alive(&d.id)).map(|d| d.id.clone()).collect();
        let impacts = impacts::calculate(&brief);
        let decision_items = brief.decisions.iter().map(|d| (d.id.clone(), d.item_id())).collect();
        Self { brief, stages, current, ready, issues, self_review_due, dormant, impacts, decision_items }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[ts(export)]
pub enum IssueCode {
    EmptyStage,
    OpenDecision { question: String },
    Unconfirmed { count: u32 },
}
