use crate::model::{Actor, ChangeEvent, now, sentence, validate_id};

use super::{PrefError, PrefPatch, Preference, Preferences};

/// 근거·출처는 최근 것만 유지한다(무한 증가 방지).
const EVIDENCE_LIMIT: usize = 8;
/// 원칙으로 묶으려면 하위 기준이 이만큼 있어야 한다.
const GROUP_MIN: usize = 2;

pub(super) fn apply(prefs: &mut Preferences, patch: PrefPatch, by: Actor) -> Result<ChangeEvent, PrefError> {
    let confirmed = by == Actor::Me;
    match patch {
        PrefPatch::Note { topic, statement, evidence, brief } => {
            let (topic, statement, evidence) =
                (sentence(&topic)?, sentence(&statement)?, sentence(&evidence)?);
            let brief = source(brief)?;
            if let Some(preference) =
                prefs.items.iter_mut().find(|item| item.topic == topic && item.statement == statement)
            {
                push_evidence(preference, evidence, brief);
                // 내려놓기는 사람의 결정이다. 다시 적용은 사람만 한다(MEM-001).
                if by == Actor::Me {
                    preference.retired = false;
                }
                Ok(ChangeEvent::NoteReinforced { statement })
            } else {
                let mut preference = Preference {
                    id: next_id(prefs),
                    topic,
                    statement: statement.clone(),
                    evidence: Vec::new(),
                    sources: Vec::new(),
                    parent: None,
                    by,
                    confirmed,
                    retired: false,
                    updated_at: now(),
                };
                push_evidence(&mut preference, evidence, brief);
                prefs.items.push(preference);
                Ok(ChangeEvent::NoteAdded { statement })
            }
        }
        PrefPatch::Reinforce { id, evidence, brief } => {
            let (evidence, brief) = (sentence(&evidence)?, source(brief)?);
            let preference = get_mut(prefs, &id)?;
            push_evidence(preference, evidence, brief);
            Ok(ChangeEvent::NoteReinforced { statement: preference.statement.clone() })
        }
        PrefPatch::Group { statement, members } => group(prefs, &statement, &members, by),
        PrefPatch::Ungroup { id } => {
            if !prefs.items.iter().any(|p| p.parent.as_deref() == Some(id.as_str())) {
                return Err(PrefError::InvalidGroup("not a principle"));
            }
            detach_children(prefs, &id);
            let principle = get_mut(prefs, &id)?;
            principle.retired = true;
            principle.updated_at = now();
            Ok(ChangeEvent::NoteUngrouped { statement: principle.statement.clone() })
        }
        PrefPatch::Edit { id, statement } => {
            let statement = sentence(&statement)?;
            let preference = get_mut(prefs, &id)?;
            preference.statement = statement.clone();
            preference.by = by;
            preference.confirmed = confirmed;
            preference.updated_at = now();
            Ok(ChangeEvent::NoteEdited { statement })
        }
        PrefPatch::Confirm { id } => {
            let preference = get_mut(prefs, &id)?;
            if preference.confirmed {
                return Err(PrefError::NoOp);
            }
            preference.confirmed = true;
            Ok(ChangeEvent::NoteConfirmed { statement: preference.statement.clone() })
        }
        PrefPatch::Retire { id } => {
            let preference = get_mut(prefs, &id)?;
            if preference.retired {
                return Err(PrefError::NoOp);
            }
            preference.retired = true;
            preference.updated_at = now();
            let statement = preference.statement.clone();
            // 원칙을 내려놓아도 하위 기준은 사라지지 않고 최상위로 돌아간다.
            detach_children(prefs, &id);
            Ok(ChangeEvent::NoteRetired { statement })
        }
        PrefPatch::Restore { id } => {
            let preference = get_mut(prefs, &id)?;
            if !preference.retired {
                return Err(PrefError::NoOp);
            }
            preference.retired = false;
            preference.updated_at = now();
            Ok(ChangeEvent::NoteRestored { statement: preference.statement.clone() })
        }
    }
}

/// 2단 규칙: 같은 묶음의 활성 최상위 기준만, 원칙은 다시 묶지 않는다(ADR-0008).
fn group(
    prefs: &mut Preferences,
    statement: &str,
    members: &[String],
    by: Actor,
) -> Result<ChangeEvent, PrefError> {
    let statement = sentence(statement)?;
    let mut ids: Vec<&String> = members.iter().collect();
    ids.sort();
    ids.dedup();
    if ids.len() < GROUP_MIN {
        return Err(PrefError::InvalidGroup("needs at least two preferences"));
    }
    let mut topic = None;
    for id in &ids {
        let p =
            prefs.items.iter().find(|p| &p.id == *id).ok_or_else(|| PrefError::NotFound((*id).clone()))?;
        if p.retired || p.parent.is_some() || is_principle(prefs, &p.id) {
            return Err(PrefError::InvalidGroup("members must be active top-level preferences"));
        }
        if topic.get_or_insert(p.topic.clone()) != &p.topic {
            return Err(PrefError::InvalidGroup("members must share a topic"));
        }
    }
    let id = next_id(prefs);
    for p in prefs.items.iter_mut().filter(|p| members.contains(&p.id)) {
        p.parent = Some(id.clone());
    }
    prefs.items.push(Preference {
        id,
        topic: topic.unwrap_or_default(),
        statement: statement.clone(),
        evidence: Vec::new(),
        sources: Vec::new(),
        parent: None,
        by,
        confirmed: by == Actor::Me,
        retired: false,
        updated_at: now(),
    });
    Ok(ChangeEvent::NoteGrouped { statement, count: ids.len() as u32 })
}

pub(super) fn is_principle(prefs: &Preferences, id: &str) -> bool {
    prefs.items.iter().any(|p| p.parent.as_deref() == Some(id))
}

fn detach_children(prefs: &mut Preferences, id: &str) {
    for p in prefs.items.iter_mut().filter(|p| p.parent.as_deref() == Some(id)) {
        p.parent = None;
    }
}

fn next_id(prefs: &Preferences) -> String {
    format!("p{}", prefs.revision + 1)
}

fn source(brief: Option<String>) -> Result<Option<String>, PrefError> {
    match brief {
        Some(id) => validate_id(&id).map(|()| Some(id.clone())).map_err(|_| PrefError::InvalidBrief(id)),
        None => Ok(None),
    }
}

fn get_mut<'a>(prefs: &'a mut Preferences, id: &str) -> Result<&'a mut Preference, PrefError> {
    prefs.items.iter_mut().find(|item| item.id == id).ok_or_else(|| PrefError::NotFound(id.to_owned()))
}

fn push_recent(list: &mut Vec<String>, value: String) {
    list.retain(|v| v != &value);
    list.push(value);
    let overflow = list.len().saturating_sub(EVIDENCE_LIMIT);
    list.drain(..overflow);
}

fn push_evidence(preference: &mut Preference, evidence: String, brief: Option<String>) {
    if !preference.evidence.contains(&evidence) {
        push_recent(&mut preference.evidence, evidence);
    }
    if let Some(brief) = brief {
        push_recent(&mut preference.sources, brief);
    }
    preference.updated_at = now();
}
