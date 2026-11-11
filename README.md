# Listenee LTM

사용자의 지식수준이나 입력량과 관계없이 최소 중급 수준의 프롬프트·과업지시서를 작성하도록 돕는, 프로젝트 설치형 AI 친화 라이브러리. 내장 UI 이름은 **Listen to Me (LTM)**.

- 사용자는 평소 쓰는 AI 대화창에서 "LTM으로 과업지시서 써보자"라고 말한다.
- AI가 LTM을 호출해 프로젝트 맥락을 반영한 초안을 GUI에 채우고, 사람과 AI가 같은 데이터를 편집한다.

**상태:** 초기 개발. 기술 기준은 `tech-spec.md`.

```bash
mise install && pnpm install
pnpm storybook   # 컴포넌트 http://localhost:6006
pnpm dev         # Rust API + GUI http://localhost:5173
```

## 문서

`docs/` 아래 product → architecture → specs → decisions → operations 순으로 읽는다. 작업 규칙은 `AGENTS.md`.
