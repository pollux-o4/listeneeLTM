use serde::{Deserialize, Serialize};
use ts_rs::TS;

// 계약: DATA-001
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum SectionKey {
    Purpose,
    ScopeIn,
    ScopeOut,
    Constraints,
    Acceptance,
}

/// 길(단계) 순서의 원본.
pub const SECTION_KEYS: [SectionKey; 5] = [
    SectionKey::Purpose,
    SectionKey::ScopeIn,
    SectionKey::ScopeOut,
    SectionKey::Constraints,
    SectionKey::Acceptance,
];

impl SectionKey {
    pub fn required(self) -> bool {
        matches!(self, Self::Purpose | Self::ScopeIn | Self::Acceptance)
    }
}
