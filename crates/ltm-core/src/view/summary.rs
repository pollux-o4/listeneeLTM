use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{
    model::Brief,
    prefs::Preferences,
    view::{StageView, stages},
};

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

impl BriefSummary {
    pub fn new(brief: &Brief, prefs: &Preferences) -> Self {
        let stages: Vec<StageView> = stages::for_brief(brief);
        Self {
            id: brief.id.clone(),
            title: brief.title.clone(),
            revision: brief.revision,
            updated_at: brief.updated_at.clone(),
            ready: stages::ready(&stages),
            learning: LearningStatus::of(brief, prefs),
            derived_from: brief.derived_from.clone(),
        }
    }
}
