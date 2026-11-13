use crate::model::{Actor, Brief, ChangeEvent, Item, SectionKey, find_item_mut, items_mut, sentence};

use super::PatchError;
use super::style::{Kind, check, require_parts};

/// 자세히 정규화: 비면 없음.
fn detail_of(detail: Option<&str>, by: Actor) -> Result<Option<String>, PatchError> {
    let Some(raw) = detail else { return Ok(None) };
    // 줄(목록 구조)은 지키고 빈 줄·줄 끝 공백만 정리한다.
    let text = raw.lines().map(str::trim_end).filter(|l| !l.trim().is_empty()).collect::<Vec<_>>().join("\n");
    if text.is_empty() {
        return Ok(None);
    }
    check("detail", Kind::Detail, &text, by)?;
    Ok(Some(text))
}

pub(super) fn set_title(brief: &mut Brief, value: &str) -> Result<ChangeEvent, PatchError> {
    brief.title = sentence(value)?;
    Ok(ChangeEvent::SetTitle { value: brief.title.clone() })
}

pub(super) fn add(
    brief: &mut Brief,
    section: SectionKey,
    text: &str,
    detail: Option<&str>,
    by: Actor,
) -> Result<ChangeEvent, PatchError> {
    let text = sentence(text)?;
    check("text", Kind::Headline, &text, by)?;
    let detail = detail_of(detail, by)?;
    require_parts(detail.as_deref(), by)?;
    let id = format!("i{}-0", brief.revision + 1);
    items_mut(brief, section).push(Item { id, text: text.clone(), detail, by, confirmed: by == Actor::Me });
    Ok(ChangeEvent::AddItem { text })
}

pub(super) fn edit(
    brief: &mut Brief,
    id: &str,
    text: &str,
    detail: Option<&str>,
    by: Actor,
) -> Result<ChangeEvent, PatchError> {
    let text = sentence(text)?;
    check("text", Kind::Headline, &text, by)?;
    let new_detail = detail_of(detail, by)?;
    let item = find_item_mut(brief, id).ok_or_else(|| PatchError::UnknownItem(id.to_owned()))?;
    // 자세히를 생략하면 기존 것이 남으므로, 남는 값까지 포함해 두 칸이 채워졌는지 본다.
    let resulting = if detail.is_some() { new_detail.as_deref() } else { item.detail.as_deref() };
    require_parts(resulting, by)?;
    item.text = text.clone();
    if detail.is_some() {
        item.detail = new_detail;
    }
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
