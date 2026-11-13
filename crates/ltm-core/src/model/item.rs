use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// 누가 바꿨는가. AI는 CLI·파일, 사람은 GUI.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Actor {
    Ai,
    Me,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Item {
    pub id: String,
    /// 제목: 짧은 한 문장. 사람이 훑어보는 줄이다.
    pub text: String,
    /// 자세히: 풀이·조건. 펼쳐야 보이며 최종 지시서에는 제목 아래에 함께 들어간다.
    #[ts(optional)]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    pub by: Actor,
    /// 사람이 확인했는가. 사람이 쓴 항목은 항상 true.
    pub confirmed: bool,
}
