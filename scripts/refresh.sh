#!/usr/bin/env bash
# 실사용 ltm 갱신: 릴리스 빌드(UI 내장) → 기존 서버 종료 → 샌드박스 프로젝트에서 다시 띄우기.
# 사용: mise run refresh [프로젝트 경로] (포트: LTM_PORT, 기본 4318)
# UI를 고치며 바로 보려면 이 명령 대신 `pnpm dev`(HMR)를 쓴다.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
project="${1:-${LTM_SANDBOX:-${XDG_CACHE_HOME:-$HOME/.cache}/listenee-ltm/sandbox}}"
port="${LTM_PORT:-4318}"
bin="$root/target/release/ltm"
pidfile="$project/.ltm/ui.pid"
log="$project/.ltm/ui.log"

(cd "$root" && pnpm build)

mkdir -p "$project"
[ -d "$project/.git" ] || git -C "$project" init -q
# 매번 init: 없는 AI 안내를 생성하고 기존 안내·지시서·노트는 보존한다.
(cd "$project" && "$bin" init >/dev/null)

if [ -f "$pidfile" ] && kill "$(cat "$pidfile")" 2>/dev/null; then
  sleep 0.3
fi
# pid 파일 없이 떠 있는 이전 서버도 같은 포트면 정리한다.
fuser -k "$port/tcp" >/dev/null 2>&1 || true

# exec으로 서브셸을 남기지 않고, setsid로 호출한 터미널·도구와 분리한다(pid 파일 = 서버 pid).
(cd "$project" && exec setsid "$bin" ui --no-open --port "$port" </dev/null >"$log" 2>&1) &
echo $! >"$pidfile"

for _ in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:$port/api/briefs" >/dev/null 2>&1; then
    echo "ltm ui → http://127.0.0.1:$port  (project: $project, log: $log)"
    exit 0
  fi
  sleep 0.1
done
echo "ltm ui did not start; see $log" >&2
exit 1
