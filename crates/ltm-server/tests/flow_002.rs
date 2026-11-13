//! 검증: FLOW-002 — 자동 복제 id는 잠금 안에서 고유하게 정한다.
use ltm_core::Actor;
use ltm_server::{FileStore, StoreError};

#[test]
fn explicit_duplicate_preserves_target_error_priority() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());

    assert!(matches!(store.duplicate("missing", "Bad..Id", "Copy", Actor::Me), Err(StoreError::Invalid(_))));

    store.create("occupied", "Occupied").unwrap();
    assert!(matches!(
        store.duplicate("missing", "occupied", "Copy", Actor::Me),
        Err(StoreError::Exists(id)) if id == "occupied"
    ));
}

#[test]
fn mismatched_body_ids_are_rejected_without_changing_source_files() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("healthy", "Healthy").unwrap();

    for (id, body_id) in
        [("source-path", "../escape"), ("source-empty", ""), ("source-other", "other-valid-id")]
    {
        store.create(id, "Source").unwrap();
        let path = root.path().join(format!(".ltm/briefs/{id}.json"));
        let mut value: serde_json::Value = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        value["id"] = body_id.into();
        let corrupt = serde_json::to_vec_pretty(&value).unwrap();
        std::fs::write(&path, &corrupt).unwrap();

        assert!(matches!(
            store.get(id),
            Err(StoreError::IdentityMismatch { path: mismatch_path, found })
                if mismatch_path == path.display().to_string() && found == body_id
        ));
        assert!(matches!(
            store.duplicate_next(id, "Copy", Actor::Me),
            Err(StoreError::IdentityMismatch { found, .. }) if found == body_id
        ));
        assert!(!root.path().join(format!(".ltm/briefs/{id}-2.json")).exists());
        assert_eq!(std::fs::read(&path).unwrap(), corrupt);
    }

    let listed: Vec<_> = store.list().unwrap().into_iter().map(|brief| brief.id).collect();
    assert_eq!(listed, ["healthy"]);
}

#[test]
fn duplicate_next_skips_used_number_and_fits_long_source_id() {
    let root = tempfile::tempdir().unwrap();
    let store = FileStore::new(root.path());
    store.create("sample", "Sample").unwrap();
    store.duplicate("sample", "sample-2", "Existing", Actor::Me).unwrap();

    let next = store.duplicate_next("sample", "Copy", Actor::Me).unwrap();
    assert_eq!(next.id, "sample-3");
    assert_eq!(next.derived_from.as_deref(), Some("sample"));

    let long_id = "a".repeat(64);
    store.create(&long_id, "Long source").unwrap();
    for number in 2..=9 {
        let suffix = format!("-{number}");
        let occupied = format!("{}{suffix}", &long_id[..long_id.len() - suffix.len()]);
        store.duplicate(&long_id, &occupied, "Existing", Actor::Me).unwrap();
    }
    let long_copy = store.duplicate_next(&long_id, "Long copy", Actor::Me).unwrap();
    assert_eq!(long_copy.id.len(), 64);
    assert!(long_copy.id.ends_with("-10"));
    assert_eq!(long_copy.derived_from.as_deref(), Some(long_id.as_str()));
}

#[test]
fn concurrent_duplicate_next_calls_choose_distinct_ids() {
    const COPIES: usize = 16;
    let root = tempfile::tempdir().unwrap();
    FileStore::new(root.path()).create("parallel", "Parallel").unwrap();
    let project = root.path().to_owned();

    let copies: Vec<_> = (0..COPIES)
        .map(|_| {
            let project = project.clone();
            std::thread::spawn(move || {
                FileStore::new(project).duplicate_next("parallel", "Copy", Actor::Me).unwrap().id
            })
        })
        .collect();

    let mut ids: Vec<_> = copies.into_iter().map(|copy| copy.join().unwrap()).collect();
    ids.sort();
    let mut expected: Vec<_> = (2..=COPIES + 1).map(|number| format!("parallel-{number}")).collect();
    expected.sort();
    assert_eq!(ids, expected);
}
