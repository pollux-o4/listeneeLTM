# AGENTS · listeneeLTM

공통 규칙: [`.init_rules/`](.init_rules/README.md)의 RULE-CORE·ADR·SPEC·TEST·OPS. 이 파일은 프로젝트 고유 규칙만 둔다.

## 제품 한 줄

설치된 프로젝트 안에서 AI가 호출하고 사람과 AI가 같은 GUI로 공동 편집해, 누구나 중급 이상 품질의 과업지시서를 만들게 하는 라이브러리. 근거는 `VISION-` 검색.

## 문서 계층 (top-down, `docs/`)

| 관심사         | 폴더                             | 원본 범위        | 탐색 키                         |
| -------------- | -------------------------------- | ---------------- | ------------------------------- |
| 왜·누구·이상향 | `product/`                       | 제품 의도        | `VISION-`                       |
| 구조           | `architecture/`                  | C4               | `C1`, `C2`                      |
| 계약           | `specs/{behavior,data,quality}/` | 동작·데이터·품질 | `FLOW-`, `DATA-`, `UX-`         |
| 선택 이유      | `decisions/<관심사>/`            | ADR              | `--current.md`, `--proposed.md` |
| 운영           | `operations/`                    | 설치·실행 절차   | `OPS-`                          |

- 상위 문서가 바뀌면 하위(구조→계약→결정)의 정합성을 확인한다.
- 미결 사항은 `decisions/README.md`의 관심사 목록에서 찾고, 결정 시 ADR로 기록한다.

## 프로젝트 고유 규칙

- 명칭: 라이브러리 `listeneeLTM`(패키지 후보 `listenee-ltm`), 내장 UI `Listen to Me (LTM)`. 원 초안의 `LTP` 표기는 LTM으로 통일한다.
- 기술 기준·패키지 경계·명령은 `tech-spec.md`가 원본이다. 설치·배포는 ADR-0009를 따른다. 호스트별 등록은 ADR 없이 확정 전제로 코드를 쓰지 않는다.
- 완료 전 `pnpm check`. UI 변경은 스토리를 함께 갱신한다.
- 도메인 타입·판정·최종 지시서의 원본은 Rust(`ltm-core`). `ui/src/generated`는 `pnpm gen:types` 생성물이며 직접 고치지 않는다.
- 특정 사용자의 취향을 제품 규칙으로 굳히지 않는다. 개인 판단 기준은 취향 노트(MEM-001)의 데이터로 다룬다.
- 사용자 경험 계약(`UX-` 계약)은 구현 비종속이다. 구현이 계약을 바꾸려면 계약을 먼저 갱신한다.

<!-- ltm -->
과업지시서·프롬프트 작성 요청은 `.ltm/AGENTS.md`를 따른다.
