use crate::model::{Actor, ChangeEvent, now, sentence};

use super::{PrefError, PrefPatch, Preference, Preferences};

/// 근거는 최근 것만 유지한다(무한 증가 방지).
const EVIDENCE_LIMIT: usize = 8;

pub(super) fn apply(prefs: &mut Preferences, patch: PrefPatch, by: Actor) -> Result<ChangeEvent, PrefError> {
    let confirmed = by == Actor::Me;
    match patch {
        PrefPatch::Note { topic, statement, evidence } => {
            let (topic, statement, evidence) =
                (sentence(&topic)?, sentence(&statement)?, sentence(&evidence)?);
            if let Some(preference) =
                prefs.items.iter_mut().find(|item| item.topic == topic && item.statement == statement)
            {
                push_evidence(preference, evidence);
                // 내려놓기는 사람의 결정이다. 다시 적용은 사람만 한다(MEM-001).
                if by == Actor::Me {
                    preference.retired = false;
                }
                Ok(ChangeEvent::NoteReinforced { statement })
            } else {
                let id = format!("p{}", prefs.revision + 1);
                prefs.items.push(Preference {
                    id,
                    topic,
                    statement: statement.clone(),
                    evidence: vec![evidence],
                    by,
                    confirmed,
                    retired: false,
                    updated_at: now(),
                });
                Ok(ChangeEvent::NoteAdded { statement })
            }
        }
        PrefPatch::Reinforce { id, evidence } => {
            let evidence = sentence(&evidence)?;
            let preference = get_mut(prefs, &id)?;
            push_evidence(preference, evidence);
            Ok(ChangeEvent::NoteReinforced { statement: preference.statement.clone() })
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
            Ok(ChangeEvent::NoteRetired { statement: preference.statement.clone() })
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

fn get_mut<'a>(prefs: &'a mut Preferences, id: &str) -> Result<&'a mut Preference, PrefError> {
    prefs.items.iter_mut().find(|item| item.id == id).ok_or_else(|| PrefError::NotFound(id.to_owned()))
}

fn push_evidence(preference: &mut Preference, evidence: String) {
    if !preference.evidence.contains(&evidence) {
        preference.evidence.push(evidence);
        let overflow = preference.evidence.len().saturating_sub(EVIDENCE_LIMIT);
        preference.evidence.drain(..overflow);
    }
    preference.updated_at = now();
}
