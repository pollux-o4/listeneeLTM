//! AI가 읽는 CLI 판정 출력에 붙는 다음 할 일(FLOW-001): 첫 작성 뒤 자기 리뷰, 사람이 남긴 요청 처리.
use ltm_core::BriefView;
use serde::Serialize;

/// 리뷰 기준. 원본은 저장소 `AGENTS.md`의 '제품 한 줄'이며, 같은지 테스트가 지킨다.
pub const PRODUCT_LINE: &str = "설치된 프로젝트 안에서 AI가 호출하고 사람과 AI가 같은 GUI로 공동 편집해, 누구나 중급 이상 품질의 과업지시서를 만들게 하는 라이브러리.";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelfReview {
    standard: &'static str,
    instruction: String,
}

/// CLI가 내보내는 지시서 판정. 자기 리뷰할 때만 `selfReview`가 붙는다.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Output {
    #[serde(flatten)]
    view: BriefView,
    #[serde(skip_serializing_if = "Option::is_none")]
    self_review: Option<SelfReview>,
    /// 열린 요청이 있을 때만: 처리 방법.
    #[serde(skip_serializing_if = "Option::is_none")]
    requests: Option<String>,
}

impl From<BriefView> for Output {
    fn from(view: BriefView) -> Self {
        let self_review = view.self_review_due.then(|| SelfReview {
            standard: PRODUCT_LINE,
            instruction: format!(
                "Before telling the user you are done: review this brief adversarially against `standard` \
                 (would anyone get a brief of at least intermediate quality from it?), fix what falls short with `ltm set`, \
                 then run `ltm set {} '{{\"op\":\"markReviewed\"}}'`. Do it once, without asking the user. \
                 Afterwards tell the user in one line what you improved.",
                view.brief.id
            ),
        });
        let open = view.brief.requests.iter().filter(|r| r.reply.is_none()).count();
        let requests = (open > 0).then(|| {
            format!(
                "The user left {open} open request(s) in `brief.requests` (each points at an item or decision id). \
                 First run `ltm set {id} '{{\"op\":\"takeRequests\"}}'` so the user sees you are on it. \
                 Then for each: answer it, or change the brief as asked with `ltm set`, then run \
                 `ltm set {id} '{{\"op\":\"resolveRequest\",\"id\":\"<request id>\",\"reply\":\"<one plain line: the answer or what you changed>\"}}'`. \
                 Reply in the user's language.",
                id = view.brief.id
            )
        });
        Self { view, self_review, requests }
    }
}

#[cfg(test)]
mod tests {
    use super::PRODUCT_LINE;

    #[test]
    fn product_line_matches_agents_md() {
        let agents = include_str!("../../../../AGENTS.md");
        assert!(agents.contains(PRODUCT_LINE), "AGENTS.md의 제품 한 줄과 PRODUCT_LINE이 다르다");
    }
}
