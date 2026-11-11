use super::BriefError;

/// 저장되는 문장의 정규화 원본: 앞뒤 공백을 지우고 줄바꿈을 한 칸으로 접는다.
/// 항목은 한 문장이며(DATA-001), 줄바꿈이 남으면 최종 Markdown의 목록·제목 구조가 깨진다.
pub(crate) fn sentence(text: &str) -> Result<String, BriefError> {
    let joined =
        text.split(['\n', '\r']).map(str::trim).filter(|l| !l.is_empty()).collect::<Vec<_>>().join(" ");
    if joined.is_empty() { Err(BriefError::EmptyText) } else { Ok(joined) }
}

/// 파일명·참조로 쓰이므로 경로 탈출을 막는다.
pub fn validate_id(id: &str) -> Result<(), BriefError> {
    let ok = !id.is_empty()
        && id.len() <= 64
        && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
    if ok { Ok(()) } else { Err(BriefError::InvalidId(id.to_owned())) }
}

pub(crate) fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}
