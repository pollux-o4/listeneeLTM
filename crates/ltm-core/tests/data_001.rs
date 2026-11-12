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
            when: None,
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
                when: None,
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
            when: None,
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

/// FLOW-001 자기 리뷰: AI가 쓰고 막힘이 없으면 한 번 리뷰할 때가 되고, 표시하면 다시 오지 않는다.
#[test]
fn self_review_due_once_after_first_draft() {
    let mut b = Brief::new("r", "t").unwrap();
    assert!(!BriefView::from(b.clone()).self_review_due, "빈 지시서는 리뷰할 게 없다");
    for s in [SectionKey::Purpose, SectionKey::ScopeIn, SectionKey::Acceptance] {
        b.apply(add_ai(s, "무엇을 한다"), Actor::Ai).unwrap();
    }
    assert!(BriefView::from(b.clone()).self_review_due);
    b.apply(BriefPatch::MarkReviewed, Actor::Ai).unwrap();
    b.apply(add_ai(SectionKey::ScopeIn, "더 한다"), Actor::Ai).unwrap();
    assert!(!BriefView::from(b).self_review_due, "리뷰는 첫 작성 뒤 한 번만");
}

fn egg(id: &str, options: [(&str, &str); 2], when: Option<(&str, &str)>) -> BriefPatch {
    BriefPatch::Ask {
        decision: NewDecision {
            id: id.into(),
            section: SectionKey::ScopeIn,
            question: format!("{id}?"),
            why: String::new(),
            options: options.iter().map(|(o, t)| opt(o, t)).collect(),
            recommended: options[0].0.into(),
            decide: None,
            when: when.map(|(d, o)| ltm_core::DecisionWhen { decision: d.into(), options: vec![o.into()] }),
        },
    }
}

/// DATA-001 갈림길 의존: 조건이 맞을 때만 살아 있고, 잠들면 막힘·항목에서 빠지고, 살아나면 선택이 돌아온다.
#[test]
fn dependent_decision_sleeps_and_wakes_with_its_condition() {
    let mut b = Brief::new("egg", "달걀").unwrap();
    b.apply(egg("use", [("fry", "후라이를 한다"), ("ramen", "라면에 넣는다")], None), Actor::Ai).unwrap();
    b.apply(
        egg("noodle", [("spicy", "매운 라면"), ("mild", "순한 라면")], Some(("use", "ramen"))),
        Actor::Ai,
    )
    .unwrap();
    let v = BriefView::from(b.clone());
    assert_eq!(v.dormant, vec!["noodle".to_string()]);
    assert_eq!(v.stages[1].open_decisions, 1, "잠든 갈림길은 막힘으로 세지 않는다");
    assert_eq!(
        b.clone().apply(BriefPatch::Choose { decision: "noodle".into(), option: "spicy".into() }, Actor::Me),
        Err(PatchError::DormantDecision("noodle".into()))
    );

    let choose = |b: &mut Brief, d: &str, o: &str| {
        b.apply(BriefPatch::Choose { decision: d.into(), option: o.into() }, Actor::Me).unwrap()
    };
    let texts = |b: &Brief| b.items(SectionKey::ScopeIn).iter().map(|i| i.text.clone()).collect::<Vec<_>>();
    choose(&mut b, "use", "ramen");
    choose(&mut b, "noodle", "spicy");
    assert_eq!(texts(&b), ["라면에 넣는다", "매운 라면"]);
    choose(&mut b, "use", "fry");
    assert_eq!(texts(&b), ["후라이를 한다"], "잠들면 그 선택의 문장이 빠진다");
    assert!(
        BriefView::from(b.clone()).stages.iter().all(|s| s.status != StageStatus::Fork),
        "잠든 갈림길은 막지 않는다"
    );
    assert!(!ltm_core::render_markdown(&b, ltm_core::Locale::Ko).contains("noodle?"));
    choose(&mut b, "use", "ramen");
    assert_eq!(texts(&b), ["라면에 넣는다", "매운 라면"], "다시 살아나면 이전 선택이 돌아온다");
}

#[test]
fn condition_must_point_to_existing_choice_and_accept_wakes_in_order() {
    let mut b = Brief::new("c", "t").unwrap();
    assert_eq!(
        b.apply(egg("x", [("a", "에이"), ("b", "비")], Some(("missing", "a"))), Actor::Ai),
        Err(PatchError::InvalidCondition)
    );
    b.apply(egg("use", [("ramen", "라면"), ("fry", "후라이")], None), Actor::Ai).unwrap();
    assert_eq!(
        b.apply(egg("x", [("a", "에이"), ("b", "비")], Some(("use", "nope"))), Actor::Ai),
        Err(PatchError::InvalidCondition)
    );
    b.apply(egg("noodle", [("spicy", "매운"), ("mild", "순한")], Some(("use", "ramen"))), Actor::Ai).unwrap();
    b.apply(BriefPatch::AcceptRecommended, Actor::Me).unwrap();
    assert!(b.decisions.iter().all(|d| d.chosen.is_some()), "추천으로 살아난 갈림길도 이어서 정한다");
}

/// UX-001 갈림길 의존: 다른 갈림길을 잠그거나 여는 선택지는 고르기 전에 그 영향이 보인다.
#[test]
fn impacts_preview_what_a_choice_sleeps_or_wakes() {
    let mut b = Brief::new("egg", "달걀").unwrap();
    b.apply(egg("use", [("fry", "후라이를 한다"), ("ramen", "라면에 넣는다")], None), Actor::Ai).unwrap();
    b.apply(
        egg("noodle", [("spicy", "매운 라면"), ("mild", "순한 라면")], Some(("use", "ramen"))),
        Actor::Ai,
    )
    .unwrap();
    let pairs = |b: &Brief| {
        BriefView::from(b.clone())
            .impacts
            .into_iter()
            .map(|i| (i.option, i.sleeps, i.wakes))
            .collect::<Vec<_>>()
    };
    let noodle = vec!["noodle".to_string()];
    assert_eq!(pairs(&b), [("ramen".into(), vec![], noodle.clone())], "후라이는 아무것도 바꾸지 않는다");
    b.apply(BriefPatch::Choose { decision: "use".into(), option: "ramen".into() }, Actor::Me).unwrap();
    assert_eq!(pairs(&b), [("fry".into(), noodle, vec![])], "지금 고른 선택지는 넣지 않는다");
}

/// DATA-001 요청: 있는 자리에만 남고, AI가 답하면 처리되며, 대상이 사라져도 남고, 지울 수 있다.
#[test]
fn requests_round_trip_between_person_and_ai() {
    use ltm_core::RequestTarget;
    let mut b = Brief::new("q", "t").unwrap();
    b.apply(add_ai(SectionKey::ScopeIn, "모든 운영체제에 설치한다"), Actor::Ai).unwrap();
    let item = b.items(SectionKey::ScopeIn)[0].id.clone();
    let ask = |id: &str| BriefPatch::Request {
        target: RequestTarget::Item { id: id.into() },
        text: "왜 셋 다예요?".into(),
    };
    assert_eq!(b.apply(ask("nope"), Actor::Me), Err(PatchError::UnknownItem("nope".into())));
    b.apply(ask(&item), Actor::Me).unwrap();
    let id = b.requests[0].id.clone();
    b.apply(BriefPatch::TakeRequests, Actor::Ai).unwrap();
    assert!(b.requests[0].taken, "맡으면 처리 중");
    assert_eq!(
        b.clone().apply(BriefPatch::TakeRequests, Actor::Ai),
        Err(PatchError::NoOp),
        "맡을 것이 없으면 바뀌지 않는다"
    );
    b.apply(BriefPatch::RemoveItem { id: item }, Actor::Ai).unwrap();
    b.apply(
        BriefPatch::ResolveRequest {
            id: id.clone(), reply: "윈도우 사용자가 많아서 넣었어요".into()
        },
        Actor::Ai,
    )
    .unwrap();
    assert_eq!(
        b.requests[0].reply.as_deref(),
        Some("윈도우 사용자가 많아서 넣었어요"),
        "대상이 사라져도 답은 남는다"
    );
    b.apply(BriefPatch::AcknowledgeRequest { id: id.clone() }, Actor::Me).unwrap();
    assert!(b.requests[0].acknowledged);
    assert_eq!(
        b.clone().apply(BriefPatch::AcknowledgeRequest { id: id.clone() }, Actor::Me),
        Err(PatchError::NoOp)
    );
    b.apply(BriefPatch::RemoveRequest { id }, Actor::Me).unwrap();
    assert!(b.requests.is_empty());
}
