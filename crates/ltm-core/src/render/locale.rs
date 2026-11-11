use crate::{Locale, SectionKey};

pub(super) struct RenderText {
    sections: [&'static str; 5],
    pub open_decisions: &'static str,
    pub empty_preferences: &'static str,
    pub preferences_title: &'static str,
    pub unconfirmed: &'static str,
    pub evidence: &'static str,
}

impl RenderText {
    pub fn section(&self, key: SectionKey) -> &'static str {
        self.sections[match key {
            SectionKey::Purpose => 0,
            SectionKey::ScopeIn => 1,
            SectionKey::ScopeOut => 2,
            SectionKey::Constraints => 3,
            SectionKey::Acceptance => 4,
        }]
    }
}

const KO: RenderText = RenderText {
    sections: ["목적", "포함 범위", "제외 범위", "제약", "완료 기준"],
    open_decisions: "\n## 미결\n",
    empty_preferences: "# 취향 노트\n\n(비어 있음)\n",
    preferences_title: "# 취향 노트\n",
    unconfirmed: " (확인 전)",
    evidence: "근거",
};
const EN: RenderText = RenderText {
    sections: ["Purpose", "In scope", "Out of scope", "Constraints", "Acceptance criteria"],
    open_decisions: "\n## Open decisions\n",
    empty_preferences: "# Preference notes\n\n(No entries)\n",
    preferences_title: "# Preference notes\n",
    unconfirmed: " (unconfirmed)",
    evidence: "Evidence:",
};

pub(super) fn text(locale: Locale) -> &'static RenderText {
    match locale {
        Locale::Ko => &KO,
        Locale::En => &EN,
    }
}
