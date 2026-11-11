use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use ltm_core::{PatchError, PrefError};
use serde_json::json;

use crate::StoreError;

pub(super) struct ApiError(StoreError);

impl From<StoreError> for ApiError {
    fn from(error: StoreError) -> Self {
        Self(error)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match &self.0 {
            StoreError::NotFound(_) | StoreError::Pref(PrefError::NotFound(_)) => StatusCode::NOT_FOUND,
            StoreError::Exists(_)
            | StoreError::NothingToUndo
            | StoreError::Patch(PatchError::NoOp)
            | StoreError::Pref(PrefError::NoOp) => StatusCode::CONFLICT,
            StoreError::Invalid(_) | StoreError::Patch(_) | StoreError::Pref(_) => StatusCode::BAD_REQUEST,
            StoreError::Io(_) | StoreError::Corrupt { .. } | StoreError::Encode(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        };
        (status, Json(json!({ "error": self.0.to_string() }))).into_response()
    }
}
