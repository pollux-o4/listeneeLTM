use std::{fs, path::Path};

fn has_hangul(text: &str) -> bool {
    text.chars()
        .any(|c| matches!(c as u32, 0x1100..=0x11FF | 0x3130..=0x318F | 0xA960..=0xA97F | 0xAC00..=0xD7FF))
}

// Scan quoted literals, including multiline/raw strings and escaped quotes.
fn korean_string(source: &str) -> bool {
    let bytes = source.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i..].starts_with(b"//") {
            i += source[i..].find('\n').unwrap_or(bytes.len() - i);
        } else if bytes[i..].starts_with(b"/*") {
            i += 2;
            let mut depth = 1;
            while i < bytes.len() && depth > 0 {
                if bytes[i..].starts_with(b"/*") {
                    depth += 1;
                    i += 2;
                } else if bytes[i..].starts_with(b"*/") {
                    depth -= 1;
                    i += 2;
                } else {
                    i += 1;
                }
            }
        } else if bytes[i] == b'"' {
            let mut prefix = i;
            while prefix > 0 && bytes[prefix - 1] == b'#' {
                prefix -= 1;
            }
            let raw = prefix > 0 && bytes[prefix - 1] == b'r';
            let end = format!("\"{}", "#".repeat(i - prefix));
            let start = i + 1;
            i = start;
            while i < bytes.len() {
                if raw && bytes[i..].starts_with(end.as_bytes()) {
                    break;
                }
                if !raw {
                    if bytes[i] == b'"' {
                        break;
                    }
                    if bytes[i] == b'\\' {
                        i += 1;
                    }
                }
                i += 1;
            }
            if has_hangul(&source[start..i.min(bytes.len())]) {
                return true;
            }
            i += if raw { end.len() } else { 1 };
        } else if bytes[i] == b'\'' {
            // Skip character literals without treating lifetimes as literals.
            let tail = &source[i + 1..];
            let len = if tail.starts_with('\\') {
                tail.find('\'').unwrap_or(0)
            } else {
                tail.chars().next().map_or(0, char::len_utf8)
            };
            if bytes.get(i + 1 + len) == Some(&b'\'') {
                i += len + 2;
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    false
}

fn check_directory(path: &Path) {
    for entry in fs::read_dir(path).unwrap() {
        let path = entry.unwrap().path();
        if path.is_dir() {
            check_directory(&path);
        } else if path.extension().is_some_and(|ext| ext == "rs") && !path.ends_with("render/locale.rs") {
            assert!(
                !korean_string(&fs::read_to_string(&path).unwrap()),
                "Korean string literal outside render/locale.rs: {}",
                path.display()
            );
        }
    }
}

#[test]
fn korean_copy_is_centralized() {
    assert!(korean_string("let s = \"한국어\";"));
    assert!(korean_string("let s = r##\"줄\n한국어\"##;"));
    assert!(korean_string("let s = \"escaped \\\" 한국어\";"));
    assert!(!korean_string("// \"한국어\"\n/// \"한국어\"\n//! \"한국어\""));
    assert!(!korean_string("let c = '\"'; let s = \"English\"; // 한국어"));
    check_directory(&Path::new(env!("CARGO_MANIFEST_DIR")).join("src"));
}
