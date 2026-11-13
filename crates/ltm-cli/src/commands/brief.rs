use anyhow::Context;
use ltm_core::{Actor, BriefPatch, BriefView, IssueKind, Locale, render_markdown};
use ltm_server::FileStore;
use serde::Serialize;

use super::next_steps::Output;

fn print(value: &impl Serialize) -> anyhow::Result<()> {
    println!("{}", serde_json::to_string_pretty(value)?);
    Ok(())
}

pub fn new(store: &FileStore, id: &str, title: &str, from: Option<&str>) -> anyhow::Result<()> {
    let brief = match from {
        Some(from) => store.duplicate(from, id, title, Actor::Ai)?,
        None => store.create(id, title)?,
    };
    print(&Output::from(BriefView::from(brief)))
}

pub fn list(store: &FileStore) -> anyhow::Result<()> {
    print(&store.list()?)
}

pub fn check(store: &FileStore, id: &str) -> anyhow::Result<()> {
    print(&Output::from(BriefView::from(store.get(id)?)))
}

/// 수신자에게 넘길 최종 지시서(Markdown).
pub fn export(store: &FileStore, id: &str, lang: Locale) -> anyhow::Result<()> {
    let view = BriefView::from(store.get(id)?);
    if !view.ready {
        eprintln!("draft: {} blocking issue(s) remain — see `ltm check {id}`", blocking(&view));
    }
    print!("{}", render_markdown(&view.brief, lang));
    Ok(())
}

fn blocking(view: &BriefView) -> usize {
    view.issues.iter().filter(|i| i.kind == IssueKind::Blocking).count()
}

/// CLI 쓰기는 AI의 편집으로 기록된다(사람은 GUI).
pub fn set(store: &FileStore, id: &str, patch: &str) -> anyhow::Result<()> {
    let patch: BriefPatch = serde_json::from_str(patch).context("invalid patch JSON")?;
    print(&Output::from(BriefView::from(store.patch(id, patch, Actor::Ai)?)))
}

pub fn undo(store: &FileStore, id: &str) -> anyhow::Result<()> {
    print(&Output::from(BriefView::from(store.undo(id, Actor::Ai)?)))
}

pub fn schema() -> anyhow::Result<()> {
    let schemas: serde_json::Map<String, serde_json::Value> = ltm_core::patch_schemas()
        .into_iter()
        .map(|(name, schema)| Ok((name.to_owned(), serde_json::to_value(schema)?)))
        .collect::<Result<_, serde_json::Error>>()?;
    print(&schemas)
}
