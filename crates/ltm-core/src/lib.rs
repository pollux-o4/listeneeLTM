//! 도메인: 과업지시서(모델·편집·판정·조립)와 취향 노트. I/O 없음.
//! 판정과 조립은 여기만 원본이다. GUI·CLI는 `BriefView`를 그대로 보여준다.
//! TS 바인딩은 `cargo test` 시 `ui/src/generated`로 생성된다 (TS_RS_EXPORT_DIR).

mod edit;
mod locale;
mod model;
mod prefs;
mod render;
mod view;

pub use edit::{BriefPatch, NewDecision, PatchError};
pub use model::{
    Actor, Brief, BriefError, Change, ChangeEvent, Decision, DecisionOption, DecisionWhen, Item, Request,
    RequestTarget, SECTION_KEYS, SectionKey, validate_id,
};
pub use prefs::{PrefError, PrefPatch, Preference, Preferences};
pub use render::render_markdown;
pub use view::{
    BriefSummary, BriefView, Issue, IssueCode, IssueKind, LearningStatus, OptionImpact, StageStatus,
    StageView,
};

pub use locale::Locale;

/// AI가 `ltm set`·`ltm pref set`에 보낼 편집 연산의 JSON Schema. 원본은 위 타입이라 안내와 실제가 어긋나지 않는다.
pub fn patch_schemas() -> [(&'static str, schemars::Schema); 2] {
    [("brief", schemars::schema_for!(BriefPatch)), ("pref", schemars::schema_for!(PrefPatch))]
}
