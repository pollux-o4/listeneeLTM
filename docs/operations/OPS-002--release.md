# OPS-002 · 릴리스·게시

계약: INSTALL-001. 선택 이유: ADR-0009. 버전 원본은 `Cargo.toml`의 workspace 버전, 지원 플랫폼 원본은 `npm/listenee-ltm/platforms.json`이다.

## 산출물 검증

1. 프로젝트 라이선스는 MIT다. 원문 `LICENSE`와 Cargo·npm `license` 메타데이터가 일치하는지 확인한다. `pnpm gen:notices`로 의존성 고지를 갱신·검토한다. 태그 게시 사전 검사는 라이선스·고지 누락을 거부한다.
2. 변경을 검토하고 `pnpm check`를 통과시킨다. 설치 스크립트의 기본 버전·README 설치 URL도 배포 버전과 맞춘다.
3. 워크플로를 저장소에 반영한 뒤 `Release`를 브랜치에서 수동 실행한다. `workflow_dispatch`는 태그를 선택해도 빌드·검증·패키징만 수행한다. 공개 게시는 태그 push에서만 수행한다. CI·CodeQL 및 저장소 보호 설정은 OPS-003을 따른다.
4. `release-assets` 아티팩트를 받는다. 세 OS의 실행 파일, 설치 스크립트, npm tarball 4개, `SHA256SUMS`가 있어야 한다. npm tarball마다 의존성 고지(공개 배포 시 프로젝트 LICENSE 포함)가 있어야 하며, 단독 실행 파일의 `ltm licenses`도 고지 원문을 출력해야 한다. 각 OS 작업은 빈 프로젝트 초기화·지시서 작성·내장 UI/API와 설치 테스트를 검증한다.

```sh
gh workflow run release.yml --ref dev
gh run download <실행-id> --name release-assets --dir release-assets
cd release-assets
sha256sum --check SHA256SUMS
```

## 최초 npm 게시 준비

- `listenee-ltm`과 `@listenee-ltm` 범위의 게시 권한을 확보한다. 현재 이름 조회 결과는 예약을 보장하지 않는다.
- npm 로그인은 소유자가 `npm login`으로 수행한다. 비밀번호·인증 토큰은 저장소에 기록하지 않는다.
- 최초 패키지는 검증된 동일 릴리스 tarball로 플랫폼 3개 → 런처 순서로 게시한다. 최초 게시 전에는 존재하지 않는 패키지의 Trusted Publisher를 설정할 수 없으므로 로컬 인증으로 시작한다.

```sh
npm publish listenee-ltm-linux-x64-0.1.0.tgz --access public --ignore-scripts
npm publish listenee-ltm-darwin-arm64-0.1.0.tgz --access public --ignore-scripts
npm publish listenee-ltm-win32-x64-0.1.0.tgz --access public --ignore-scripts
npm publish listenee-ltm-0.1.0.tgz --access public --ignore-scripts
```

각 패키지의 npm 설정에서 Trusted Publisher를 GitHub `pollux-o4/listeneeLTM`, 워크플로 `release.yml`, 환경 `npm`으로 등록하고 직접 게시 권한을 허용한다. GitHub에도 `npm` 환경을 만든다. 설정 후 저장소 변수 `LTM_NPM_PUBLISH=true`를 켠다. 이후 태그 배포는 OIDC·provenance로 게시하며 저장된 npm 토큰이 필요 없다. 요구 버전·설정 세부는 [npm 공식 안내](https://docs.npmjs.com/trusted-publishers/)를 따른다.

## 공개 릴리스와 다른 PC 확인

검토한 커밋에 workspace 버전과 같은 태그를 붙여 푸시하면 GitHub Release가 게시된다. npm 게시 작업은 위 변수를 켠 경우에만 실행된다. 최초 수동 게시한 버전을 다시 npm에 게시하지 않는다.

```sh
git tag v0.1.0
git push origin v0.1.0
```

다른 노트북의 빈 폴더에서 OPS-001의 한 줄 설치를 실행한다. 브라우저가 열리고, AI의 CLI 작성 → GUI 수정 → `ltm export`가 같은 데이터에 반영되어야 설치 완료로 판정한다. Windows·macOS의 보안 정책으로 실행이 차단되는지도 실제 PC에서 확인한다.

실패 시 아티팩트·실패 단계부터 확인한다. 이미 게시된 npm 버전은 덮어쓸 수 없다. 부분 게시라면 완료된 패키지는 재게시하지 말고 빠진 패키지부터 이어간다. 코드 변경이 필요하면 새 버전으로 다시 빌드한다. GitHub Release가 이미 있으면 해당 게시 작업 전체를 다시 실행하지 않는다.
