//! 검증: FLOW-002 지시서 다시 쓰기, DATA-001 학습 상태
use ltm_core::{Actor, Brief, BriefPatch, LearningStatus, PrefPatch, Preferences, SectionKey};

fn source() -> Brief {
    let mut b = Brief::new("gallery", "갤러리").unwrap();
    b.apply(
        BriefPatch::AddItem { section: SectionKey::Purpose, text: "훑어보기".into(), detail: None },
        Actor::Me,
    )
    .unwrap();
    b.apply(BriefPatch::MarkAnalyzed, Actor::Ai).unwrap();
    b
}

#[test]
fn derive_keeps_content_and_resets_review_state() {
    let src = source();
    let copy = src.derive("gallery-2", "갤러리 (사본)", Actor::Me).unwrap();
    assert_eq!(copy.items(SectionKey::Purpose)[0].text, "훑어보기");
    assert!(copy.items(SectionKey::Purpose).iter().all(|i| !i.confirmed));
    assert_eq!(copy.derived_from.as_deref(), Some("gallery"));
    assert_eq!((copy.analyzed_revision, copy.changes.len()), (None, 1));
    assert!(src.derive("../x", "t", Actor::Me).is_err());
}

#[test]
fn learning_status_follows_analysis_and_sources() {
    let mut prefs = Preferences::default();
    let mut b = Brief::new("shop", "가게").unwrap();
    assert_eq!(LearningStatus::of(&b, &prefs), LearningStatus::Unanalyzed);

    b.apply(BriefPatch::MarkAnalyzed, Actor::Ai).unwrap();
    assert_eq!(LearningStatus::of(&b, &prefs), LearningStatus::NothingNew);

    prefs
        .apply(
            PrefPatch::Note {
                topic: "t".into(),
                statement: "s".into(),
                evidence: "e".into(),
                brief: Some("shop".into()),
            },
            Actor::Ai,
        )
        .unwrap();
    assert_eq!(LearningStatus::of(&b, &prefs), LearningStatus::Learned { count: 1 });

    b.apply(BriefPatch::SetTitle { value: "가게 2".into() }, Actor::Me).unwrap();
    assert_eq!(LearningStatus::of(&b, &prefs), LearningStatus::Stale { count: 1 });
}
