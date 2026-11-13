# OPS-001 · 설치·첫 실행

계약: INSTALL-001. 대상: Linux x64, macOS arm64, Windows x64.

## 프로젝트에 npm으로 설치

공개 패키지 `listenee-ltm`을 설치한다. npm 경로에는 Node.js 18 이상이 필요하며, 단독 실행 파일에는 Node·Rust가 필요 없다.

```sh
pnpm add -D listenee-ltm
pnpm exec ltm init
pnpm exec ltm ui
```

한 줄로 설정·화면까지 열기:

```sh
pnpm add -D listenee-ltm && pnpm exec ltm init && pnpm exec ltm ui
```

프로젝트 로컬 설치이므로 AI도 `pnpm exec ltm`을 사용한다. `--no-optional`은 플랫폼 실행 파일을 제외하므로 사용하지 않는다.

## 개발 도구 없이 설치

Linux x64·macOS arm64:

```sh
curl -fsSL https://github.com/pollux-o4/listeneeLTM/releases/download/v0.1.0/install.sh | sh && "$HOME/.local/bin/ltm" init && "$HOME/.local/bin/ltm" ui
```

실행 파일은 `~/.local/bin/ltm`에 설치한다. AI 셸에서도 `ltm`을 찾도록 `~/.local/bin`을 PATH에 추가한 뒤 AI 앱을 다시 연다. 저장 위치는 `LTM_INSTALL_DIR`, 버전은 `LTM_VERSION`으로 지정한다. 셸 시작 파일은 자동 수정하지 않는다.

Windows x64·PowerShell:

```powershell
& ([scriptblock]::Create((Invoke-WebRequest -UseBasicParsing https://raw.githubusercontent.com/pollux-o4/listeneeLTM/v0.1.0/scripts/install/install.ps1).Content)); if ($?) { ltm init; if ($LASTEXITCODE -eq 0) { ltm ui } }
```

실행 파일은 `%LOCALAPPDATA%\listenee-ltm\bin\ltm.exe`에 설치하고 사용자 PATH에 추가한다. 이미 실행 중인 AI 앱은 다시 연다. 설치 스크립트를 파일로 받으면 `-Version`·`-InstallDir`로 지정할 수 있다.

다운로드 도구가 없거나 스크립트 실행이 제한된 환경에서는 GitHub Release에서 해당 파일(`ltm-linux-x64`, `ltm-darwin-arm64`, `ltm-win32-x64.exe`)과 `SHA256SUMS`를 브라우저로 받는다. 해시를 비교하고 `ltm`(Windows는 `ltm.exe`)으로 이름을 바꿔 PATH 폴더에 둔다. Unix에서는 `chmod +x ltm`을 실행한다. Node·Rust 설치는 필요 없다.

## 확인·복구

- `ltm --version` → `ltm init`을 두 번 실행한다. 기존 프로젝트 안내와 `.ltm/AGENTS.md` 수정 내용이 유지되어야 한다.
- `ltm ui`는 현재 프로젝트의 화면을 기본 브라우저로 연다. 브라우저가 열리지 않으면 출력된 `http://127.0.0.1:4318`을 직접 연다. 종료는 Ctrl+C. 원격·자동 검증에서는 `ltm ui --no-open`.
- AI가 `ltm new <id> "<제목>"`·`ltm set`으로 쓴 지시서를 GUI에서 수정하고 `ltm export <id>`로 확인한다.
- 포트가 사용 중이면 기존 서버를 종료하거나 `--port <번호>`를 지정한다.
- 체크섬·다운로드 실패는 기존 설치를 유지한다. 네트워크·버전을 확인하고 다시 실행한다. Windows 교체 실패는 실행 중인 LTM을 종료하고 재시도한다.
- `.ltm`은 프로젝트 데이터다. 제거·재설치 때 삭제하지 않는다.
