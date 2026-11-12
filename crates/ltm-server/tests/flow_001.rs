//! 검증: FLOW-001 단계 4~5 — AI(CLI 쪽 저장소)와 GUI(API)가 같은 지시서를 편집하고 되돌린다.
use axum::{
    body::{Body, to_bytes},
    http::Request,
};
use ltm_core::{Actor, BriefPatch, SectionKey};
use ltm_server::{FileStore, http};
use serde_json::{Value, json};
use tower::ServiceExt;

/// 라우터에 요청 하나를 보내 (상태 코드, JSON 본문)을 돌려준다.
async fn call(app: &axum::Router, method: &str, uri: &str, body: Option<Value>) -> (u16, Value) {
    let req = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .body(body.map_or_else(Body::empty, |b| Body::from(b.to_string())))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let status = res.status().as_u16();
    let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
}

#[tokio::test]
async fn ai_and_gui_edit_the_same_brief_with_attribution() {
    let root = tempfile::tempdir().unwrap();
    let ai = FileStore::new(root.path());
    ai.create("demo", "Demo").unwrap();
    ai.patch(
        "demo",
        BriefPatch::AddItem {
            section: SectionKey::Purpose,
            text: "ship".into(),
            detail: Some("- 쉬운 풀이\n- [기술 구현 방법]".into()),
        },
        Actor::Ai,
    )
    .unwrap();

    let app = http::router(FileStore::new(root.path()));
    let (status, view) = call(&app, "GET", "/api/briefs/demo", None).await;
    assert_eq!(status, 200);
    assert_eq!(view["brief"]["sections"]["purpose"][0]["by"], "ai");
    assert_eq!(view["stages"][0]["status"], "review");
    assert_eq!(view["canUndo"], true);

    let (status, view) =
        call(&app, "PATCH", "/api/briefs/demo", Some(json!({"op": "setTitle", "value": "From GUI"}))).await;
    assert_eq!(status, 200);
    assert_eq!(view["brief"]["changes"][0]["by"], "me");
    assert_eq!(ai.get("demo").unwrap().title, "From GUI");
}

#[tokio::test]
async fn undo_restores_previous_state_and_bumps_revision() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("demo", "Demo").unwrap();
    store.patch("demo", BriefPatch::SetTitle { value: "Changed".into() }, Actor::Me).unwrap();
    let app = http::router(store.clone());

    let (status, view) = call(&app, "POST", "/api/briefs/demo/undo", None).await;
    assert_eq!(status, 200);
    assert_eq!(view["brief"]["title"], "Demo");
    assert_eq!(view["brief"]["revision"], 2);
    assert_eq!(view["canUndo"], false);
    assert_eq!(call(&app, "POST", "/api/briefs/demo/undo", None).await.0, 409);
}

#[tokio::test]
async fn api_maps_errors_to_status() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("demo", "Demo").unwrap();
    let app = http::router(store);
    assert_eq!(call(&app, "GET", "/api/briefs/missing", None).await.0, 404);
    assert_eq!(call(&app, "GET", "/api/briefs/Bad..Id", None).await.0, 400);
    let bad = json!({"op": "removeItem", "id": "nope"});
    assert_eq!(call(&app, "PATCH", "/api/briefs/demo", Some(bad)).await.0, 400);
}

#[tokio::test]
async fn preferences_are_shared_between_ai_and_gui() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    let note = ltm_core::PrefPatch::Note {
        topic: "결정".into(),
        statement: "S".into(),
        evidence: "E".into(),
        brief: None,
    };
    store.patch_preferences(note, Actor::Ai).unwrap();
    let app = http::router(store.clone());

    let (status, prefs) = call(&app, "GET", "/api/preferences", None).await;
    assert_eq!((status, prefs["items"][0]["confirmed"].clone()), (200, json!(false)));
    let (status, prefs) =
        call(&app, "PATCH", "/api/preferences", Some(json!({"op": "confirm", "id": "p1"}))).await;
    assert_eq!((status, prefs["items"][0]["confirmed"].clone()), (200, json!(true)));
    assert_eq!(
        call(&app, "PATCH", "/api/preferences", Some(json!({"op": "confirm", "id": "p1"}))).await.0,
        409
    );
}

#[test]
fn consecutive_undos_name_the_change_they_revert() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("demo", "Demo").unwrap();
    store.patch("demo", BriefPatch::SetTitle { value: "A".into() }, Actor::Me).unwrap();
    store.patch("demo", BriefPatch::SetTitle { value: "B".into() }, Actor::Me).unwrap();
    store.undo("demo", Actor::Me).unwrap();
    let b = store.undo("demo", Actor::Me).unwrap();
    assert_eq!(b.title, "Demo");
    assert_eq!(
        b.changes[0].event,
        ltm_core::ChangeEvent::Undo {
            undone: Some(Box::new(ltm_core::ChangeEvent::SetTitle { value: "A".into() }))
        }
    );
}

/// 동시 편집: 여러 작성자가 거의 동시에 써도 어느 쪽의 변경도 사라지지 않는다.
#[test]
fn concurrent_writers_do_not_lose_each_others_changes() {
    let root = tempfile::tempdir().unwrap();
    FileStore::new(root.path()).create("demo", "Demo").unwrap();
    let writers: Vec<_> = (0..16)
        .map(|n| {
            // 프로세스가 다른 것처럼 저장소 인스턴스를 따로 만든다.
            let store = FileStore::new(root.path());
            let by = if n % 2 == 0 { Actor::Ai } else { Actor::Me };
            std::thread::spawn(move || {
                let patch = BriefPatch::AddItem {
                    section: SectionKey::Constraints,
                    text: format!("w{n}"),
                    detail: (by == Actor::Ai).then(|| "- 쉬운 풀이\n- [기술 구현 방법]".to_owned()),
                };
                store.patch("demo", patch, by).unwrap();
            })
        })
        .collect();
    writers.into_iter().for_each(|w| w.join().unwrap());

    let brief = FileStore::new(root.path()).get("demo").unwrap();
    assert_eq!(brief.items(SectionKey::Constraints).len(), 16);
    assert_eq!(brief.revision, 16);
}

/// 장애: 읽을 수 없는 파일 하나가 다른 지시서를 가리지 않고, 원인은 경로와 함께 알린다.
#[test]
fn one_unreadable_file_does_not_hide_the_others() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("good", "Good").unwrap();
    let briefs = root.path().join(".ltm/briefs");
    std::fs::write(briefs.join("broken.json"), "{not json").unwrap();
    std::fs::write(briefs.join("Bad Name.json"), "{}").unwrap();

    let ids: Vec<String> = store.list().unwrap().into_iter().map(|b| b.id).collect();
    assert_eq!(ids, ["good"]);
    let err = store.get("broken").unwrap_err().to_string();
    assert!(err.contains("broken.json"), "{err}");
    assert_eq!(std::fs::read_to_string(briefs.join("broken.json")).unwrap(), "{not json");
}

/// 보안: 다른 웹사이트가 사용자의 브라우저를 통해 로컬 서버를 읽거나 바꾸지 못한다.
#[tokio::test]
async fn only_local_pages_reach_the_api() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("demo", "Demo").unwrap();
    store.patch("demo", BriefPatch::SetTitle { value: "Changed".into() }, Actor::Ai).unwrap();
    let app = http::router(store.clone());
    let send = |method: &'static str, uri: &'static str, headers: &'static [(&'static str, &'static str)]| {
        let app = app.clone();
        async move {
            let mut req = Request::builder().method(method).uri(uri);
            for (k, v) in headers {
                req = req.header(*k, *v);
            }
            app.oneshot(req.body(Body::empty()).unwrap()).await.unwrap().status().as_u16()
        }
    };
    let undo = "/api/briefs/demo/undo";
    assert_eq!(
        send("POST", undo, &[("host", "127.0.0.1:4318"), ("origin", "https://evil.example")]).await,
        403
    );
    assert_eq!(send("GET", "/api/briefs", &[("host", "evil.example:4318")]).await, 403);
    assert_eq!(store.get("demo").unwrap().title, "Changed");

    assert_eq!(send("GET", "/api/briefs", &[("host", "localhost:4318")]).await, 200);
    assert_eq!(
        send("POST", undo, &[("host", "127.0.0.1:4318"), ("origin", "http://127.0.0.1:4318")]).await,
        200
    );
    assert_eq!(send("GET", "/api/nope", &[]).await, 404);
}

#[test]
fn undo_keeps_change_log_bounded() {
    let dir = tempfile::tempdir().unwrap();
    let store = FileStore::new(dir.path());
    store.create("demo", "Demo").unwrap();
    for revision in 1..=52 {
        store.patch("demo", BriefPatch::SetTitle { value: format!("title {revision}") }, Actor::Ai).unwrap();
    }
    for revision in 53..=102 {
        let brief = store.undo("demo", Actor::Me).unwrap();
        assert_eq!(brief.revision, revision);
        assert!(brief.changes.len() <= 50);
        assert_eq!(brief.changes[0].revision, revision);
    }
    assert!(!store.can_undo("demo").unwrap());
}

#[tokio::test]
async fn workspace_markdown_uses_request_language_for_every_endpoint() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    let app = http::router(store);
    let (status, created) =
        call(&app, "POST", "/api/briefs?lang=en", Some(json!({"id":"demo", "title":"Demo"}))).await;
    assert_eq!(status, 201);
    assert_eq!(created["markdown"], "# Demo\n");
    let patch = json!({"op":"addItem", "section":"purpose", "text":"ship"});
    let (status, changed) = call(&app, "PATCH", "/api/briefs/demo?lang=en", Some(patch)).await;
    assert_eq!(status, 200);
    assert_eq!(changed["markdown"], "# Demo\n\n## Purpose\n- ship\n");
    for query in ["", "?lang=ko", "?lang=unknown"] {
        let (status, read) = call(&app, "GET", &format!("/api/briefs/demo{query}"), None).await;
        assert_eq!(status, 200);
        assert_eq!(read["markdown"], "# Demo\n\n## 목적\n- ship\n");
    }
    call(&app, "PATCH", "/api/briefs/demo", Some(json!({"op":"setTitle","value":"Changed"}))).await;
    let (status, undone) = call(&app, "POST", "/api/briefs/demo/undo?lang=en", None).await;
    assert_eq!(status, 200);
    assert_eq!(undone["markdown"], "# Demo\n\n## Purpose\n- ship\n");
    let (_, read) = call(&app, "GET", "/api/briefs/demo?lang=en", None).await;
    assert_eq!(read["markdown"], undone["markdown"]);
}

/// FLOW-002·DATA-001: GUI 복제와 목록의 학습 상태.
#[tokio::test]
async fn gui_duplicates_a_brief_and_list_shows_learning() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("demo", "Demo").unwrap();
    store.patch("demo", BriefPatch::MarkAnalyzed, Actor::Ai).unwrap();
    let app = http::router(store.clone());

    let body = json!({"id": "demo-2", "title": "Demo (copy)"});
    let (status, view) = call(&app, "POST", "/api/briefs/demo/duplicate", Some(body.clone())).await;
    assert_eq!(status, 201);
    assert_eq!(view["brief"]["derivedFrom"], "demo");
    assert_eq!(call(&app, "POST", "/api/briefs/demo/duplicate", Some(body)).await.0, 409);
    let missing = json!({"id": "x-2", "title": "X"});
    assert_eq!(call(&app, "POST", "/api/briefs/x/duplicate", Some(missing)).await.0, 404);

    let (_, list) = call(&app, "GET", "/api/briefs", None).await;
    assert_eq!(list[0]["learning"]["kind"], "nothingNew");
    assert_eq!(list[1]["learning"]["kind"], "unanalyzed");
    assert_eq!(list[1]["derivedFrom"], "demo");
}
