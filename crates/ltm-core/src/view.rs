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
    /// 첫 작성을 마쳐 막힘이 없고, AI가 자기 리뷰를 아직 안 했다 → 제품 기준으로 리뷰·개선 1회(FLOW-001).
    pub self_review_due: bool,
    /// 조건이 맞지 않아 잠든 갈림길 id(DATA-001). 흐리게·잠금으로 보인다.
    pub dormant: Vec<String>,
    /// 고르면 다른 갈림길이 잠들거나 깨어나는 선택지들(UX-001 갈림길 의존: 고르기 전에 보인다).
    pub impacts: Vec<OptionImpact>,
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

/// 실제 선택을 사본에 적용해 살아 있는 갈림길의 차이를 잰다. 규칙을 두 번 쓰지 않으려고 같은 연산을 쓴다.
fn impacts(brief: &Brief) -> Vec<OptionImpact> {
    let alive = |b: &Brief| -> Vec<String> {
        b.decisions.iter().filter(|d| b.decision_alive(&d.id)).map(|d| d.id.clone()).collect()
    };
    let before = alive(brief);
    let mut out = Vec::new();
    for d in brief
        .decisions
        .iter()
        .filter(|d| brief.decisions.iter().any(|c| c.when.as_ref().is_some_and(|w| w.decision == d.id)))
    {
        for o in d.options.iter().filter(|o| d.chosen.as_deref() != Some(&o.id)) {
            let mut next = brief.clone();
            let patch = crate::BriefPatch::Choose { decision: d.id.clone(), option: o.id.clone() };
            if next.apply(patch, crate::model::Actor::Me).is_err() {
                continue;
            }
            let after = alive(&next);
            let sleeps: Vec<String> = before.iter().filter(|id| !after.contains(id)).cloned().collect();
            let wakes: Vec<String> = after.iter().filter(|id| !before.contains(id)).cloned().collect();
            if !sleeps.is_empty() || !wakes.is_empty() {
                out.push(OptionImpact { decision: d.id.clone(), option: o.id.clone(), sleeps, wakes });
            }
        }
    }
    out
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

/// 사람이 정해야 할 갈림길: 열려 있고 살아 있는 것. 잠든 갈림길은 막힘이 아니다.
pub(crate) fn open_alive(brief: &Brief) -> impl Iterator<Item = &crate::model::Decision> {
    brief.decisions.iter().filter(|d| d.chosen.is_none() && brief.decision_alive(&d.id))
}

fn stage(brief: &Brief, key: SectionKey) -> StageView {
    let items = brief.items(key);
    let open = open_alive(brief).filter(|d| d.section == key).count() as u32;
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
                for d in open_alive(brief).filter(|d| d.section == s.section) {
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
        let wrote = brief.sections.values().flatten().any(|i| i.by == crate::model::Actor::Ai);
        let self_review_due = ready && wrote && brief.reviewed_revision.is_none();
        let dormant =
            brief.decisions.iter().filter(|d| !brief.decision_alive(&d.id)).map(|d| d.id.clone()).collect();
        let impacts = impacts(&brief);
        Self { brief, stages, current, ready, issues, self_review_due, dormant, impacts }
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
