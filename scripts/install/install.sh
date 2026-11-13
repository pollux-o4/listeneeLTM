#!/bin/sh
# INSTALL-001: no Node/Rust runtime; release assets must share one version.
set -eu
version=${LTM_VERSION:-0.1.0}
case "$version" in *[!0-9A-Za-z.-]*|'') echo 'Invalid LTM_VERSION' >&2; exit 1;; esac
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) asset=ltm-linux-x64 ;;
  Darwin-arm64) asset=ltm-darwin-arm64 ;;
  *) echo 'Supported: Linux x64, macOS arm64. Windows: use install.ps1.' >&2; exit 1 ;;
esac
install_dir=${LTM_INSTALL_DIR:-"$HOME/.local/bin"}
base="https://github.com/pollux-o4/listeneeLTM/releases/download/v$version"
mkdir -p "$install_dir"
# Stage on the destination filesystem so the final rename is atomic.
stage=$(mktemp -d "$install_dir/.ltm-install.XXXXXX")
trap 'rm -rf "$stage"' EXIT HUP INT TERM
fetch() {
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --https-only "$1" -O "$2"
  else
    echo "Download $asset and SHA256SUMS from $base in your browser." >&2
    exit 1
  fi
}
fetch "$base/$asset" "$stage/ltm"
fetch "$base/SHA256SUMS" "$stage/SHA256SUMS"
expected=$(awk -v name="$asset" '$2 == name { print $1 }' "$stage/SHA256SUMS")
case "$expected" in *[!0-9a-fA-F]*|'') echo 'Invalid release checksum' >&2; exit 1;; esac
[ "${#expected}" -eq 64 ] || { echo 'Invalid release checksum' >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$stage/ltm" | awk '{print $1}')
else
  actual=$(shasum -a 256 "$stage/ltm" | awk '{print $1}')
fi
[ "$actual" = "$expected" ] || { echo 'Checksum mismatch; existing installation preserved.' >&2; exit 1; }
chmod 755 "$stage/ltm"
"$stage/ltm" --version
[ ! -d "$install_dir/ltm" ] || { echo 'Destination is a directory' >&2; exit 1; }
mv -f "$stage/ltm" "$install_dir/ltm"
printf 'Installed %s/ltm\nAdd this directory to PATH for your AI shell, then run ltm init and ltm ui.\n' "$install_dir"
