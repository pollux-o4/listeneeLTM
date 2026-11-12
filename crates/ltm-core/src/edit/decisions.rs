use crate::model::{Actor, Brief, ChangeEvent, Decision, DecisionOption, Item, sentence, validate_id};

use super::style::{Kind, check};
use super::{NewDecision, PatchError};

/// 선택지는 고르는 순간 항목이 되므로 만들 때 검증한다: id 형식·중복, 라벨과 문장.
fn checked_options(options: Vec<DecisionOption>, by: Actor) -> Result<Vec<DecisionOption>, PatchError> {
    let mut out: Vec<DecisionOption> = Vec::with_capacity(options.len());
    for option in options {
        validate_id(&option.id)?;
        if out.iter().any(|existing| existing.id == option.id) {
            return Err(PatchError::DuplicateOption(option.id));
        }
        let (label, text) = (sentence(&option.label)?, sentence(&option.text)?);
        check("option.label", Kind::Headline, &label, by)?;
        check("option.text", Kind::Headline, &text, by)?;
        check("option.note", Kind::Detail, &option.note, by)?;
        out.push(DecisionOption { label, text, ..option });
    }
    Ok(out)
}

pub(super) fn ask(brief: &mut Brief, decision: NewDecision, by: Actor) -> Result<ChangeEvent, PatchError> {
    validate_id(&decision.id)?;
    if brief.decisions.iter().any(|existing| existing.id == decision.id) {
        return Err(PatchError::DuplicateDecision(decision.id));
    }
    if decision.options.len() < 2 || !decision.options.iter().any(|option| option.id == decision.recommended)
    {
        return Err(PatchError::InvalidDecision);
    }
    let question = sentence(&decision.question)?;
    check("question", Kind::Headline, &question, by)?;
    check("why", Kind::Detail, &decision.why, by)?;
    let options = checked_options(decision.options, by)?;
    let decide = decision.decide.unwrap_or(false);
    let (id, recommended) = (decision.id.clone(), decision.recommended.clone());
    brief.decisions.push(Decision {
        id: decision.id,
        section: decision.section,
        question: question.clone(),
        why: decision.why,
        options,
        recommended: decision.recommended,
        chosen: None,
        chosen_by: None,
    });
    if decide {
        choose(brief, &id, &recommended, by)?;
        Ok(ChangeEvent::DecideRecommended { question })
    } else {
        Ok(ChangeEvent::Ask { question })
    }
}

/// 선택(또는 재선택). 이전 선택이 만든 항목은 새 선택의 항목으로 교체된다.
pub(super) fn choose(
    brief: &mut Brief,
    decision: &str,
    option: &str,
    by: Actor,
) -> Result<ChangeEvent, PatchError> {
    let found = brief
        .decisions
        .iter_mut()
        .find(|item| item.id == decision)
        .ok_or_else(|| PatchError::UnknownDecision(decision.to_owned()))?;
    let selected = found.option(option).cloned().ok_or_else(|| PatchError::UnknownOption {
        decision: decision.to_owned(),
        option: option.to_owned(),
    })?;
    found.chosen = Some(selected.id.clone());
    found.chosen_by = Some(by);
    let (item_id, section, question) =
        (found.item_id(), selected.section.unwrap_or(found.section), found.question.clone());

    for items in brief.sections.values_mut() {
        items.retain(|item| item.id != item_id);
    }
    brief.sections.entry(section).or_default().push(Item {
        id: item_id,
        text: selected.text,
        detail: None,
        by,
        confirmed: by == Actor::Me,
    });
    Ok(ChangeEvent::Choose { question, label: selected.label })
}

pub(super) fn accept_recommended(brief: &mut Brief, by: Actor) -> Result<ChangeEvent, PatchError> {
    let open: Vec<(String, String)> = brief
        .decisions
        .iter()
        .filter(|decision| decision.chosen.is_none())
        .map(|decision| (decision.id.clone(), decision.recommended.clone()))
        .collect();
    if open.is_empty() {
        return Err(PatchError::NoOp);
    }
    for (decision, option) in &open {
        choose(brief, decision, option, by)?;
    }
    Ok(ChangeEvent::AcceptRecommended { count: open.len() as u32 })
}
