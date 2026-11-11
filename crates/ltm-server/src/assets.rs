use axum::{
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use rust_embed::Embed;

/// `pnpm --filter @listenee-ltm/ui build` 결과를 바이너리에 포함한다(디버그 빌드는 디스크에서 읽음).
#[derive(Embed)]
#[folder = "../../ui/dist"]
#[allow_missing = true]
struct UiAssets;

/// 정적 파일, 없으면 SPA 진입점.
pub async fn serve(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    match UiAssets::get(path).or_else(|| UiAssets::get("index.html")) {
        Some(file) => {
            let mime = mime_guess::from_path(path).first_or(mime_guess::mime::TEXT_HTML);
            ([(header::CONTENT_TYPE, mime.as_ref())], file.data).into_response()
        }
        None => (StatusCode::NOT_FOUND, "UI not built: run `pnpm build:ui`").into_response(),
    }
}
