use crate::model::Actor;

use super::PatchError;

/// AI가 쓰는 사용자 화면 문장의 형식 관문(UX-001 쉬운 말·한 줄 한 뜻).
/// 어기면 저장하지 않고 사유와 고치는 방법을 돌려준다. 사람의 입력은 막지 않는다.
const HEADLINE_MAX: usize = 40;
/// 자세히는 `- ` 목록(제목 아래 두 단계까지)으로 쓴다. 전문 지식은 `[ ]` 안에만 둔다.
const DETAIL_LINE_MAX: usize = 100;
const DETAIL_LINES_MAX: usize = 6;
const HEADLINE_BANNED: [char; 6] = ['`', '→', '(', ')', '[', ']'];
const DETAIL_BANNED: [char; 2] = ['`', '→'];

#[derive(Debug, Clone, Copy)]
pub(super) enum Kind {
    /// 제목·질문·선택지 이름: 짧은 한 문장
    Headline,
    /// 자세히·이유·영향: 풀어 쓴 설명
    Detail,
}

pub(super) fn check(field: &'static str, kind: Kind, text: &str, by: Actor) -> Result<(), PatchError> {
    if by != Actor::Ai {
        return Ok(());
    }
    let violation = match kind {
        Kind::Headline => headline_violation(text),
        Kind::Detail => detail_violation(text),
    };
    match violation {
        Some((reason, hint)) => Err(PatchError::Style { field, reason, hint: hint.to_owned() }),
        None => Ok(()),
    }
}

fn headline_violation(text: &str) -> Option<(String, &'static str)> {
    const HINT: &str = "a headline is one short plain sentence; move explanations, conditions and examples to `detail`, or split into more items";
    let len = text.chars().count();
    let reason = if len > HEADLINE_MAX {
        format!("is {len} chars, max {HEADLINE_MAX}")
    } else if let Some(c) = text.chars().find(|c| HEADLINE_BANNED.contains(c)) {
        format!("contains `{c}`, which readers cannot parse; write it in plain words")
    } else if let Some(word) = acronym(text) {
        format!("contains the jargon/acronym `{word}`; say it in everyday words")
    } else if sentence_ends(text) > 1 {
        "has more than one sentence".to_owned()
    } else {
        return None;
    };
    Some((reason, HINT))
}

/// 자세히: 줄마다 `- ` 목록(들여쓰기 0 또는 2칸 = 두 단계), 전문 용어·약어는 `[ ]` 안에만.
fn detail_violation(text: &str) -> Option<(String, &'static str)> {
    // 자세히·이유·영향·답이 함께 쓰는 안내라 특정 칸 이름으로 말하지 않는다.
    const HINT: &str = "use plain words and put dev or domain terms only inside [ ]; in `detail`, write short `- ` lines (max 6, one level of `  - ` under them)";
    let lines: Vec<&str> = text.lines().collect();
    if lines.len() > DETAIL_LINES_MAX {
        return Some((format!("has {} lines, max {DETAIL_LINES_MAX}", lines.len()), HINT));
    }
    for line in lines {
        let body = line.trim_start();
        let indent = line.len() - body.len();
        if indent != 0 && indent != 2 {
            return Some(("nests deeper than two levels; use `- ` then `  - ` only".to_owned(), HINT));
        }
        let len = body.chars().count();
        let reason = if len > DETAIL_LINE_MAX {
            format!("has a line of {len} chars, max {DETAIL_LINE_MAX}")
        } else if let Some(c) = body.chars().find(|c| DETAIL_BANNED.contains(c)) {
            format!("contains `{c}`, which readers cannot parse; put it inside [ ] or write plain words")
        } else if let Some(plain) = outside_brackets(body) {
            match acronym(&plain) {
                Some(word) => {
                    format!("contains the jargon/acronym `{word}` outside [ ]; wrap it like [{word}]")
                }
                None => continue,
            }
        } else {
            "has an unclosed or nested `[`; use one [ ] pair per term".to_owned()
        };
        return Some((reason, HINT));
    }
    None
}

/// `[ ]` 안을 빼낸 나머지 글. 괄호가 짝이 맞지 않거나 겹치면 None.
fn outside_brackets(text: &str) -> Option<String> {
    let mut out = String::new();
    let mut inside = false;
    for c in text.chars() {
        match (c, inside) {
            ('[', false) => inside = true,
            ('[', true) | (']', false) => return None,
            (']', true) => inside = false,
            (_, false) => out.push(c),
            _ => {}
        }
    }
    (!inside).then_some(out)
}

/// 자세히의 두 칸: 설명(일상어 줄)과 기술(`[ ]`로 싼 줄). 화면·관문이 같은 규칙으로 읽는다.
pub fn split_detail(detail: &str) -> (Vec<&str>, Vec<&str>) {
    let (mut explain, mut tech) = (Vec::new(), Vec::new());
    for line in detail.lines() {
        let body = line.trim().trim_start_matches("- ").trim();
        match body.strip_prefix('[').and_then(|b| b.strip_suffix(']')) {
            Some(inner) if !inner.contains(['[', ']']) => tech.push(inner),
            _ if body.is_empty() => {}
            _ => explain.push(body),
        }
    }
    (explain, tech)
}

/// AI가 쓴 항목은 이상향(제목)·설명·기술이 모두 있어야 한다. 사람의 입력과 갈림길에서 생기는 항목은 제외.
pub(super) fn require_parts(detail: Option<&str>, by: Actor) -> Result<(), PatchError> {
    if by != Actor::Ai {
        return Ok(());
    }
    let (explain, tech) = split_detail(detail.unwrap_or(""));
    let missing = match (explain.is_empty(), tech.is_empty()) {
        (true, true) => "explanation and tech",
        (true, false) => "explanation",
        (false, true) => "tech",
        _ => return Ok(()),
    };
    Err(PatchError::Style {
        field: "detail",
        reason: format!("is missing the {missing} part"),
        hint: "every item needs title(text) + explanation(`- plain words`) + tech(`- [how it is built, commands ok]`) in `detail`, joined with a newline".to_owned(),
    })
}

/// 제품 화면이 이미 쓰는 말(AI, 제품 이름)이라 약어로 보지 않는다.
const PLAIN_ACRONYMS: [&str; 2] = ["AI", "LTM"];

/// 연속 대문자 2자 이상(ADR·CI·MCP·README). 풀어 쓰지 않은 약어는 비전공자가 읽을 수 없다.
fn acronym(text: &str) -> Option<String> {
    text.split(|c: char| !c.is_ascii_alphabetic())
        .find(|w| w.len() >= 2 && w.bytes().all(|b| b.is_ascii_uppercase()) && !PLAIN_ACRONYMS.contains(w))
        .map(str::to_owned)
}

fn sentence_ends(text: &str) -> usize {
    text.chars().filter(|c| matches!(c, '.' | '?' | '!' | '。')).count()
}
