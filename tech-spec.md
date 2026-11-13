# Tech Spec · listeneeLTM

내부 개발용 기술 기준. 선택 이유: `ADR-0003`, `ADR-0004`, `ADR-0009`. 제품 의도: `VISION-`.

## 원칙

- 사용자에게는 **`ltm` 바이너리 하나**만 배포한다. 단독 설치에서는 사용자 PC에 런타임(Node 등)을 요구하지 않는다.
- Node·pnpm은 UI 개발·빌드와 npm 설치 경로에 쓴다. 단독 실행 파일은 Node 없이 동작한다.
- npm `listenee-ltm`은 플랫폼별 선택 의존성의 바이너리를 실행한다. 배포 산출물·설치 계약은 INSTALL-001.
- 도메인 타입의 원본은 Rust다. TS 타입은 생성한 것을 쓰며 직접 고치지 않는다.

## 스택

| 영역 | 선택 |
| - | - |
| 툴체인 | `mise.toml`(rust·node·pnpm·품질 도구), `rust-toolchain.toml` |
| 백엔드 | Rust 2024, cargo workspace |
| AI 연결 | `ltm` CLI(JSON 출력) + `.ltm/AGENTS.md` 안내, MCP 없음(ADR-0004) |
| HTTP | `axum` + `tokio`, 127.0.0.1 전용 |
| UI 포함 | `rust-embed`(release 빌드에 `ui/dist` 포함) |
| 타입 공유 | `ts-rs` → `ui/src/generated/`(커밋 대상) |
| UI | React 19 + Vite 8, TypeScript 7 strict |
| UI 카탈로그 | Storybook 10 (react-vite) |
| 품질·Rust | `cargo fmt`·`clippy -D warnings`, `cargo-nextest`(테스트), `cargo-machete`(안 쓰는 의존성) |
| 품질·UI | Biome, `tsc`, `knip`(안 쓰는 export·파일·의존성), 경계·문구 검사 스크립트 |
| 품질·저장소 | `typos`(오타), `cargo-deny`(취약점·라이선스·출처, `deny.toml`), `gitleaks`(Git 이력 비밀값), `pnpm audit`(JS 취약점), `actionlint`(Actions) |
| CI·유지보수 | GitHub Actions CI·CodeQL(JS/TS·Rust)·Dependabot, 운영 기준 OPS-003 |
| git hook | `lefthook`: 커밋 전 gitleaks·biome·rustfmt·typos(바뀐 파일), push 전 `pnpm check` |

버전은 `Cargo.toml`·`ui/package.json`·`mise.toml`에서 고정한다. `cargo-deny` 허용 라이선스는 `deny.toml`이 원본이다. pnpm `minimumReleaseAge` 정책에 막히면 이전 버전을 고른다(예외 등록 금지).

## 구조 (의존 방향 →)

```
crates/ltm-cli ──▶ crates/ltm-server ──▶ crates/ltm-core
                                              │ ts-rs
ui (React) ◀── ui/src/generated ◀─────────────┘
```

| 단위 | 책임 | 하위 관심사 |
| - | - | - |
| `ltm-core` | 도메인. I/O·문장 없음(코드+값, ADR-0007). 판정·조립의 유일한 원본 | `model/`(DATA-001: 섹션·항목·갈림길·변경 기록·문장 정규화), `edit/`(BriefPatch 디스패치 → 연산별 `items`·`decisions`), `view/`(공개 판정·파생 항목 대응, `stages` 단계·막힘 원본, `impacts` 선택 영향, `summary` 목록·학습), `render/`(최종 Markdown, 언어별 고정 문구), `prefs/`(취향 노트, MEM-001) |
| `ltm-server` | 저장과 GUI 어댑터 | `store`(`mod` 저장소·오류 표면, `brief` 지시서 저장, `preferences` 노트 저장, `history` 스냅샷, `files` 원자 쓰기·공유 프로젝트 잠금), `http/`(라우팅·`guard` 루프백 검사·`handlers`·`error` 상태 코드, 쓰기 = 사람), `assets`(내장 UI) |
| `ltm-cli` | AI용 명령(쓰기 = AI) | `commands/`: `init`(AI 안내 등록), `brief`(new·list·check·set·undo·export), `pref`(show·json·set), `ui` |
| `ui` | Listen to Me GUI(표현·문장 끝단) | `app/`(셸·라우팅·테마·화면 선택 `MainScreen`, `data/` 데이터 연결·쓰기 정책 `useWriter`), `features/brief`(`BriefWorkspace` 공개 화면, `stage/` 단계·갈림길·항목과 코어 결과 연결, `delivery/` 전달·확인, `requests/` AI 요청, `workspace/` 여정·초안), `features/preferences`(취향 노트), `design/`(토큰·스프라이트·프리미티브), `copy/`(언어별 문구·언어 선택·카탈로그), `api/`(데이터 경계 포트 `WorkspaceApi`·HTTP 구현·`ApiProvider` 주입·`useLive`) |

- 규칙
  - AI(CLI)와 GUI(HTTP)는 같은 `BriefPatch`·`FileStore`를 쓴다. 누가 바꿨는지는 경로로 정한다.
  - 단계 판정·막힘·최종 지시서는 코어 `BriefView`가 계산한다. UI는 다시 계산하지 않는다. 갈림길 파생 항목 id도 코어의 `decisionItems` 대응을 사용한다.
  - UI 모듈 경계의 원본은 `ui/scripts/check-boundaries.mjs` 규칙 표다(`pnpm check`가 강제). 요약: `app` → 기능 → `design`·`copy` → `generated`. 기능끼리, 기능 → `app`·`api`는 금지(데이터는 `app`이 props로 준다). `design`·`copy`는 공개 입구(`index.ts`)로만 가져온다.
  - 화면은 데이터 경계를 `useApi()`로만 쓴다. 스토리·테스트는 `ApiProvider`로 대역을 주입하고 전역 객체를 바꾸지 않는다.

## 데이터·실행

- `.ltm/briefs/<id>.json`(커밋), `.ltm/preferences.json`(커밋), `.ltm/history/`(되돌리기 스냅샷, `ltm init`이 gitignore). 모두 임시 파일에 쓴 뒤 rename으로 교체하고, 쓰기는 `.ltm/.lock` 잠금 안에서 한다(프로세스 간 변경 유실 방지).
- `ltm ui [--port 4318] [--no-open]`: 기본 브라우저를 열고 GUI와 `/api`(`briefs`, `briefs/{id}`, `briefs/{id}/undo`, `preferences`)를 함께 서비스한다. 루프백 Host와 같은 출처의 쓰기만 받는다.
- `ltm init`: 없는 `.ltm/AGENTS.md`를 만들고, 프로젝트 AGENTS.md(있으면 CLAUDE.md)에 안내 한 줄을 추가한다. 이미 있거나 CLAUDE.md가 `@AGENTS.md`를 불러오면 건너뛴다.
- `ltm new|list|check|set`: 결과 JSON은 stdout, 안내와 오류는 stderr로 낸다.
- GUI는 1.5초마다 다시 읽고, revision이 같으면 다시 그리지 않으며, 화면보다 오래된 응답은 버린다. 탭이 숨겨지면 멈춘다.
- 프로젝트 루트는 `--project` 또는 `LTM_PROJECT_ROOT`(기본 cwd)로 지정한다.

## 명령

| 명령 | 용도 |
| - | - |
| `mise install && pnpm install && mise x -- lefthook install` | 개발 환경 준비(git hook 포함) |
| `pnpm storybook` | 컴포넌트 카탈로그 http://localhost:6016 |
| `pnpm dev` | Rust API(4318) + Vite UI http://localhost:5173 |
| `mise run refresh [경로]` | 실사용 확인: 릴리스 빌드 → 샌드박스(기본 `~/.cache/listenee-ltm/sandbox`)에서 `ltm ui` 재시작, http://127.0.0.1:4320 (`LTM_PORT`) |
| `pnpm gen:copy-screens` | 문구별 화면 연결·실제 호출 예시 생성(`pnpm check`에서 누락·변경 검사) |
| `pnpm gen:notices` | 잠금 의존성·Rust 표준 라이브러리·정적 런타임 고지 갱신(`pnpm check`에서 누락·변경 검사) |
| `pnpm gen:types` | Rust 타입·스토리 view·ko/en Markdown → `ui/src/generated` |
| `pnpm check` | `check:rust` → `check:ui` → `check:distribution` → `check:repo` (push 전 hook이 실행) |
| `pnpm gen:readme-icons` | 제품 스프라이트·토큰 → README 아이콘 `docs/assets/icons` |
| `pnpm build` | UI 빌드 후 `target/release/ltm` |

## 코드 규칙

- Rust 타입을 바꾸면 `pnpm gen:types`를 실행하고, 생성된 TS 변경을 같은 커밋에 넣는다.
- UI 컴포넌트를 추가하면 같은 폴더에 `*.stories.tsx`를 둔다. 스토리 데이터는 코어가 생성한 `generated/fixtures/*.json`을 쓰고, 판정을 손으로 만들지 않는다.
- 사용자 노출 문구는 `ui/src/copy/<언어>/`에만 둔다(최종 Markdown 고정 문구만 코어 `render/`). 스토리도 문구를 직접 적지 않는다(가드: `check-copy`). 기준 언어·지원 언어 목록은 `copy/messages.ts`가 원본이다.
- 모든 문구는 그것이 보이는 스토리가 있어야 한다. 문구→화면 연결(`copy/screens.generated.json`)은 스토리를 렌더해 자동 생성하며(`pnpm gen:copy-screens`), 어긋나거나 화면 없는 문구가 있으면 `pnpm check`가 실패한다. 전체 목록은 Storybook `Copy/전체 문구`.
- 픽셀 글꼴은 12·24px(`--fs-pixel`, `--fs-pixel-lg`)로만 쓴다. 글꼴에 없는 기호(✓·연필)는 스프라이트로 그린다.
- 모션은 transform·opacity만 전환한다. 상태 변화는 `data-*` 속성과 CSS로 표현하고, 의미 토큰(`--c-*`)만 쓴다.
- 계약 ID 테스트: `FLOW-001` → `crates/<crate>/tests/flow_001.rs` (RULE-TEST).
- `ui/prototype/`는 시안 보관용이다. 빌드·타입 검사·Storybook에서 제외하고, 제품 코드는 import하지 않는다.
