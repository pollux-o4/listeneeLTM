use ltm_core::BriefView;
use serde::Serialize;
use ts_rs::TS;

/// GUI 응답: 판정 결과 + 되돌리기 가능 여부.
#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct WorkspaceView {
    #[serde(flatten)]
    #[ts(flatten)]
    pub view: BriefView,
    pub can_undo: bool,
    pub markdown: String,
}
