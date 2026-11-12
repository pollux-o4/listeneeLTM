use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::{Actor, SectionKey};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DecisionOption {
    pub id: String,
    pub label: String,
    /// 선택 시 영향 한 줄 (비용·시간 등)
    #[serde(default)]
    pub note: String,
    /// 선택하면 들어갈 문장
    pub text: String,
    /// 문장이 들어갈 섹션. 없으면 갈림길의 섹션(예: "다음 버전" → scopeOut).
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub section: Option<SectionKey>,
}

/// 갈림길의 조건: 앞 갈림길 `decision`이 `options` 중 하나로 정해졌을 때만 묻는다(DATA-001).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DecisionWhen {
    pub decision: String,
    pub options: Vec<String>,
}

/// 갈림길. `chosen`이 없으면 열린 결정, AI가 정했으면 `chosen_by = Ai`로 바꿀 수 있게 남는다.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Decision {
    pub id: String,
    pub section: SectionKey,
    pub question: String,
    /// 왜 묻는가(또는 왜 이렇게 정했는가)
    pub why: String,
    pub options: Vec<DecisionOption>,
    pub recommended: String,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chosen: Option<String>,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chosen_by: Option<Actor>,
    /// 있으면 이 조건이 맞을 때만 살아 있다. 없으면 늘 살아 있다.
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub when: Option<DecisionWhen>,
}

impl Decision {
    pub fn option(&self, id: &str) -> Option<&DecisionOption> {
        self.options.iter().find(|o| o.id == id)
    }

    /// 결정에서 파생된 항목 id. 선택을 바꾸면 이 항목이 교체된다.
    pub fn item_id(&self) -> String {
        format!("decision-{}", self.id)
    }
}
