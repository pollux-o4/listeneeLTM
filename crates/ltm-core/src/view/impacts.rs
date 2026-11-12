use crate::{Actor, BriefPatch, model::Brief, view::OptionImpact};

/// 실제 선택을 사본에 적용해 살아 있는 갈림길의 차이를 잰다. 규칙을 두 번 쓰지 않으려고 같은 연산을 쓴다.
pub(super) fn calculate(brief: &Brief) -> Vec<OptionImpact> {
    let alive = |b: &Brief| -> Vec<String> {
        b.decisions.iter().filter(|d| b.decision_alive(&d.id)).map(|d| d.id.clone()).collect()
    };
    let before = alive(brief);
    let mut out = Vec::new();
    for d in brief
        .decisions
        .iter()
        .filter(|d| brief.decisions.iter().any(|c| c.when.as_ref().is_some_and(|w| w.decision == d.id)))
    {
        for o in d.options.iter().filter(|o| d.chosen.as_deref() != Some(&o.id)) {
            let mut next = brief.clone();
            let patch = BriefPatch::Choose { decision: d.id.clone(), option: o.id.clone() };
            if next.apply(patch, Actor::Me).is_err() {
                continue;
            }
            let after = alive(&next);
            let sleeps: Vec<String> = before.iter().filter(|id| !after.contains(id)).cloned().collect();
            let wakes: Vec<String> = after.iter().filter(|id| !before.contains(id)).cloned().collect();
            if !sleeps.is_empty() || !wakes.is_empty() {
                out.push(OptionImpact { decision: d.id.clone(), option: o.id.clone(), sleeps, wakes });
            }
        }
    }
    out
}
