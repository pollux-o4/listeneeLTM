mod locale;

use crate::model::{Brief, SECTION_KEYS};
use crate::{Locale, Preference, Preferences};

/// 수신자(AI·사람)에게 넘길 최종 지시서. 사람용 메타(작성자·확인 여부)는 넣지 않는다(맥락 절제).
pub fn render_markdown(brief: &Brief, locale: Locale) -> String {
    let text = locale::text(locale);
    let mut out = format!("# {}\n", brief.title);
    for key in SECTION_KEYS {
        let items = brief.items(key);
        if items.is_empty() {
            continue;
        }
        out.push_str(&format!("\n## {}\n", text.section(key)));
        for item in items {
            out.push_str(&format!("- {}\n", item.text));
        }
    }
    let open: Vec<_> = brief.decisions.iter().filter(|d| d.chosen.is_none()).collect();
    if !open.is_empty() {
        out.push_str(text.open_decisions);
        for d in open {
            out.push_str(&format!("- {}\n", d.question));
        }
    }
    out
}

impl Preferences {
    /// AI가 작업 전에 읽는 요약: 활성 항목만, topic별, 확인 전은 표시. 근거는 개수만.
    pub fn render_markdown(&self, locale: Locale) -> String {
        let text = locale::text(locale);
        let mut active: Vec<&Preference> = self.items.iter().filter(|p| !p.retired).collect();
        if active.is_empty() {
            return text.empty_preferences.to_owned();
        }
        active.sort_by(|a, b| a.topic.cmp(&b.topic).then(b.evidence.len().cmp(&a.evidence.len())));
        let mut out = String::from(text.preferences_title);
        let mut topic = "";
        for p in active {
            if p.topic != topic {
                topic = &p.topic;
                out.push_str(&format!("\n## {topic}\n"));
            }
            let mark = if p.confirmed { "" } else { text.unconfirmed };
            out.push_str(&format!("- {}{mark} · {} {}\n", p.statement, text.evidence, p.evidence.len()));
        }
        out
    }
}
