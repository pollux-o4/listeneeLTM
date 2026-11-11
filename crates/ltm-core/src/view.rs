use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{
    model::{Brief, SECTION_KEYS, SectionKey},
    prefs::Preferences,
};

/// 단계 상태. 우선순위 fork > empty > review > clear.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum StageStatus {
    /// 사용자가 정할 갈림길이 있다
    Fork,
    /// 필수인데 비어 있다
    Empty,
    /// AI가 쓰거나 정한 것 중 확인 전이 있다
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
}

/// 목록용 요약.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BriefSummary {
    pub id: String,
    pub title: String,
    #[ts(type = "number")]
    pub revision: u64,
    pub updated_at: String,
    pub ready: bool,
    pub learning: LearningStatus,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub derived_from: Option<String>,
}

/// 지시서의 학습 상태(DATA-001). 저장하지 않고 분석 버전과 노트 출처로 계산한다(ADR-0008).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[ts(export)]
pub enum LearningStatus {
    Unanalyzed,
    Stale { count: u32 },
    Learned { count: u32 },
    NothingNew,
}

impl LearningStatus {
    pub fn of(brief: &Brief, prefs: &Preferences) -> Self {
        let count = prefs.items.iter().filter(|p| !p.retired && p.sources.contains(&brief.id)).count() as u32;
        match brief.analyzed_revision {
            None => Self::Unanalyzed,
            Some(at) if at < brief.revision => Self::Stale { count },
            Some(_) if count > 0 => Self::Learned { count },
            Some(_) => Self::NothingNew,
        }
    }
}

fn stage(brief: &Brief, key: SectionKey) -> StageView {
    let items = brief.items(key);
    let open = brief.decisions.iter().filter(|d| d.section == key && d.chosen.is_none()).count() as u32;
    let unconfirmed = items.iter().filter(|i| !i.confirmed).count() as u32;
    let status = if open > 0 {
        StageStatus::Fork
    } else if key.required() && items.is_empty() {
        StageStatus::Empty
    } else if unconfirmed > 0 {
        StageStatus::Review
    } else {
        StageStatus::Clear
    };
    StageView { section: key, status, required: key.required(), open_decisions: open, unconfirmed }
}

fn issues(brief: &Brief, stages: &[StageView]) -> Vec<Issue> {
    let mut out = Vec::new();
    for s in stages {
        match s.status {
            StageStatus::Empty => {
                out.push(Issue { kind: IssueKind::Blocking, section: s.section, code: IssueCode::EmptyStage })
            }
            StageStatus::Fork => {
                for d in brief.decisions.iter().filter(|d| d.section == s.section && d.chosen.is_none()) {
                    out.push(Issue {
                        kind: IssueKind::Blocking,
                        section: s.section,
                        code: IssueCode::OpenDecision { question: d.question.clone() },
                    });
                }
            }
            _ => {}
        }
        if s.unconfirmed > 0 {
            out.push(Issue {
                kind: IssueKind::Review,
                section: s.section,
                code: IssueCode::Unconfirmed { count: s.unconfirmed },
            });
        }
    }
    out
}

impl From<Brief> for BriefView {
    fn from(brief: Brief) -> Self {
        let stages: Vec<StageView> = SECTION_KEYS.iter().map(|&k| stage(&brief, k)).collect();
        let blocked = |s: &&StageView| matches!(s.status, StageStatus::Fork | StageStatus::Empty);
        let current = stages.iter().position(|s| blocked(&s)).unwrap_or(stages.len()) as u32;
        let ready = !stages.iter().any(|s| blocked(&s));
        let issues = issues(&brief, &stages);
        Self { brief, stages, current, ready, issues }
    }
}

impl BriefSummary {
    pub fn new(b: &Brief, prefs: &Preferences) -> Self {
        Self {
            id: b.id.clone(),
            title: b.title.clone(),
            revision: b.revision,
            updated_at: b.updated_at.clone(),
            ready: BriefView::from(b.clone()).ready,
            learning: LearningStatus::of(b, prefs),
            derived_from: b.derived_from.clone(),
        }
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
