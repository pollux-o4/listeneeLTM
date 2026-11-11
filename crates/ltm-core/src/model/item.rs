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
    pub text: String,
    pub by: Actor,
    /// 사람이 확인했는가. 사람이 쓴 항목은 항상 true.
    pub confirmed: bool,
}
