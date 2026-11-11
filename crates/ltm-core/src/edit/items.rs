use crate::model::{Actor, Brief, ChangeEvent, Item, SectionKey, find_item_mut, items_mut, sentence};

use super::PatchError;

pub(super) fn set_title(brief: &mut Brief, value: &str) -> Result<ChangeEvent, PatchError> {
    brief.title = sentence(value)?;
    Ok(ChangeEvent::SetTitle { value: brief.title.clone() })
}

pub(super) fn add(
    brief: &mut Brief,
    section: SectionKey,
    text: &str,
    by: Actor,
) -> Result<ChangeEvent, PatchError> {
    let text = sentence(text)?;
    let id = format!("i{}-0", brief.revision + 1);
    items_mut(brief, section).push(Item { id, text: text.clone(), by, confirmed: by == Actor::Me });
    Ok(ChangeEvent::AddItem { text })
}

pub(super) fn edit(brief: &mut Brief, id: &str, text: &str, by: Actor) -> Result<ChangeEvent, PatchError> {
    let text = sentence(text)?;
    let item = find_item_mut(brief, id).ok_or_else(|| PatchError::UnknownItem(id.to_owned()))?;
    item.text = text.clone();
    item.by = by;
    item.confirmed = by == Actor::Me;
    Ok(ChangeEvent::EditItem { text })
}

pub(super) fn remove(brief: &mut Brief, id: &str) -> Result<ChangeEvent, PatchError> {
    let text = brief
        .sections
        .values_mut()
        .find_map(|items| {
            let pos = items.iter().position(|item| item.id == id)?;
            Some(items.remove(pos).text)
        })
        .ok_or_else(|| PatchError::UnknownItem(id.to_owned()))?;
    Ok(ChangeEvent::RemoveItem { text })
}

pub(super) fn confirm(brief: &mut Brief, id: &str) -> Result<ChangeEvent, PatchError> {
    let item = find_item_mut(brief, id).ok_or_else(|| PatchError::UnknownItem(id.to_owned()))?;
    if item.confirmed {
        return Err(PatchError::NoOp);
    }
    item.confirmed = true;
    Ok(ChangeEvent::ConfirmItem { text: item.text.clone() })
}

pub(super) fn confirm_section(brief: &mut Brief, section: SectionKey) -> Result<ChangeEvent, PatchError> {
    let items = items_mut(brief, section);
    let count = items.iter().filter(|item| !item.confirmed).count();
    if count == 0 {
        return Err(PatchError::NoOp);
    }
    items.iter_mut().for_each(|item| item.confirmed = true);
    Ok(ChangeEvent::ConfirmSection { count: count as u32 })
}
