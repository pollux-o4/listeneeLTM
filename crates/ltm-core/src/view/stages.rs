use crate::{
    model::{Brief, Decision, SECTION_KEYS, SectionKey},
    view::{Issue, IssueCode, IssueKind, StageStatus, StageView},
};

/// 사람이 정해야 할 갈림길: 열려 있고 살아 있는 것. 잠든 갈림길은 막힘이 아니다.
pub(crate) fn open_alive(brief: &Brief) -> impl Iterator<Item = &Decision> {
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

pub(super) fn for_brief(brief: &Brief) -> Vec<StageView> {
    SECTION_KEYS.iter().map(|&key| stage(brief, key)).collect()
}

pub(super) fn is_blocked(stage: &StageView) -> bool {
    matches!(stage.status, StageStatus::Fork | StageStatus::Empty)
}

pub(super) fn current(stages: &[StageView]) -> u32 {
    stages.iter().position(is_blocked).unwrap_or(stages.len()) as u32
}

pub(super) fn ready(stages: &[StageView]) -> bool {
    !stages.iter().any(is_blocked)
}

pub(super) fn issues(brief: &Brief, stages: &[StageView]) -> Vec<Issue> {
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
