# ADR-0002 · TypeScript 모노레포 + MCP + React/Storybook

- 맥락: 설치형 라이브러리, AI 호스트 연동, 로컬 GUI를 같이 개발하며 화면을 보면서 진행해야 한다(ADR-0001).
- 대안: Python 백엔드 + 별도 프론트 / 단일 패키지 TS / TS 모노레포.
- 선택: pnpm TS 모노레포(core·server·cli·ui), AI 연결은 MCP stdio, GUI는 React+Vite, 컴포넌트는 Storybook.
- 이유: Vite·Storybook 생태계와 같은 언어로 도메인 타입을 GUI·서버가 공유한다. MCP는 Claude Desktop·Claude Code·ChatGPT 등 주요 호스트가 지원하는 공통 연결 방식이다. Zod 스키마 하나로 검증·타입·MCP 입력 스키마를 겸한다.
- 결과: 호스트별 등록 자동화·배포 패키징·실시간 동기화는 여전히 미결(`host/`, `delivery/`, `editing/`). 현재 GUI는 폴링으로 AI 편집을 반영한다.
