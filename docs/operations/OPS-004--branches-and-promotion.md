# OPS-004 · 브랜치·승격·정리

- `main`은 승격 단위 이력만 둔다. `dev → main` PR squash 병합으로만 갱신하고, 병합 후 `main`을 `dev`에 merge한다.
- 승격은 요청 시에만 한다. 릴리스는 검증 커밋의 태그로 하며 승격과 무관하다(OPS-002).
- 일회성 브랜치는 생성 시 삭제 조건을 정하고 목적 달성 즉시 삭제한다.
- 브랜치·PR 생성 자동화는 생성 상한을 정한 뒤 켠다. 쌓인 자동 PR은 설정 변경 전에 분류한다.
- 공유 브랜치 이력 재작성은 기준 커밋·보존 이력·태그/PR 영향·되돌림 방법을 제시하고 승인받은 뒤 실행한다.

## 정리 완료 기준

네 대상을 모두 확인해야 "정리됨"이다. 브랜치 간 동기화는 근거가 아니다.

```sh
git status --short && git branch -vv && git worktree list
git ls-remote --heads origin   # dev·main 외는 소유 작업·삭제 조건 설명 가능해야 함
gh pr list --state open
```
