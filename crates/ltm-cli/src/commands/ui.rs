use std::{net::Ipv4Addr, path::Path};

use anyhow::Context;
use ltm_server::{FileStore, http};

pub async fn run(store: FileStore, project: &Path, port: u16) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, port))
        .await
        .with_context(|| format!("port {port} in use"))?;
    eprintln!("LTM http://127.0.0.1:{port} (project: {})", project.display());
    axum::serve(listener, http::router(store)).await?;
    Ok(())
}
