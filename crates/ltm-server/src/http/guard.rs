use axum::{
    Json,
    extract::Request,
    http::{Method, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde_json::json;

fn is_loopback(authority: &str) -> bool {
    let host = authority
        .rsplit_once(':')
        .map_or(authority, |(h, port)| if port.bytes().all(|b| b.is_ascii_digit()) { h } else { authority });
    matches!(host, "127.0.0.1" | "localhost" | "[::1]")
}

/// 이 서버는 사용자 본인의 브라우저 탭만 상대한다. 다른 웹사이트가 사용자의 브라우저를 통해
/// 지시서를 읽거나(DNS 리바인딩) 바꾸는(교차 출처 요청) 것을 막는다.
/// - Host는 루프백 이름이어야 한다.
/// - 쓰기 요청의 Origin은 없거나(CLI·도구) 같은 HTTP 출처여야 한다.
pub(super) async fn local_only(req: Request, next: Next) -> Response {
    let allowed = {
        let header_str = |name| req.headers().get(name).and_then(|v| v.to_str().ok());
        let host = header_str(header::HOST);
        let host_ok = host.is_none_or(is_loopback);
        let origin_ok = req.method() == Method::GET
            || header_str(header::ORIGIN).is_none_or(|origin| {
                origin.strip_prefix("http://").is_some_and(|authority| {
                    is_loopback(authority) && host.is_some_and(|host| host.eq_ignore_ascii_case(authority))
                })
            });
        host_ok && origin_ok
    };
    if allowed {
        next.run(req).await
    } else {
        (StatusCode::FORBIDDEN, Json(json!({ "error": "local requests only" }))).into_response()
    }
}

#[cfg(test)]
mod tests {
    use axum::{
        Router,
        body::Body,
        http::{Request, StatusCode},
        middleware,
        routing::any,
    };
    use tower::ServiceExt;

    use super::local_only;

    async fn status(method: &str, headers: &[(&str, &str)]) -> StatusCode {
        let app = Router::new()
            .route("/", any(|| async { StatusCode::NO_CONTENT }))
            .layer(middleware::from_fn(local_only));
        let mut request = Request::builder().method(method).uri("/");
        for (name, value) in headers {
            request = request.header(*name, *value);
        }
        app.oneshot(request.body(Body::empty()).unwrap()).await.unwrap().status()
    }

    #[tokio::test]
    async fn allows_loopback_host() {
        assert_eq!(status("POST", &[("host", "127.0.0.1:4318")]).await, StatusCode::NO_CONTENT);
    }

    #[tokio::test]
    async fn rejects_malicious_origin() {
        assert_eq!(
            status("POST", &[("host", "localhost:4318"), ("origin", "https://evil.example")]).await,
            StatusCode::FORBIDDEN
        );
    }

    #[tokio::test]
    async fn allows_same_origin_writes() {
        for method in ["POST", "PATCH"] {
            assert_eq!(
                status(method, &[("host", "localhost:4318"), ("origin", "http://localhost:4318")]).await,
                StatusCode::NO_CONTENT
            );
        }
    }

    #[tokio::test]
    async fn rejects_other_loopback_origins() {
        for origin in ["http://localhost:4320", "http://127.0.0.1:4318", "https://localhost:4318", "null"] {
            assert_eq!(
                status("POST", &[("host", "localhost:4318"), ("origin", origin)]).await,
                StatusCode::FORBIDDEN,
                "unexpectedly allowed {origin}"
            );
        }
        assert_eq!(status("POST", &[("origin", "http://localhost:4318")]).await, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn allows_missing_origin() {
        assert_eq!(status("POST", &[("host", "localhost:4318")]).await, StatusCode::NO_CONTENT);
    }

    #[tokio::test]
    async fn get_does_not_require_a_loopback_origin() {
        assert_eq!(
            status("GET", &[("host", "localhost:4318"), ("origin", "https://evil.example")]).await,
            StatusCode::NO_CONTENT
        );
    }
}
