<div align="center">

<img src="docs/assets/icons/logo.svg" width="96" alt="리스니"/>

# listeneeLTM

**Listen to Me — AI와 같은 화면에서 함께 쓰는 과업지시서**

지식수준이나 입력량과 관계없이, 누구나 중급 이상의 프롬프트·과업지시서를 만들게 하는 프로젝트 설치형 라이브러리

![status](https://img.shields.io/badge/status-early%20dev-f2c14e?style=for-the-badge)
![rust](https://img.shields.io/badge/Rust-2024-5b4a9b?style=for-the-badge&logo=rust&logoColor=white)
![react](https://img.shields.io/badge/React-19-5b4a9b?style=for-the-badge&logo=react&logoColor=white)
![storybook](https://img.shields.io/badge/Storybook-10-5b4a9b?style=for-the-badge&logo=storybook&logoColor=white)
![binary](https://img.shields.io/badge/distribution-single%20binary-7fb77e?style=for-the-badge)

[작동 방식](#how) · [빠른 시작](#start) · [구조](#structure) · [문서](#docs)

<br/>

<img src="docs/assets/hero-workspace.png" alt="Listen to Me 작업 화면: 여정 지도, 갈림길 카드, 실시간 초안" width="900"/>

<sub>AI가 채운 초안을 단계별 여정 지도로 따라가며, 갈림길을 고르면 오른쪽 초안이 바로 바뀝니다.</sub>

</div>

---

## <img src="docs/assets/icons/spark.svg" height="24" align="absmiddle"/> 왜 LTM인가

> "LTM으로 과업지시서 써보자"

프로젝트의 셸·파일에 접근하고 안내 파일을 읽을 수 있는 AI 에이전트에서 시작합니다. AI가 프로젝트 맥락을 반영한 초안을 GUI에 채우고, 사람과 AI가 **같은 데이터를 함께 편집**합니다.

| 기능 | 설명 |
| - | - |
| <img src="docs/assets/icons/map.svg" height="20" align="absmiddle"/> **여정 지도** | 빠진 항목·갈림길·막힌 단계를 화면에서 바로 확인 |
| <img src="docs/assets/icons/collab.svg" height="20" align="absmiddle"/> **공동 편집** | AI는 CLI로, 사람은 GUI로 같은 지시서를 고치고, 누가 바꿨는지 기록 |
| <img src="docs/assets/icons/note.svg" height="20" align="absmiddle"/> **취향 노트** | AI가 작업 중 드러난 판단 기준을 근거와 함께 기록하고 다음 지시서에 반영, 사람은 확인·수정만 |
| <img src="docs/assets/icons/chest.svg" height="20" align="absmiddle"/> **바이너리 하나** | GUI가 포함된 `ltm` 단일 실행 파일, 단독 실행에는 Node·Rust 불필요 |
| <img src="docs/assets/icons/plug.svg" height="20" align="absmiddle"/> **CLI 연결** | MCP 등록 없이 사용, AI 호스트의 셸·프로젝트 파일 접근 권한 필요 |

## <img src="docs/assets/icons/window.svg" height="24" align="absmiddle"/> 화면

<table>
<tr>
<td width="50%"><img src="docs/assets/screen-done.png" alt="완성 화면"/></td>
<td width="50%"><img src="docs/assets/screen-notes.png" alt="취향 노트 화면"/></td>
</tr>
<tr>
<td align="center"><b>완성</b> — 모든 단계를 통과하면 상자에서 지시서를 꺼냅니다</td>
<td align="center"><b>취향 노트</b> — AI가 읽은 판단 기준을 확인·수정합니다</td>
</tr>
</table>

## <img src="docs/assets/icons/flow.svg" height="24" align="absmiddle"/> 작동 방식 <a id="how"></a>

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#f5ead8","primaryBorderColor":"#1e1b2e","primaryTextColor":"#1e1b2e","lineColor":"#5b4a9b","fontSize":"14px"}}}%%
flowchart LR
    U[사람] -- GUI 편집 --> G[Listen to Me<br/>ltm ui]
    A[AI 에이전트] -- ltm new·set·check --> C[ltm CLI]
    G --> S[(.ltm/briefs/*.json)]
    C --> S
    S --> R[최종 과업지시서<br/>Markdown]
```

1. `ltm init` — `.ltm/AGENTS.md`(AI용 사용 안내)를 만들고 프로젝트 `AGENTS.md`에 안내 한 줄을 등록합니다.
2. AI가 안내를 읽고 `ltm new`로 초안을 만들고, `ltm set`으로 채웁니다(JSON 출력).
3. 사람은 `ltm ui`로 같은 지시서를 보며 고치고, 막힌 단계를 함께 풉니다.
4. `ltm export`로 완성된 지시서를 Markdown으로 꺼냅니다.

지시서는 평범한 JSON 파일이라 Git으로 이력을 남기고 비교할 수 있습니다.

## <img src="docs/assets/icons/play.svg" height="24" align="absmiddle"/> 빠른 시작 <a id="start"></a>

지원 대상은 **Linux x64·macOS Apple Silicon·Windows x64**입니다.

프로젝트 폴더에서 설치하고 실행합니다. npm 설치에는 Node.js 18 이상이 필요합니다.

```sh
npm install --save-dev listenee-ltm@0.1.0
npx ltm init
npx ltm ui
```

`init`은 기존 안내 파일을 보존하며 AI 안내를 등록합니다. `ui`는 브라우저 화면을 엽니다. AI도 프로젝트에서 `npx ltm`으로 호출합니다. 플랫폼 실행 파일을 함께 설치해야 하므로 optional dependencies를 끄지 않습니다.

**Node 없이 사용하려면** [0.1.0 실행 파일](https://github.com/pollux-o4/listeneeLTM/releases/tag/v0.1.0)을 받거나 [설치 안내](docs/operations/OPS-001--installation.md)를 따릅니다. Rust·Docker는 사용자 설치 요건에 포함되지 않습니다.

다른 프로젝트를 열 때는 `--project <프로젝트 경로>`, 브라우저를 자동으로 열지 않을 때는 `ui --no-open`을 사용합니다. 기본 주소는 `http://127.0.0.1:4318`입니다.

<details>
<summary><b>소스에서 빌드</b></summary>

mise와 OS용 C/C++ 빌드 도구가 필요합니다. Rust 버전·구성 요소는 `rust-toolchain.toml`, Node·pnpm·검사 도구는 `mise.toml`을 따릅니다.

```sh
git clone --branch v0.1.0 https://github.com/pollux-o4/listeneeLTM.git
cd listeneeLTM
mise install
mise x -- pnpm install --frozen-lockfile
mise x -- pnpm build
./target/release/ltm init
./target/release/ltm ui
```

Windows PowerShell에서는 실행 파일 경로를 `.\target\release\ltm.exe`로 바꿉니다.

</details>

<details>
<summary><b>CLI 명령</b></summary>

| 명령 | 용도 |
| - | - |
| `ltm init` | AI 안내 등록 |
| `ltm new · list · check · set · undo · export` | 지시서 작성·검사·되돌리기·내보내기 |
| `ltm pref show · json · set` | 취향 노트 |
| `ltm ui [--port 4318] [--no-open]` | GUI 실행(127.0.0.1 전용), `--no-open`은 브라우저 자동 열기 생략 |
| `ltm licenses` | 실행 파일에 포함된 의존성의 저작권·라이선스 고지 |

프로젝트 루트는 `--project` 또는 `LTM_PROJECT_ROOT`(기본 현재 폴더)로 지정합니다.

</details>

<details>
<summary><b>개발 명령</b></summary>

| 명령 | 용도 |
| - | - |
| `pnpm check` | Rust·UI·배포·저장소 검사 전체 (push 전 자동 실행) |
| `pnpm gen:types` | Rust 타입·스토리 데이터 → `ui/src/generated` |
| `pnpm gen:copy-screens` | 문구 → 화면 연결 생성 |
| `pnpm gen:notices` | 잠금 의존성·Rust 표준 라이브러리·정적 런타임의 고지 갱신 |
| `pnpm build` | UI 빌드 후 `target/release/ltm`(Windows는 `ltm.exe`) |

</details>

<details>
<summary><b>릴리스 검증</b></summary>

릴리스는 세 OS의 빌드·설치 검사와 Docker 호환성 검사를 거칩니다. 검증 결과는 [Release 워크플로](https://github.com/pollux-o4/listeneeLTM/actions/workflows/release.yml)에서 확인합니다.

| 검증 환경 | 확인할 내용 |
| - | - |
| Linux `scratch` 컨테이너 | 런타임·공유 라이브러리 없는 환경에서 단독 실행 파일의 CLI·내장 UI/API 동작 |
| Node만 있는 npm 설치 환경 | Rust·C/C++ 빌드 도구 없이 로컬 npm 산출물 설치·실행 |
| Linux x64·macOS arm64·Windows x64 네이티브 환경 | 각 OS에서 빌드·설치·CLI·내장 UI/API 검사 |

개발자용 Docker 검사 인터페이스입니다. `BINARY`는 Linux x64 실행 파일, `ASSETS`는 npm tarball이 있는 폴더, `VERSION`은 검사할 버전입니다.

```sh
node scripts/release/container-smoke.mjs binary BINARY VERSION
node scripts/release/container-smoke.mjs npm ASSETS VERSION
```

Docker는 이 개발자용 검사에만 필요하며, 최종 사용자의 실행 요건에는 포함되지 않습니다. 원격 검증 결과와 산출물은 [Release 워크플로](https://github.com/pollux-o4/listeneeLTM/actions/workflows/release.yml)에서 확인합니다.

</details>

## <img src="docs/assets/icons/blocks.svg" height="24" align="absmiddle"/> 구조 <a id="structure"></a>

```
crates/ltm-cli ──▶ crates/ltm-server ──▶ crates/ltm-core
                                              │ ts-rs
ui (React) ◀── ui/src/generated ◀─────────────┘
```

| 단위 | 역할 |
| - | - |
| `ltm-core` | 도메인 원본: 판정·조립·최종 지시서 |
| `ltm-server` | 파일 저장(원자 쓰기·잠금·되돌리기) + 루프백 HTTP |
| `ltm-cli` | AI용 명령 |
| `ui` | Listen to Me GUI (React 19 · Vite · Storybook) |

## <img src="docs/assets/icons/book.svg" height="24" align="absmiddle"/> 문서 <a id="docs"></a>

`docs/`는 위에서 아래로 읽습니다.

| 관심사 | 폴더 | 탐색 키 |
| - | - | - |
| 왜·누구·이상향 | `product/` | `VISION-` |
| 구조 | `architecture/` | `C1`, `C2` |
| 계약 | `specs/` | `FLOW-`, `DATA-`, `UX-` |
| 선택 이유 | `decisions/` | `ADR-` |
| 운영 | `operations/` | `OPS-` |

기술 기준은 [`tech-spec.md`](tech-spec.md), 작업 규칙은 [`AGENTS.md`](AGENTS.md).

## <img src="docs/assets/icons/flask.svg" height="24" align="absmiddle"/> 상태

초기 개발 단계로, 업데이트 시 명령과 저장 형식이 바뀔 수 있습니다.

프로젝트 라이선스는 [MIT](LICENSE)입니다. 포함된 의존성의 고지는 `ltm licenses`로 확인합니다.
