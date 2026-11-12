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
            if let Some(detail) = &item.detail {
                for line in detail.lines() {
                    out.push_str(&format!("  {line}\n"));
                }
            }
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
        let active: Vec<&Preference> = self.items.iter().filter(|p| !p.retired).collect();
        if active.is_empty() {
            return text.empty_preferences.to_owned();
        }
        // 위에서 아래로: 묶음 → 원칙(또는 홀로 선 기준) → 하위 기준(ADR-0008).
        let children = |id: &str| -> Vec<&Preference> {
            active.iter().filter(|c| c.parent.as_deref() == Some(id)).copied().collect()
        };
        let weight = |p: &Preference| {
            p.evidence.len() + children(&p.id).iter().map(|c| c.evidence.len()).sum::<usize>()
        };
        let mut top: Vec<&Preference> = active.iter().filter(|p| p.parent.is_none()).copied().collect();
        top.sort_by(|a, b| a.topic.cmp(&b.topic).then(weight(b).cmp(&weight(a))));
        let line = |p: &Preference, indent: &str| {
            let mark = if p.confirmed { "" } else { text.unconfirmed };
            format!("{indent}- {}{mark} · {} {}\n", p.statement, text.evidence, weight(p))
        };
        let mut out = String::from(text.preferences_title);
        let mut topic = "";
        for p in top {
            if p.topic != topic {
                topic = &p.topic;
                out.push_str(&format!("\n## {topic}\n"));
            }
            out.push_str(&line(p, ""));
            for c in children(&p.id) {
                out.push_str(&line(c, "  "));
            }
        }
        out
    }
}
