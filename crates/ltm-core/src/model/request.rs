use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// 요청이 가리키는 자리(DATA-001).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, schemars::JsonSchema)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[ts(export)]
pub enum RequestTarget {
    Item { id: String },
    Decision { id: String },
}

/// 사람이 항목·갈림길에 남긴 AI에게 할 말. AI가 처리하면 `reply`가 채워진다.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Request {
    pub id: String,
    pub target: RequestTarget,
    pub text: String,
    /// AI가 처리를 시작했다(처리 중). 답하면 함께 true.
    #[serde(default)]
    pub taken: bool,
    /// 사람이 답을 봤다고 표시했다(선택).
    #[serde(default)]
    pub acknowledged: bool,
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reply: Option<String>,
}
