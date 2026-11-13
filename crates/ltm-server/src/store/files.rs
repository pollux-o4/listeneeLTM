use super::{FileStore, StoreError};
use std::{
    fs, io,
    path::Path,
    sync::atomic::{AtomicU64, Ordering},
};

impl FileStore {
    /// 쓰기 구간 잠금. 반환값이 사라질 때 풀린다.
    pub fn lock_project(&self) -> Result<fs::File, StoreError> {
        fs::create_dir_all(&self.root)?;
        let file =
            fs::OpenOptions::new().create(true).truncate(false).write(true).open(self.root.join(".lock"))?;
        file.lock()?;
        Ok(file)
    }
}

pub(super) fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<Option<T>, StoreError> {
    match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .map(Some)
            .map_err(|source| StoreError::Corrupt { path: path.display().to_string(), source }),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// 임시 파일 후 rename으로 원자적 교체해 부분 쓰기 손실을 막는다.
/// 임시 파일 이름은 쓰는 쪽마다 달라, 동시에 써도 서로의 임시 파일을 덮지 않는다.
pub(super) fn write_json(path: &Path, value: &impl serde::Serialize) -> Result<(), StoreError> {
    static SEQ: AtomicU64 = AtomicU64::new(0);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let bytes = serde_json::to_vec_pretty(value)?;
    let tmp =
        path.with_extension(format!("{}-{}.tmp", std::process::id(), SEQ.fetch_add(1, Ordering::Relaxed)));
    let written = fs::write(&tmp, bytes).and_then(|()| fs::rename(&tmp, path));
    if written.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    Ok(written?)
}

pub(super) fn json_stems(dir: &Path) -> Result<Vec<String>, StoreError> {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(e.into()),
    };
    let mut out = Vec::new();
    for entry in entries {
        if let Some(stem) = entry?.file_name().to_str().and_then(|n| n.strip_suffix(".json")) {
            out.push(stem.to_owned());
        }
    }
    Ok(out)
}
