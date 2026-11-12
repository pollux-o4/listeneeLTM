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
    if let Some(when) = &decision.when {
        let parent = brief.decisions.iter().find(|p| p.id == when.decision);
        let valid = parent
            .is_some_and(|p| !when.options.is_empty() && when.options.iter().all(|o| p.option(o).is_some()));
        if !valid {
            return Err(PatchError::InvalidCondition);
        }
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
        when: decision.when,
    });
    // shortcut: 잠든 채 만든 갈림길의 `decide`는 버려져 깨어나면 열린 채로 묻는다, 미리 정하기를 기억할 필요가 보이면 저장 검토
    if decide && brief.decision_alive(&id) {
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
    if !brief.decision_alive(decision) && brief.decisions.iter().any(|d| d.id == decision) {
        return Err(PatchError::DormantDecision(decision.to_owned()));
    }
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
    sync_dependents(brief, decision);
    Ok(ChangeEvent::Choose { question, label: selected.label })
}

/// 선택이 바뀐 갈림길에 기대는 갈림길들의 항목을 맞춘다: 잠들면 빼고, 살아나면 남은 선택의 항목을 돌려놓는다.
/// 조건은 먼저 있던 갈림길만 가리키므로 목록 순서대로 한 번 훑으면 손자까지 닿는다.
fn sync_dependents(brief: &mut Brief, changed: &str) {
    let mut touched = vec![changed.to_owned()];
    for i in 0..brief.decisions.len() {
        let d = &brief.decisions[i];
        let Some(when) = &d.when else { continue };
        if !touched.contains(&when.decision) {
            continue;
        }
        touched.push(d.id.clone());
        let item_id = d.item_id();
        let restore = brief.decision_alive(&d.id).then(|| {
            let option = d.chosen.as_ref().and_then(|c| d.option(c))?;
            let by = d.chosen_by.unwrap_or(Actor::Ai);
            Some((option.section.unwrap_or(d.section), option.text.clone(), by))
        });
        let present = brief.sections.values().flatten().any(|item| item.id == item_id);
        match restore.flatten() {
            Some((section, text, by)) if !present => brief.sections.entry(section).or_default().push(Item {
                id: item_id,
                text,
                detail: None,
                by,
                confirmed: by == Actor::Me,
            }),
            Some(_) => {}
            None => {
                for items in brief.sections.values_mut() {
                    items.retain(|item| item.id != item_id);
                }
            }
        }
    }
}

pub(super) fn accept_recommended(brief: &mut Brief, by: Actor) -> Result<ChangeEvent, PatchError> {
    // 추천을 고르면 뒤 갈림길이 살아날 수 있어, 살아 있는 열린 갈림길이 없을 때까지 순서대로 고른다.
    let mut count = 0u32;
    for i in 0..brief.decisions.len() {
        let d = &brief.decisions[i];
        if d.chosen.is_none() && brief.decision_alive(&d.id) {
            let (id, option) = (d.id.clone(), d.recommended.clone());
            choose(brief, &id, &option, by)?;
            count += 1;
        }
    }
    if count == 0 {
        return Err(PatchError::NoOp);
    }
    Ok(ChangeEvent::AcceptRecommended { count })
}
