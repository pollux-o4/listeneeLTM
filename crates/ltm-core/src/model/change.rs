use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::Actor;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
#[ts(export)]
pub enum ChangeEvent {
    SetTitle { value: String },
    AddItem { text: String },
    EditItem { text: String },
    RemoveItem { text: String },
    ConfirmItem { text: String },
    ConfirmSection { count: u32 },
    Ask { question: String },
    DecideRecommended { question: String },
    Choose { question: String, label: String },
    AcceptRecommended { count: u32 },
    Undo { undone: Option<Box<ChangeEvent>> },
    NoteAdded { statement: String },
    NoteReinforced { statement: String },
    NoteEdited { statement: String },
    NoteConfirmed { statement: String },
    NoteRetired { statement: String },
    NoteRestored { statement: String },
    Legacy { summary: String },
}

#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Change {
    #[ts(type = "number")]
    pub revision: u64,
    pub by: Actor,
    pub event: ChangeEvent,
    /// RFC 3339
    pub at: String,
}

impl<'de> Deserialize<'de> for Change {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum Payload {
            Event { event: ChangeEvent },
            Legacy { summary: String },
        }
        #[derive(Deserialize)]
        struct Stored {
            revision: u64,
            by: Actor,
            at: String,
            #[serde(flatten)]
            payload: Payload,
        }
        let stored = Stored::deserialize(deserializer)?;
        let event = match stored.payload {
            Payload::Event { event } => event,
            Payload::Legacy { summary } => ChangeEvent::Legacy { summary },
        };
        Ok(Self { revision: stored.revision, by: stored.by, at: stored.at, event })
    }
}

pub(crate) const CHANGE_LOG_LIMIT: usize = 50;

pub(crate) fn record(changes: &mut Vec<Change>, revision: u64, by: Actor, event: ChangeEvent, at: String) {
    changes.insert(0, Change { revision, by, event, at });
    changes.truncate(CHANGE_LOG_LIMIT);
}
