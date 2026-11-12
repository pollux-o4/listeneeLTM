//! 검증: DATA-001 (형식·편집 연산·판정·조립)
use ltm_core::{
    Actor, Brief, BriefPatch, BriefView, DecisionOption, IssueKind, NewDecision, PatchError, SectionKey,
    StageStatus,
};

fn opt(id: &str, text: &str) -> DecisionOption {
    DecisionOption { id: id.into(), label: id.into(), note: String::new(), text: text.into(), section: None }
}

fn ask(id: &str, decide: bool) -> BriefPatch {
    BriefPatch::Ask {
        decision: NewDecision {
            id: id.into(),
            section: SectionKey::Constraints,
            question: format!("{id}?"),
            why: "because".into(),
            options: vec![opt("a", "use A"), opt("b", "use B")],
            recommended: "a".into(),
            decide: Some(decide),
        },
    }
}

/// AI가 쓰는 항목은 설명과 기술이 모두 있어야 저장된다.
fn add_ai(section: SectionKey, text: &str) -> BriefPatch {
    BriefPatch::AddItem {
        section, text: text.into(), detail: Some("- 쉬운 풀이\n- [기술 구현 방법]".into())
    }
}

fn add(section: SectionKey, text: &str) -> BriefPatch {
    BriefPatch::AddItem { section, text: text.into(), detail: None }
}

#[test]
fn new_brief_is_blocked_on_required_stages() {
    let view = BriefView::from(Brief::new("demo", "Demo").unwrap());
    let empty: Vec<_> =
        view.stages.iter().filter(|s| s.status == StageStatus::Empty).map(|s| s.section).collect();
    assert_eq!(empty, [SectionKey::Purpose, SectionKey::ScopeIn, SectionKey::Acceptance]);
    assert!(!view.ready);
    assert_eq!(view.current, 0);
}

#[test]
fn ai_items_need_review_but_do_not_block() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    for s in [SectionKey::Purpose, SectionKey::ScopeIn, SectionKey::Acceptance] {
        b.apply(add_ai(s, "x"), Actor::Ai).unwrap();
    }
    let view = BriefView::from(b.clone());
    assert!(view.ready);
    assert_eq!(view.current, 5);
    assert!(view.issues.iter().all(|i| i.kind == IssueKind::Review));

    b.apply(BriefPatch::ConfirmSection { section: SectionKey::Purpose }, Actor::Me).unwrap();
    let purpose = &BriefView::from(b).stages[0];
    assert_eq!(purpose.status, StageStatus::Clear);
}

#[test]
fn open_decision_forks_and_choice_replaces_derived_item() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    b.apply(ask("host", false), Actor::Ai).unwrap();
    assert_eq!(BriefView::from(b.clone()).stages[3].status, StageStatus::Fork);

    b.apply(BriefPatch::Choose { decision: "host".into(), option: "a".into() }, Actor::Me).unwrap();
    b.apply(BriefPatch::Choose { decision: "host".into(), option: "b".into() }, Actor::Me).unwrap();
    let texts: Vec<_> = b.items(SectionKey::Constraints).iter().map(|i| i.text.as_str()).collect();
    assert_eq!(texts, ["use B"], "re-choosing must replace, not append");
}

#[test]
fn ai_can_pre_decide_low_risk_choices_for_review() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    b.apply(ask("host", true), Actor::Ai).unwrap();
    let d = &b.decisions[0];
    assert_eq!((d.chosen.as_deref(), d.chosen_by), (Some("a"), Some(Actor::Ai)));
    assert_eq!(BriefView::from(b).stages[3].status, StageStatus::Review);
}

#[test]
fn accept_recommended_closes_all_forks_in_one_revision() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    b.apply(ask("one", false), Actor::Ai).unwrap();
    b.apply(ask("two", false), Actor::Ai).unwrap();
    let rev = b.revision;
    b.apply(BriefPatch::AcceptRecommended, Actor::Me).unwrap();
    assert_eq!(b.revision, rev + 1);
    assert!(b.decisions.iter().all(|d| d.chosen.is_some()));
}

#[test]
fn failed_patch_changes_nothing() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    let before = b.clone();
    assert_eq!(
        b.apply(BriefPatch::RemoveItem { id: "nope".into() }, Actor::Me),
        Err(PatchError::UnknownItem("nope".into()))
    );
    assert_eq!(b.apply(add(SectionKey::Purpose, "   "), Actor::Me), Err(PatchError::EmptyText));
    assert_eq!(b, before);
}

#[test]
fn changes_record_actor_and_revision() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    b.apply(add_ai(SectionKey::Purpose, "x"), Actor::Ai).unwrap();
    b.apply(BriefPatch::SetTitle { value: "New".into() }, Actor::Me).unwrap();
    assert_eq!(
        b.changes.iter().map(|c| (c.revision, c.by)).collect::<Vec<_>>(),
        [(2, Actor::Me), (1, Actor::Ai)]
    );
}

#[test]
fn markdown_omits_meta_and_lists_open_decisions() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    b.apply(add(SectionKey::Purpose, "ship"), Actor::Me).unwrap();
    b.apply(ask("host", false), Actor::Ai).unwrap();
    let md = ltm_core::render_markdown(&b, ltm_core::Locale::Ko);
    assert_eq!(md, "# Demo\n\n## 목적\n- ship\n\n## 미결\n- host?\n");
}

#[test]
fn rejects_path_like_ids() {
    for id in ["", "Bad", "../x", "a/b"] {
        assert!(Brief::new(id, "x").is_err(), "{id}");
    }
}

#[test]
fn patch_json_wire_format() {
    let p: BriefPatch = serde_json::from_str(r#"{"op":"addItem","section":"scopeIn","text":"a"}"#).unwrap();
    assert_eq!(p, add(SectionKey::ScopeIn, "a"));
    let p: BriefPatch = serde_json::from_str(r#"{"op":"acceptRecommended"}"#).unwrap();
    assert_eq!(p, BriefPatch::AcceptRecommended);
}

#[test]
fn option_can_route_its_text_to_another_section() {
    let mut b = Brief::new("demo", "Demo").unwrap();
    let later = DecisionOption { section: Some(SectionKey::ScopeOut), ..opt("later", "zoom later") };
    b.apply(
        BriefPatch::Ask {
            decision: NewDecision {
                id: "zoom".into(),
                section: SectionKey::ScopeIn,
                question: "zoom?".into(),
                why: String::new(),
                options: vec![opt("yes", "zoom"), later],
                recommended: "yes".into(),
                decide: None,
            },
        },
        Actor::Ai,
    )
    .unwrap();
    b.apply(BriefPatch::Choose { decision: "zoom".into(), option: "later".into() }, Actor::Me).unwrap();
    assert!(b.items(SectionKey::ScopeIn).is_empty());
    assert_eq!(b.items(SectionKey::ScopeOut)[0].text, "zoom later");
}

#[test]
fn sentences_are_single_line_so_markdown_structure_holds() {
    let mut b = Brief::new("demo", "  Demo\ntitle ").unwrap();
    assert_eq!(b.title, "Demo title");
    b.apply(add_ai(SectionKey::ScopeOut, "line one\r\n  ## not a heading\n"), Actor::Ai).unwrap();
    let md = ltm_core::render_markdown(&b, ltm_core::Locale::Ko);
    assert!(md.contains("- line one ## not a heading\n"), "{md}");
    assert_eq!(md.lines().filter(|l| l.starts_with("## ")).count(), 1, "{md}");
}

#[test]
fn rejects_empty_titles_and_malformed_options() {
    assert!(Brief::new("demo", " \n ").is_err());
    let mut b = Brief::new("demo", "Demo").unwrap();
    let ask_with = |options| BriefPatch::Ask {
        decision: NewDecision {
            id: "d".into(),
            section: SectionKey::Constraints,
            question: "q?".into(),
            why: String::new(),
            options,
            recommended: "a".into(),
            decide: None,
        },
    };
    let dup = b.apply(ask_with(vec![opt("a", "A"), opt("a", "B")]), Actor::Ai);
    assert_eq!(dup, Err(PatchError::DuplicateOption("a".into())));
    assert_eq!(b.apply(ask_with(vec![opt("a", "A"), opt("b", "  ")]), Actor::Ai), Err(PatchError::EmptyText));
    assert!(matches!(
        b.apply(ask_with(vec![opt("a", "A"), opt("B/..", "B")]), Actor::Ai),
        Err(PatchError::InvalidId(_))
    ));
    assert_eq!(b.revision, 0);
}

#[test]
fn files_missing_newer_fields_still_load() {
    let old = r#"{"id":"demo","title":"Demo","revision":3,"updatedAt":"2026-01-01T00:00:00.000Z"}"#;
    let b: Brief = serde_json::from_str(old).unwrap();
    let view = BriefView::from(b);
    assert_eq!(view.stages.len(), 5);
    assert!(!view.ready);
}

#[test]
fn blocking_issues_use_empty_stage_codes() {
    let view = BriefView::from(Brief::new("demo", "Demo").unwrap());
    let codes: Vec<_> = view.issues.iter().map(|i| &i.code).collect();
    assert_eq!(codes, vec![&ltm_core::IssueCode::EmptyStage; 3]);
}

#[test]
fn undo_to_restores_content_and_records_the_original_event() {
    let mut brief = Brief::new("demo", "original").unwrap();
    let snapshot = brief.clone();
    brief.apply(BriefPatch::SetTitle { value: "changed".into() }, Actor::Ai).unwrap();
    let updated_at = brief.updated_at.clone();
    brief.undo_to(snapshot, Actor::Me);
    assert_eq!(brief.title, "original");
    assert_eq!(brief.revision, 2);
    assert_eq!(brief.updated_at, updated_at);
    assert_eq!(
        brief.changes[0].event,
        ltm_core::ChangeEvent::Undo {
            undone: Some(Box::new(ltm_core::ChangeEvent::SetTitle { value: "changed".into() }))
        }
    );
    assert_eq!(brief.changes[0].by, Actor::Me);
    assert_eq!(brief.changes[0].at, updated_at);

    brief.undo_to(Brief::new("demo", "empty history").unwrap(), Actor::Ai);
    assert_eq!(brief.changes[0].event, ltm_core::ChangeEvent::Undo { undone: None });
}

#[test]
fn legacy_changes_read_but_only_events_are_written() {
    use ltm_core::{Change, ChangeEvent};
    use serde_json::json;
    let old = json!({"revision": 1, "by": "ai", "at": "now", "summary": "old text"});
    let change: Change = serde_json::from_value(old).unwrap();
    assert_eq!(change.event, ChangeEvent::Legacy { summary: "old text".into() });
    let encoded = serde_json::to_value(&change).unwrap();
    assert!(encoded.get("summary").is_none());
    assert_eq!(encoded["event"], json!({"kind": "legacy", "summary": "old text"}));
    assert_eq!(serde_json::from_value::<Change>(encoded).unwrap(), change);

    let mut brief = Brief::new("demo", "Demo").unwrap();
    brief.apply(add_ai(SectionKey::Purpose, "ship"), Actor::Ai).unwrap();
    brief.apply(ask("host", false), Actor::Ai).unwrap();
    let view = serde_json::to_value(BriefView::from(brief)).unwrap();
    assert!(view.get("markdown").is_none());
    assert!(view["stages"][0].get("label").is_none());
    assert!(view["stages"][0].get("hint").is_none());
    assert!(view["issues"][0].get("message").is_none());
    assert_eq!(view["issues"][0]["code"], json!({"kind": "unconfirmed", "count": 1}));
    assert_eq!(view["issues"][2]["code"], json!({"kind": "openDecision", "question": "host?"}));
    assert_eq!(view["brief"]["changes"][0]["event"], json!({"kind": "ask", "question": "host?"}));
}

#[test]
fn markdown_localizes_only_fixed_text() {
    use ltm_core::{Locale, SECTION_KEYS, render_markdown};
    assert_eq!(Locale::default(), Locale::Ko);
    assert_eq!("en".parse::<Locale>().unwrap(), Locale::En);
    assert_eq!(serde_json::to_string(&Locale::Ko).unwrap(), "\"ko\"");
    assert!("fr".parse::<Locale>().is_err());
    let mut brief = Brief::new("demo", "사용자 제목").unwrap();
    for key in SECTION_KEYS {
        brief.apply(add(key, "사용자 문장"), Actor::Me).unwrap();
    }
    brief.apply(ask("host", false), Actor::Ai).unwrap();
    assert_eq!(
        render_markdown(&brief, Locale::Ko),
        "# 사용자 제목\n\n## 목적\n- 사용자 문장\n\n## 포함 범위\n- 사용자 문장\n\n## 제외 범위\n- 사용자 문장\n\n## 제약\n- 사용자 문장\n\n## 완료 기준\n- 사용자 문장\n\n## 미결\n- host?\n"
    );
    assert_eq!(
        render_markdown(&brief, Locale::En),
        "# 사용자 제목\n\n## Purpose\n- 사용자 문장\n\n## In scope\n- 사용자 문장\n\n## Out of scope\n- 사용자 문장\n\n## Constraints\n- 사용자 문장\n\n## Acceptance criteria\n- 사용자 문장\n\n## Open decisions\n- host?\n"
    );
}

mod style_gate {
    use ltm_core::{Actor, Brief, BriefPatch, PatchError, SectionKey};

    const FULL: &str = "- 쉬운 풀이\n- [기술 구현 방법]";

    #[test]
    fn ai_items_need_title_explanation_and_tech() {
        for (detail, ok) in [
            (None, false),
            (Some("- 풀이만 있어요"), false),
            (Some("- [기술만 있다]"), false),
            (Some(FULL), true),
        ] {
            assert_eq!(add(Actor::Ai, "한 줄로 설치하게 한다", detail).is_ok(), ok, "{detail:?}");
        }
        assert!(add(Actor::Me, "한 줄로 설치하게 한다", None).is_ok());
    }

    fn add(by: Actor, text: &str, detail: Option<&str>) -> Result<(), PatchError> {
        Brief::new("t", "Demo").unwrap().apply(
            BriefPatch::AddItem {
                section: SectionKey::Purpose,
                text: text.into(),
                detail: detail.map(Into::into),
            },
            by,
        )
    }

    #[test]
    fn ai_headline_must_be_short_plain_one_sentence() {
        assert!(add(Actor::Ai, "사람들이 한 줄로 설치할 수 있게 한다.", Some(FULL)).is_ok());
        for bad in [
            "설치 한 줄 → 첫 설정 → AI가 지시서를 만드는 데까지 실제로 되는 것을 확인하고 기록해 둔다 그리고 또 확인한다",
            "`ltm init`으로 시작한다",
            "설치한다(자동으로)",
            "ADR로 남긴다",
            "설치한다. 그리고 확인한다.",
        ] {
            assert!(matches!(add(Actor::Ai, bad, Some(FULL)), Err(PatchError::Style { .. })), "{bad}");
        }
    }

    #[test]
    fn detail_is_allowed_but_gated_and_humans_are_never_blocked() {
        assert!(
            add(
                Actor::Ai,
                "한 줄로 설치하게 한다",
                Some("- 설치 뒤 첫 설정을 해야 AI가 쓸 수 있어요\n- [ltm init으로 안내 파일을 만든다]")
            )
            .is_ok()
        );
        assert!(matches!(
            add(Actor::Ai, "한 줄로 설치하게 한다", Some("CI에서 확인한다")),
            Err(PatchError::Style { .. })
        ));
        assert!(add(Actor::Me, "`ltm init` → ADR (자동)", None).is_ok());
    }

    #[test]
    fn detail_is_a_two_level_list_with_jargon_only_inside_brackets() {
        let ok = "- 설치 뒤 첫 설정을 해야 해요\n  - 처음 한 번만 하면 돼요 [ltm init]\n- [CI에서도 같은 명령을 쓴다]";
        assert!(add(Actor::Ai, "한 줄로 설치하게 한다", Some(ok)).is_ok());
        for bad in [
            "- 설치한다\n  - 더\n    - 너무 깊다",
            "- CI에서 확인한다",
            "- 열린 괄호 [CI",
            "- 겹친 [a [b]]",
            "- 1\n- 2\n- 3\n- 4\n- 5\n- 6\n- 7",
        ] {
            assert!(
                matches!(add(Actor::Ai, "한 줄로 설치하게 한다", Some(bad)), Err(PatchError::Style { .. })),
                "{bad}"
            );
        }
        assert!(add(Actor::Me, "한 줄로 설치하게 한다", Some("- CI\n    - 깊이")).is_ok());
    }

    #[test]
    fn headline_still_rejects_brackets() {
        assert!(matches!(add(Actor::Ai, "설치한다 [CI]", None), Err(PatchError::Style { .. })));
    }
}
