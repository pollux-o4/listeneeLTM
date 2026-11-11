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
    Actor, Brief, BriefError, Change, ChangeEvent, Decision, DecisionOption, Item, SECTION_KEYS, SectionKey,
    validate_id,
};
pub use prefs::{PrefError, PrefPatch, Preference, Preferences};
pub use render::render_markdown;
pub use view::{
    BriefSummary, BriefView, Issue, IssueCode, IssueKind, LearningStatus, StageStatus, StageView,
};

pub use locale::Locale;
