# Distribution notices

`THIRD_PARTY_NOTICES.txt` is generated and embedded in `ltm licenses`. It prepends
the project MIT LICENSE, followed by upstream terms. Changing LICENSE requires
regeneration before distribution. Cargo and npm metadata declare MIT; bundled
dependencies retain their original terms.

- Regenerate: `node scripts/release/notices.mjs`. Verify: append `--check`.
- Install locked JavaScript dependencies first. Cargo metadata runs locked and
  fetches missing sources for its complete inventory; pnpm
  reads production dependencies from its lockfile and installed package store.
- Collection includes all resolved Cargo packages, including build/dev and other
  targets, plus production JavaScript. Top-level license/copyright/notice/OFL and
  AUTHORS files are retained; explicit Cargo `license-file` is also read. Missing
  full text fails generation. Add a reviewed, version-specific source rather than
  substituting an SPDX identifier or a generic license without its copyright.
- Rust's sysroot `COPYRIGHT-library.html` and `licenses/` supply standard-library
  notices. Review `sources.json` when changing the pinned Rust version. Generation
  never runs Cargo tests or type generation.

## Reviewed upstream inputs

`sources.json` records source URLs and SHA-256 hashes for vendored text. Generation
checks hashes and never downloads license text. `ts-rs` and `ts-rs-macros` 12.0.1
omit their shared repository LICENSE from the crates; their `.cargo_vcs_info.json`
identifies commit `7182ad8289596097235406b715fa04506443b4ad`.

Rust 1.99.1 commit `58cf8f9c35b355199727627d07ae34a4e2846d67` uses musl 1.2.5:
https://github.com/rust-lang/rust/blob/58cf8f9c35b355199727627d07ae34a4e2846d67/src/ci/docker/scripts/musl-toolchain.sh

The pinned musl COPYRIGHT is included for the static Linux distribution. Other
native runtimes, notably the Windows static CRT and Apple's system libraries,
require review on their release hosts; Linux generation cannot verify their
redistribution terms. This inventory is not evidence of completed native-runtime
review on those platforms.

Publishing must ship these notices with all npm packages and keep them accessible
from the standalone executable. The release owner manages packaging and gates.
