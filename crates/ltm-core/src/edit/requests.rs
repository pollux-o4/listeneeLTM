use crate::model::{Actor, Brief, ChangeEvent, Request, RequestTarget, sentence};

use super::PatchError;
use super::style::{Kind, check};

fn target_exists(brief: &Brief, target: &RequestTarget) -> bool {
    match target {
        RequestTarget::Item { id } => brief.sections.values().flatten().any(|i| &i.id == id),
        RequestTarget::Decision { id } => brief.decisions.iter().any(|d| &d.id == id),
    }
}

pub(super) fn add(brief: &mut Brief, target: RequestTarget, text: &str) -> Result<ChangeEvent, PatchError> {
    if !target_exists(brief, &target) {
        let id = match &target {
            RequestTarget::Item { id } => id.clone(),
            RequestTarget::Decision { id } => return Err(PatchError::UnknownDecision(id.clone())),
        };
        return Err(PatchError::UnknownItem(id));
    }
    let text = sentence(text)?;
    let id = format!("r{}", brief.revision + 1);
    brief.requests.push(Request {
        id,
        target,
        text: text.clone(),
        taken: false,
        acknowledged: false,
        reply: None,
    });
    Ok(ChangeEvent::RequestAdded { text })
}

pub(super) fn resolve(
    brief: &mut Brief,
    id: &str,
    reply: &str,
    by: Actor,
) -> Result<ChangeEvent, PatchError> {
    let reply = sentence(reply)?;
    check("reply", Kind::Detail, &reply, by)?;
    let request = brief
        .requests
        .iter_mut()
        .find(|r| r.id == id)
        .ok_or_else(|| PatchError::UnknownRequest(id.to_owned()))?;
    request.reply = Some(reply);
    request.taken = true;
    Ok(ChangeEvent::RequestResolved { text: request.text.clone() })
}

pub(super) fn remove(brief: &mut Brief, id: &str) -> Result<ChangeEvent, PatchError> {
    let at = brief
        .requests
        .iter()
        .position(|r| r.id == id)
        .ok_or_else(|| PatchError::UnknownRequest(id.to_owned()))?;
    let request = brief.requests.remove(at);
    Ok(ChangeEvent::RequestRemoved { text: request.text })
}

/// AI가 열린 요청을 모두 맡는다: 사람 화면에 '처리 중'이 보인다.
pub(super) fn take(brief: &mut Brief) -> Result<ChangeEvent, PatchError> {
    let mut count = 0u32;
    for request in brief.requests.iter_mut().filter(|r| r.reply.is_none() && !r.taken) {
        request.taken = true;
        count += 1;
    }
    if count == 0 {
        return Err(PatchError::NoOp);
    }
    Ok(ChangeEvent::RequestsTaken { count })
}

/// 사람이 답을 봤다(선택). 답이 없는 요청은 확인할 것이 없다.
pub(super) fn acknowledge(brief: &mut Brief, id: &str) -> Result<ChangeEvent, PatchError> {
    let request = brief
        .requests
        .iter_mut()
        .find(|r| r.id == id)
        .ok_or_else(|| PatchError::UnknownRequest(id.to_owned()))?;
    if request.reply.is_none() || request.acknowledged {
        return Err(PatchError::NoOp);
    }
    request.acknowledged = true;
    Ok(ChangeEvent::RequestAcknowledged { text: request.text.clone() })
}
