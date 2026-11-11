use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use ltm_core::{Actor, BriefPatch, BriefSummary, PrefPatch, Preferences, render_markdown};
use serde::Deserialize;
use serde_json::json;

use crate::{FileStore, StoreError};

use super::{error::ApiError, view::WorkspaceView};

#[derive(Deserialize)]
pub(super) struct CreateBody {
    id: String,
    title: String,
}

#[derive(Deserialize)]
pub(super) struct Language {
    lang: Option<String>,
}

pub(super) type ApiResult<T> = Result<Json<T>, ApiError>;

fn workspace(store: &FileStore, brief: ltm_core::Brief, lang: Language) -> Result<WorkspaceView, StoreError> {
    let can_undo = store.can_undo(&brief.id)?;
    let markdown =
        render_markdown(&brief, lang.lang.as_deref().and_then(|s| s.parse().ok()).unwrap_or_default());
    Ok(WorkspaceView { view: brief.into(), can_undo, markdown })
}

pub(super) async fn unknown_api() -> Response {
    (StatusCode::NOT_FOUND, Json(json!({ "error": "unknown API path" }))).into_response()
}

pub(super) async fn list(State(store): State<FileStore>) -> ApiResult<Vec<BriefSummary>> {
    Ok(Json(store.list()?))
}

pub(super) async fn create(
    State(store): State<FileStore>,
    Query(lang): Query<Language>,
    Json(body): Json<CreateBody>,
) -> Result<Response, ApiError> {
    let brief = store.create(&body.id, &body.title)?;
    Ok((StatusCode::CREATED, Json(workspace(&store, brief, lang)?)).into_response())
}

pub(super) async fn duplicate(
    State(store): State<FileStore>,
    Path(from): Path<String>,
    Query(lang): Query<Language>,
    Json(body): Json<CreateBody>,
) -> Result<Response, ApiError> {
    let brief = store.duplicate(&from, &body.id, &body.title, Actor::Me)?;
    Ok((StatusCode::CREATED, Json(workspace(&store, brief, lang)?)).into_response())
}

pub(super) async fn read(
    State(store): State<FileStore>,
    Path(id): Path<String>,
    Query(lang): Query<Language>,
) -> ApiResult<WorkspaceView> {
    let brief = store.get(&id)?;
    Ok(Json(workspace(&store, brief, lang)?))
}

pub(super) async fn patch(
    State(store): State<FileStore>,
    Path(id): Path<String>,
    Query(lang): Query<Language>,
    Json(patch): Json<BriefPatch>,
) -> ApiResult<WorkspaceView> {
    let brief = store.patch(&id, patch, Actor::Me)?;
    Ok(Json(workspace(&store, brief, lang)?))
}

pub(super) async fn undo(
    State(store): State<FileStore>,
    Path(id): Path<String>,
    Query(lang): Query<Language>,
) -> ApiResult<WorkspaceView> {
    let brief = store.undo(&id, Actor::Me)?;
    Ok(Json(workspace(&store, brief, lang)?))
}

pub(super) async fn prefs(State(store): State<FileStore>) -> ApiResult<Preferences> {
    Ok(Json(store.preferences()?))
}

pub(super) async fn patch_prefs(
    State(store): State<FileStore>,
    Json(patch): Json<PrefPatch>,
) -> ApiResult<Preferences> {
    Ok(Json(store.patch_preferences(patch, Actor::Me)?))
}
