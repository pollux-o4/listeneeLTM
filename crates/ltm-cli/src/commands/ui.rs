use std::{
    net::Ipv4Addr,
    path::Path,
    process::{Command, Stdio},
};

use anyhow::Context;
use ltm_server::{FileStore, http};

pub async fn run(store: FileStore, project: &Path, port: u16, no_open: bool) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, port))
        .await
        .with_context(|| format!("port {port} in use"))?;
    let url = format!("http://{}", listener.local_addr()?);
    eprintln!("LTM {url} (project: {})", project.display());
    if !no_open {
        open_browser(&url);
    }
    axum::serve(listener, http::router(store)).await?;
    Ok(())
}

fn open_browser(url: &str) {
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("rundll32.exe");
        command.arg("url.dll,FileProtocolHandler");
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = Command::new("open");
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let mut command = Command::new("xdg-open");

    match command.arg(url).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn() {
        Ok(mut child) => {
            // 런처가 종료를 미뤄도 서버는 계속 응답하고, 종료된 자식은 회수한다.
            let url = url.to_owned();
            std::thread::spawn(move || match child.wait() {
                Ok(status) if status.success() => {}
                result => eprintln!("could not open browser ({result:?}); open {url} manually"),
            });
        }
        Err(error) => eprintln!("could not open browser ({error}); open {url} manually"),
    }
}
