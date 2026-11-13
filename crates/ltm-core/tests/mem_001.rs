//! 검증: MEM-001 취향 노트
use ltm_core::{Actor, PrefError, PrefPatch, Preferences};

fn note(statement: &str, evidence: &str) -> PrefPatch {
    PrefPatch::Note {
        topic: "결정".into(),
        statement: statement.into(),
        evidence: evidence.into(),
        brief: None,
    }
}

#[test]
fn ai_notes_are_unconfirmed_and_repeats_reinforce() {
    let mut p = Preferences::default();
    p.apply(note("자명한 선택은 정한 뒤 알린다", "해상도 기본값을 묻자 알아서 하라고 함"), Actor::Ai)
        .unwrap();
    p.apply(note("자명한 선택은 정한 뒤 알린다", "구조 질문에 업계 관행대로 하라고 함"), Actor::Ai).unwrap();
    assert_eq!(p.items.len(), 1);
    assert_eq!(p.items[0].evidence.len(), 2);
    assert!(!p.items[0].confirmed);

    p.apply(PrefPatch::Confirm { id: p.items[0].id.clone() }, Actor::Me).unwrap();
    assert!(p.items[0].confirmed);
}

#[test]
fn retired_items_are_kept_but_hidden_from_ai_summary() {
    let mut p = Preferences::default();
    p.apply(note("A", "e"), Actor::Me).unwrap();
    p.apply(note("B", "e"), Actor::Ai).unwrap();
    let a = p.items[0].id.clone();
    p.apply(PrefPatch::Retire { id: a.clone() }, Actor::Me).unwrap();
    let md = p.render_markdown(ltm_core::Locale::Ko);
    assert!(!md.contains("- A") && md.contains("- B (확인 전) · 근거 1"), "{md}");
    assert_eq!(p.items.len(), 2);

    p.apply(PrefPatch::Restore { id: a }, Actor::Me).unwrap();
    assert!(p.render_markdown(ltm_core::Locale::Ko).contains("- A · 근거 1"));
}

#[test]
fn evidence_is_bounded_and_deduplicated() {
    let mut p = Preferences::default();
    for i in 0..12 {
        p.apply(note("A", &format!("e{i}")), Actor::Ai).unwrap();
    }
    p.apply(note("A", "e11"), Actor::Ai).unwrap();
    assert_eq!(p.items[0].evidence.len(), 8);
    assert_eq!(p.items[0].evidence.last().unwrap(), "e11");
}

#[test]
fn invalid_patches_change_nothing() {
    let mut p = Preferences::default();
    assert_eq!(p.apply(note(" ", "e"), Actor::Ai), Err(PrefError::EmptyText));
    assert_eq!(
        p.apply(PrefPatch::Confirm { id: "x".into() }, Actor::Me),
        Err(PrefError::NotFound("x".into()))
    );
    assert_eq!(p, Preferences::default());
}

#[test]
fn only_a_person_brings_back_a_retired_note() {
    let mut p = Preferences::default();
    p.apply(note("A", "first"), Actor::Ai).unwrap();
    let id = p.items[0].id.clone();
    p.apply(PrefPatch::Retire { id }, Actor::Me).unwrap();

    p.apply(note("A", "seen again"), Actor::Ai).unwrap();
    assert!(p.items[0].retired, "AI의 재관찰은 근거만 쌓고 내려놓은 결정을 뒤집지 않는다");
    assert_eq!(p.items[0].evidence.len(), 2);

    p.apply(note("A", "직접 적음"), Actor::Me).unwrap();
    assert!(!p.items[0].retired);
}

#[test]
fn sentences_fold_newlines_before_matching_and_storing() {
    let mut prefs = Preferences::default();
    prefs
        .apply(
            PrefPatch::Note {
                topic: " 판단\r\n 기준 ".into(),
                statement: " 먼저\n 확인 ".into(),
                evidence: " 반복\r 요청 ".into(),
                brief: None,
            },
            Actor::Ai,
        )
        .unwrap();
    prefs
        .apply(
            PrefPatch::Note {
                topic: "판단 기준".into(),
                statement: "먼저 확인".into(),
                evidence: "반복 요청".into(),
                brief: None,
            },
            Actor::Ai,
        )
        .unwrap();
    assert_eq!(prefs.items.len(), 1);
    assert_eq!(prefs.items[0].topic, "판단 기준");
    assert_eq!(prefs.items[0].statement, "먼저 확인");
    assert_eq!(prefs.items[0].evidence, ["반복 요청"]);
    let id = prefs.items[0].id.clone();
    prefs.apply(PrefPatch::Edit { id: id.clone(), statement: " 나중\r\n 확인 ".into() }, Actor::Me).unwrap();
    prefs
        .apply(PrefPatch::Reinforce { id, evidence: " 추가\n 근거 ".into(), brief: None }, Actor::Ai)
        .unwrap();
    assert_eq!(prefs.items[0].statement, "나중 확인");
    assert_eq!(prefs.items[0].evidence[1], "추가 근거");
    let before = prefs.clone();
    assert_eq!(prefs.apply(note("\r\n ", "e"), Actor::Ai), Err(PrefError::EmptyText));
    assert_eq!(prefs, before);
}

#[test]
fn preference_markdown_locales_preserve_user_text() {
    use ltm_core::Locale;
    let mut prefs = Preferences::default();
    assert_eq!(prefs.render_markdown(Locale::Ko), "# 취향 노트\n\n(비어 있음)\n");
    assert_eq!(prefs.render_markdown(Locale::En), "# Preference notes\n\n(No entries)\n");
    prefs
        .apply(
            PrefPatch::Note {
                topic: "주제".into(),
                statement: "문장".into(),
                evidence: "근거".into(),
                brief: None,
            },
            Actor::Ai,
        )
        .unwrap();
    assert_eq!(prefs.changes[0].event, ltm_core::ChangeEvent::NoteAdded { statement: "문장".into() });
    assert_eq!(prefs.render_markdown(Locale::Ko), "# 취향 노트\n\n## 주제\n- 문장 (확인 전) · 근거 1\n");
    assert_eq!(
        prefs.render_markdown(Locale::En),
        "# Preference notes\n\n## 주제\n- 문장 (unconfirmed) · Evidence: 1\n"
    );
}

fn note_in(topic: &str, statement: &str, brief: &str) -> PrefPatch {
    PrefPatch::Note {
        topic: topic.into(),
        statement: statement.into(),
        evidence: "e".into(),
        brief: Some(brief.into()),
    }
}

#[test]
fn sources_record_which_briefs_taught_a_preference() {
    let mut p = Preferences::default();
    p.apply(note_in("결정", "A", "gallery"), Actor::Ai).unwrap();
    p.apply(note_in("결정", "A", "shop"), Actor::Ai).unwrap();
    p.apply(note_in("결정", "A", "gallery"), Actor::Ai).unwrap();
    assert_eq!(p.items[0].sources, ["shop", "gallery"]);
    let bad = PrefPatch::Note {
        topic: "t".into(),
        statement: "s".into(),
        evidence: "e".into(),
        brief: Some("../x".into()),
    };
    assert!(matches!(p.apply(bad, Actor::Ai), Err(PrefError::InvalidBrief(_))));
}

#[test]
fn principles_group_two_levels_within_a_topic() {
    let mut p = Preferences::default();
    for s in ["A", "B", "C"] {
        p.apply(note_in("결정", s, "gallery"), Actor::Ai).unwrap();
    }
    p.apply(note_in("화면", "D", "gallery"), Actor::Ai).unwrap();
    let ids: Vec<String> = p.items.iter().map(|i| i.id.clone()).collect();
    let group = |members: &[&String]| PrefPatch::Group {
        statement: "자명한 것은 정한다".into(),
        members: members.iter().map(|s| (*s).clone()).collect(),
    };

    assert!(matches!(p.apply(group(&[&ids[0]]), Actor::Ai), Err(PrefError::InvalidGroup(_))));
    assert!(matches!(p.apply(group(&[&ids[0], &ids[3]]), Actor::Ai), Err(PrefError::InvalidGroup(_))));

    p.apply(group(&[&ids[0], &ids[1]]), Actor::Ai).unwrap();
    let principle = p.items.last().unwrap().clone();
    assert!(!principle.confirmed && principle.topic == "결정");
    assert_eq!(p.items.iter().filter(|i| i.parent.as_ref() == Some(&principle.id)).count(), 2);
    // 2단 고정: 하위 기준이나 원칙은 다시 묶을 수 없다.
    assert!(matches!(p.apply(group(&[&ids[0], &ids[2]]), Actor::Ai), Err(PrefError::InvalidGroup(_))));
    assert!(matches!(p.apply(group(&[&principle.id, &ids[2]]), Actor::Ai), Err(PrefError::InvalidGroup(_))));

    let md = p.render_markdown(ltm_core::Locale::Ko);
    assert!(md.contains("- 자명한 것은 정한다 (확인 전) · 근거 2\n  - A"), "{md}");

    p.apply(PrefPatch::Ungroup { id: principle.id.clone() }, Actor::Me).unwrap();
    assert!(p.items.iter().all(|i| i.parent.is_none()));
    assert!(p.items.iter().find(|i| i.id == principle.id).unwrap().retired);
}
