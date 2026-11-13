# ADR-0003 · Rust 단일 바이너리 백엔드 + TS UI

대체: ADR-0002

- 맥락: 설치 대상 프로젝트에 mise 수준으로 영향이 거의 없어야 한다. 설치 대상은 Node가 없는 프로젝트(ComfyUI 등)일 수 있고, AI 호스트는 세션마다 MCP 프로세스를 띄운다.
- 대안
  - TS 단일: 개발이 가장 빠르다. 사용자 PC에 Node가 필요하고, 프로세스당 수십 MB를 쓴다.
  - Go 백엔드: 단일 바이너리지만 GC 때문에 상주 메모리가 Rust보다 크다.
  - Tauri: 데스크톱 창과 WebView가 붙는다. 제품 형태(브라우저의 로컬 웹 UI)에 비해 무겁다.
  - Rust 백엔드 + TS UI: 선택.
- 선택
  - 백엔드는 Rust 단일 바이너리 `ltm`이다. MCP는 `rmcp`, HTTP는 `axum`을 쓰고, 빌드된 UI를 `rust-embed`로 넣는다.
  - UI는 React, Vite, Storybook을 쓴다. 개발할 때만 Node가 필요하다.
  - 도메인 타입의 원본은 Rust이고, TS 타입은 `ts-rs`로 생성한다.
- 이유: Node 없이 바이너리 하나로 설치된다. 실측으로 release 바이너리는 3.2 MB(픽셀 글꼴 2종을 넣은 뒤 2.8 MB, MCP 제거 반영), MCP·UI 프로세스 상주 메모리(RSS)는 각각 약 6 MB였다(2026-11-11, linux x64).
- 결과
  - 품질 점검 로직은 Rust에만 있다. Storybook은 미리 만든 결과값(fixture)을 쓴다.
  - 수정 후 확인 주기가 컴파일만큼 느려진다.
  - 데스크톱 기능이 필요해지면 같은 Rust 코드 위에 Tauri를 추가하는 것을 검토한다.
