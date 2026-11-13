use std::{
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

use anyhow::{Context, bail};

pub(super) fn create_if_missing(path: &Path, content: &str) -> anyhow::Result<()> {
    match fs::symlink_metadata(path) {
        Ok(_) => return Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.into()),
    }
    write_atomic(path, content, None).with_context(|| format!("create {}", path.display()))
}

pub(super) fn append_if(
    path: &Path,
    create: bool,
    addition: &str,
    needed: impl FnOnce(&str) -> bool,
) -> anyhow::Result<()> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => Some(metadata),
        Err(error) if error.kind() == io::ErrorKind::NotFound && create => None,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    let current = if metadata.is_some() { fs::read_to_string(path)? } else { String::new() };
    if !needed(&current) {
        return Ok(());
    }
    if metadata.as_ref().is_some_and(|metadata| !metadata.is_file()) {
        bail!("refusing to replace non-regular file {}", path.display());
    }
    let separator = if current.is_empty() || current.ends_with("\n\n") {
        ""
    } else if current.ends_with('\n') {
        "\n"
    } else {
        "\n\n"
    };
    write_atomic(path, &format!("{current}{separator}{addition}"), metadata.map(|m| m.permissions()))
        .with_context(|| format!("update {}", path.display()))
}

// 같은 디렉터리의 임시 파일로 완성한 뒤 공개해 기존 파일의 부분 쓰기를 막는다.
fn write_atomic(path: &Path, content: &str, permissions: Option<fs::Permissions>) -> io::Result<()> {
    static SEQUENCE: AtomicU64 = AtomicU64::new(0);
    let (temporary, mut file) = loop {
        let candidate = path.with_extension(format!(
            "ltm-{}-{}.tmp",
            std::process::id(),
            SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        match fs::OpenOptions::new().write(true).create_new(true).open(&candidate) {
            Ok(file) => break (Temporary(candidate), file),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        }
    };
    if let Some(ref permissions) = permissions {
        file.set_permissions(permissions.clone())?;
    }
    file.write_all(content.as_bytes())?;
    file.sync_all()?;
    drop(file);
    if permissions.is_some() {
        fs::rename(&temporary.0, path)?;
    } else {
        // hard_link는 완성된 파일만 공개하며, 그 사이 생긴 파일을 덮어쓰지 않는다.
        match fs::hard_link(&temporary.0, path) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(error),
        }
    }
    Ok(())
}

struct Temporary(PathBuf);

impl Drop for Temporary {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}
