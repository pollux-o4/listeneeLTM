# OPS-003 · 유지보수·보안 검사

## 자동 검사

- `CI`: dev·main 대상 PR/push, 수동 실행, 매주 월요일. `pnpm check` → 생성물 변경 감지 → UI 내장 릴리스 빌드 → CLI·HTTP smoke. 태그 릴리스도 같은 CI를 먼저 통과한다.
- `CodeQL`: JavaScript/TypeScript·Rust 정적 보안 분석. PR/push·수동·매주 월요일 실행하며 Security의 code scanning 결과로 확인한다.
- Dependabot: Cargo·npm·Actions 갱신 PR을 매주 dev에 제안한다. minor·patch는 생태계별로 묶고 major는 개별 검토한다. 자동 병합하지 않는다.
- npm 새 버전 도입은 `pnpm-workspace.yaml`의 최소 관찰 시간(하루)을 따른다. 예외로 우회하지 않는다.
- `pnpm check:repo`: 오타·Rust 취약점/라이선스/출처·전체 Git 이력의 비밀값·개발 의존성 포함 npm 취약점(moderate 이상)·워크플로 정적 검사. 로컬과 CI가 같은 명령을 사용한다.

Action은 전체 commit SHA로 고정하고 기본 토큰은 읽기 전용이다. 게시·CodeQL 결과 업로드에만 필요한 쓰기 권한을 부여한다. PR 코드에 게시용 환경·비밀값을 전달하지 않는다.

## GitHub에서 적용할 보호 설정

파일을 기본 브랜치 main에 반영해야 Dependabot·예약 실행이 활성화된다. 실제 워크플로를 한 번 성공시킨 뒤 아래 상태 검사의 정확한 이름을 선택한다.

1. dev·main 브랜치 ruleset: PR 경유, 필수 CI의 `quality`와 CodeQL의 두 `Analyze` 검사, force push·삭제 금지. 개인 저장소의 승인자 수는 실제 협업 인원에 맞춘다.
2. Actions: 기본 토큰 읽기 전용, fork PR은 첫 기여자의 실행 승인 유지. 임의 Action 사용을 제한한다면 현재 워크플로의 SHA 고정 Action을 허용한다.
3. Security: dependency graph·Dependabot alerts·security updates·private vulnerability reporting 활성화. Secret scanning·push protection도 활성 상태를 유지한다. CodeQL advanced workflow와 default setup을 중복 실행하지 않는다.
4. `release`·`npm` 환경: 게시할 `v*` 태그만 허용하고 협업 시 별도 승인자를 지정한다. `v*` 태그 ruleset으로 생성 주체를 제한하고 변경·삭제를 금지한다. npm OIDC 등록은 OPS-002를 따른다.

검사 실패는 해당 PR에서 수정한다. 비밀값이 탐지되면 값을 먼저 폐기·회전하고 이력 정리 범위를 판단한다. 취약점 회피를 위한 검사 무시·광범위 allowlist는 추가하지 않는다.

## 갱신·복구

- 의존성 PR: 변경 이력·취약점 공지 확인 → `pnpm check` → 릴리스 dry run. Storybook 관련 변경은 `pnpm --filter @listenee-ltm/ui build-storybook`도 실행한다.
- Rust·Node·pnpm·mise 도구 고정 버전은 수동 검토한다. npm 플랫폼 의존성 버전은 릴리스 staging이 workspace 버전에 맞춘다. 별도로 게시하지 않는다.
- `pnpm gen:notices`로 의존성 고지를 갱신하고 diff를 검토한다. `ltm licenses`와 npm tarball에 같은 고지가 들어가는지 배포 smoke에서 확인한다.
- 공개 버전의 결함 수정·부분 게시 복구는 OPS-002의 버전·복구 규칙을 따른다.

기준: [GitHub Actions 보안](https://docs.github.com/en/actions/reference/security/secure-use), [CodeQL 빌드 모드](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-for-compiled-languages), [npm Trusted Publisher](https://docs.npmjs.com/trusted-publishers/).
