mod error;
mod guard;
mod handlers;
mod view;

use axum::{
    Router, middleware,
    routing::{get, post},
};

use crate::{FileStore, assets};

pub use view::WorkspaceView;

/// GUI용 로컬 API + 내장 UI. 바인딩은 호출 측이 127.0.0.1로 제한한다. GUI의 쓰기는 사람(`Actor::Me`)이다.
pub fn router(store: FileStore) -> Router {
    Router::new()
        .route("/api/briefs", get(handlers::list).post(handlers::create))
        .route("/api/briefs/{id}", get(handlers::read).patch(handlers::patch))
        .route("/api/briefs/{id}/undo", post(handlers::undo))
        .route("/api/briefs/{id}/duplicate", post(handlers::duplicate))
        .route("/api/preferences", get(handlers::prefs).patch(handlers::patch_prefs))
        .route("/api/{*rest}", axum::routing::any(handlers::unknown_api))
        .fallback(assets::serve)
        .layer(middleware::from_fn(guard::local_only))
        .with_state(store)
}
