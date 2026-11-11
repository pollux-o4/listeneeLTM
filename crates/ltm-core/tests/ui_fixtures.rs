//! Storybook용 판정 결과와 Markdown을 생성한다(`<TS_RS_EXPORT_DIR>/fixtures/*.json`).
//! UI 스토리가 코어의 API 결과를 그대로 쓰게 해 판정과 문구 중복을 막는다.
use std::{fs, path::PathBuf};

use ltm_core::{
    Actor, Brief, BriefPatch, BriefView, DecisionOption, NewDecision, PrefPatch, Preferences, SectionKey,
};

const GALLERY_PURPOSE: &str = "작품 200점을 빠르게 훑어보는 개인 갤러리";
const FIXED_TIME: &str = "1970-01-01T00:00:00.000Z";

fn opt(id: &str, label: &str, note: &str, text: &str) -> DecisionOption {
    DecisionOption { id: id.into(), label: label.into(), note: note.into(), text: text.into(), section: None }
}

fn apply(b: &mut Brief, by: Actor, patch: BriefPatch) {
    b.apply(patch, by).unwrap();
}

fn add(b: &mut Brief, by: Actor, section: SectionKey, text: &str) {
    apply(b, by, BriefPatch::AddItem { section, text: text.into() });
}

fn gallery() -> Brief {
    let mut b = Brief::new("gallery", "HTML 갤러리 제작").unwrap();
    add(&mut b, Actor::Ai, SectionKey::Purpose, GALLERY_PURPOSE);
    add(&mut b, Actor::Ai, SectionKey::ScopeIn, "반응형 격자 레이아웃");
    add(&mut b, Actor::Me, SectionKey::ScopeIn, "키보드로 작품 넘기기");
    add(&mut b, Actor::Ai, SectionKey::ScopeOut, "로그인·댓글");
    let ask = |id: &str, section, q: &str, why: &str, options, rec: &str, decide| BriefPatch::Ask {
        decision: NewDecision {
            id: id.into(),
            section,
            question: q.into(),
            why: why.into(),
            options,
            recommended: rec.into(),
            decide: Some(decide),
        },
    };
    apply(
        &mut b,
        Actor::Ai,
        ask(
            "image-host",
            SectionKey::Constraints,
            "이미지를 어디에 둘까요?",
            "프로젝트에 서버 코드가 없어 정적 호스팅이 가장 단순하고 무료예요.",
            vec![
                opt("static", "정적 호스팅", "무료 · 빌드 때 최적화", "이미지는 정적 호스팅, 빌드 시 최적화"),
                opt("cdn", "이미지 CDN", "빠름 · 월 비용", "이미지는 CDN으로 제공"),
            ],
            "static",
            true,
        ),
    );
    apply(
        &mut b,
        Actor::Ai,
        ask(
            "done-bar",
            SectionKey::Acceptance,
            "어느 정도면 \"다 됐다\"고 볼까요?",
            "완료 기준이 없으면 수신자가 언제 멈출지 몰라요. 갤러리는 첫 화면 속도와 접근성이 핵심이에요.",
            vec![
                opt(
                    "measured",
                    "측정 기준",
                    "접근성 95 · 첫 화면 1초",
                    "Lighthouse 접근성 95 이상 · 첫 화면 1초 내 표시",
                ),
                opt("manual", "눈으로 확인", "빠르지만 주관적", "주요 브라우저에서 눈으로 확인"),
            ],
            "measured",
            false,
        ),
    );
    apply(
        &mut b,
        Actor::Ai,
        ask(
            "zoom",
            SectionKey::ScopeIn,
            "확대 보기를 넣을까요?",
            "감상에 자주 쓰이지만 범위가 하루 정도 늘어나요.",
            vec![
                opt("yes", "넣기", "+ 하루", "작품 확대 보기"),
                DecisionOption {
                    section: Some(SectionKey::ScopeOut),
                    ..opt("later", "다음 버전", "제외 범위로", "확대 보기(다음 버전)")
                },
            ],
            "yes",
            false,
        ),
    );
    b
}

#[test]
fn export_ui_fixtures() {
    let Ok(dir) = std::env::var("TS_RS_EXPORT_DIR") else { return };
    let dir = PathBuf::from(dir).join("fixtures");
    fs::create_dir_all(&dir).unwrap();

    let empty = Brief::new("new-brief", "새 지시서").unwrap();
    let working = gallery();
    let mut done = gallery();
    apply(&mut done, Actor::Me, BriefPatch::AcceptRecommended);
    for s in [SectionKey::Purpose, SectionKey::ScopeIn, SectionKey::ScopeOut, SectionKey::Constraints] {
        apply(&mut done, Actor::Me, BriefPatch::ConfirmSection { section: s });
    }

    let mut started = Brief::new("new-brief", "새 지시서").unwrap();
    apply(
        &mut started,
        Actor::Ai,
        BriefPatch::AddItem { section: SectionKey::Purpose, text: GALLERY_PURPOSE.into() },
    );

    // 갈림길은 모두 정했고, 한 단계에 AI가 쓴 확인 전 항목이 여럿 남은 상태(단계 일괄 확인 안내가 보인다).
    let mut review = gallery();
    apply(&mut review, Actor::Me, BriefPatch::AcceptRecommended);
    apply(
        &mut review,
        Actor::Ai,
        BriefPatch::AddItem {
            section: SectionKey::ScopeIn, text: "검색 결과를 최신순으로 정렬한다".into()
        },
    );

    let mut prefs = Preferences::default();
    let note = |topic: &str, statement: &str, evidence: &str| PrefPatch::Note {
        topic: topic.into(),
        statement: statement.into(),
        evidence: evidence.into(),
    };
    for (by, patch) in [
        (
            Actor::Ai,
            note(
                "결정",
                "업계 관행으로 자명한 선택은 묻지 말고 정한 뒤 알린다",
                "기본값을 묻자 \"알아서 정해\"라고 답함",
            ),
        ),
        (
            Actor::Ai,
            note(
                "결정",
                "업계 관행으로 자명한 선택은 묻지 말고 정한 뒤 알린다",
                "구조 선택을 업계 수준으로 맡김",
            ),
        ),
        (
            Actor::Me,
            note("탐색", "어느 단계에서든 되돌아갈 수 있어야 한다", "한 흐름에 갇히는 화면을 문제로 지적"),
        ),
        (
            Actor::Ai,
            note("화면", "부드러운 모션이되 프레임 저하는 없어야 한다", "모션과 60fps 유지를 함께 요구"),
        ),
        (
            Actor::Ai,
            note(
                "화면",
                "결과물은 작업 흐름과 별개로 다시 볼 수 있어야 한다",
                "결과를 갤러리·별도 화면에서 보길 원함",
            ),
        ),
    ] {
        prefs.apply(patch, by).unwrap();
    }
    prefs.apply(PrefPatch::Retire { id: "p5".into() }, Actor::Me).unwrap();
    fs::write(dir.join("preferences.json"), serde_json::to_string_pretty(&prefs).unwrap() + "\n").unwrap();

    for (name, brief) in
        [("empty", empty), ("started", started), ("working", working), ("review", review), ("done", done)]
    {
        let mut view = serde_json::to_value(BriefView::from(brief.clone())).unwrap();
        view["brief"]["updatedAt"] = FIXED_TIME.into();
        for change in view["brief"]["changes"].as_array_mut().unwrap() {
            change["at"] = FIXED_TIME.into();
        }
        let snapshot = serde_json::json!({
            "view": view,
            "markdown": {
                "ko": ltm_core::render_markdown(&brief, ltm_core::Locale::Ko),
                "en": ltm_core::render_markdown(&brief, ltm_core::Locale::En),
            },
        });
        let json = serde_json::to_string_pretty(&snapshot).unwrap();
        fs::write(dir.join(format!("{name}.json")), json + "\n").unwrap();
    }
}
