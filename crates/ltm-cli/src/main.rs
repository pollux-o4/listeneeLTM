//! `ltm` 진입점: 인자 해석 후 하위 명령에 위임한다.
mod commands;

use std::path::PathBuf;

use clap::{Parser, Subcommand};
use ltm_core::Locale;
use ltm_server::FileStore;

#[derive(Parser)]
#[command(name = "ltm", version, about = "Listen to Me — 과업지시서 작성 보조")]
struct Cli {
    /// 대상 프로젝트 루트
    #[arg(long, env = "LTM_PROJECT_ROOT", default_value = ".", global = true)]
    project: PathBuf,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// 프로젝트에 LTM을 연결한다: `.ltm/` 생성, AI 안내 등록
    Init,
    /// 새 지시서를 만든다. `--from <id>`면 그 지시서를 복제해 시작한다
    New {
        id: String,
        title: String,
        #[arg(long)]
        from: Option<String>,
    },
    /// 지시서 목록 (JSON)
    List,
    /// 지시서와 판정(단계 상태·막힘·확인 전) (JSON)
    Check { id: String },
    /// 편집 연산 하나를 적용한다. 예: '{"op":"addItem","section":"purpose","text":"..."}'
    Set { id: String, patch: String },
    /// 편집 연산 형식(JSON Schema): `set`·`pref set`에 보낼 JSON의 원본
    Schema,
    /// 직전 변경 되돌리기
    Undo { id: String },
    /// 수신자에게 넘길 최종 지시서 (Markdown)
    Export {
        id: String,
        #[arg(long, default_value = "ko")]
        lang: Locale,
    },
    /// 취향 노트: 사용자의 판단 기준 기억
    Pref {
        #[arg(long, default_value = "ko", global = true)]
        lang: Locale,
        #[command(subcommand)]
        command: commands::pref::PrefCommand,
    },
    /// GUI와 로컬 API 서버 (127.0.0.1 전용)
    Ui {
        #[arg(long, env = "LTM_PORT", default_value_t = 4318)]
        port: u16,
        /// 기본 브라우저를 열지 않는다
        #[arg(long)]
        no_open: bool,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let store = FileStore::new(&cli.project);
    match cli.command {
        Command::Init => commands::init::run(&cli.project),
        Command::New { id, title, from } => commands::brief::new(&store, &id, &title, from.as_deref()),
        Command::List => commands::brief::list(&store),
        Command::Check { id } => commands::brief::check(&store, &id),
        Command::Set { id, patch } => commands::brief::set(&store, &id, &patch),
        Command::Schema => commands::brief::schema(),
        Command::Undo { id } => commands::brief::undo(&store, &id),
        Command::Export { id, lang } => commands::brief::export(&store, &id, lang),
        Command::Pref { command, lang } => commands::pref::run(&store, command, lang),
        Command::Ui { port, no_open } => commands::ui::run(store, &cli.project, port, no_open).await,
    }
}
