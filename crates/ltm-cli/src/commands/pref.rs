use anyhow::Context;
use clap::Subcommand;
use ltm_core::{Actor, Locale, PrefPatch};
use ltm_server::FileStore;

#[derive(Subcommand)]
pub enum PrefCommand {
    /// 작업 전에 읽을 활성 기준 요약 (Markdown)
    Show,
    /// 전체 데이터 (JSON, id 확인용)
    Json,
    /// 편집 연산. 예: '{"op":"note","topic":"결정","statement":"...","evidence":"..."}'
    Set { patch: String },
}

pub fn run(store: &FileStore, command: PrefCommand, lang: Locale) -> anyhow::Result<()> {
    match command {
        PrefCommand::Show => print!("{}", store.preferences()?.render_markdown(lang)),
        PrefCommand::Json => println!("{}", serde_json::to_string_pretty(&store.preferences()?)?),
        PrefCommand::Set { patch } => {
            let patch: PrefPatch = serde_json::from_str(&patch).context("invalid preference patch JSON")?;
            print!("{}", store.patch_preferences(patch, Actor::Ai)?.render_markdown(lang));
        }
    }
    Ok(())
}
