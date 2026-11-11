# Listen to Me (LTM)

이 프로젝트는 LTM으로 과업지시서·프롬프트를 작성한다. 사용자가 "LTM으로 …", 과업지시서·프롬프트 작성·다듬기·점검을 요청하면 따른다.

## 흐름

0. `ltm pref show`로 취향 노트(이 사용자의 판단 기준)를 먼저 읽고 따른다. 확인 전 항목은 약한 근거로 다룬다.
1. `ltm list`로 이어 쓸 지시서를 찾는다. 없으면 `ltm new <id> "<제목>"` (id: 소문자·숫자·하이픈).
2. 프로젝트 파일·결정 기록·대화에서 목적·범위·제약·완료 기준을 직접 찾아 채운다. 사용자 지식으로 채울 일을 되묻지 않는다.
3. 판단이 필요한 곳은 갈림길로 만든다. 직접 정할지 열어 둘지는 취향 노트의 `결정` 기준을 따르고, 기준이 없으면:
   - 업계 관행으로 답이 자명하고 되돌리기 쉬운 선택: `"decide": true`로 추천대로 정해 둔다(사용자가 GUI에서 바꿀 수 있다).
   - 취향·비용·되돌리기 어려운 선택·충돌: 열어 두고 사용자에게 한 줄로 알린다.
4. `ltm check <id>`의 `ready`가 true가 될 때까지 막힘(`issues`의 `blocking`)을 해소한다.
5. 사용자에게 `ltm ui`(http://127.0.0.1:4318)에서 보고 고칠 수 있다고 알린다. 최종본은 `ltm export <id>`(막힘이 남아 있으면 stderr에 초안임을 알린다).

## 편집: `ltm set <id> '<JSON>'`

섹션: `purpose`(목적) · `scopeIn`(포함 범위) · `scopeOut`(제외 범위) · `constraints`(제약) · `acceptance`(완료 기준)

| op | 예 |
| - | - |
| addItem | `{"op":"addItem","section":"purpose","text":"..."}` |
| editItem / removeItem | `{"op":"editItem","id":"i3-0","text":"..."}` · `{"op":"removeItem","id":"i3-0"}` |
| ask | `{"op":"ask","decision":{"id":"image-host","section":"constraints","question":"이미지를 어디에 둘까?","why":"비용·속도를 정한다","recommended":"static","decide":true,"options":[{"id":"static","label":"정적 호스팅","note":"무료","text":"이미지는 정적 호스팅"},{"id":"cdn","label":"CDN","note":"월 비용","text":"이미지는 CDN"}]}}` (선택지에 `"section":"scopeOut"`처럼 문장이 들어갈 섹션을 따로 지정할 수 있다) |
| choose | `{"op":"choose","decision":"image-host","option":"cdn"}` |
| setTitle | `{"op":"setTitle","value":"..."}` |

- 문장은 한 줄로 쓴다(줄바꿈은 한 칸으로 접힌다). 여러 내용은 항목을 나눠 적는다.
- 갈림길 선택지는 2개 이상, id는 서로 다르게(소문자·숫자·하이픈), `label`과 `text`는 비우지 않는다.
- 사람이 GUI에서 고친 내용이 우선이다. 쓰기 전에 `ltm check`로 최신 상태를 읽는다.
- AI가 쓴 항목은 사람이 확인할 때까지 "확인 전"으로 표시된다. 사람의 확인을 대신하지 않는다.
- 실수는 `ltm undo <id>`.

## 취향 노트: `ltm pref set '<JSON>'`

사용자의 요청·지적·선택에서 반복되는 판단 기준을 기록한다. 사용자에게 채우라고 하지 않는다.

- 기록: `{"op":"note","topic":"결정","statement":"자명한 선택은 묻지 말고 정한 뒤 알린다","evidence":"기본값을 묻자 알아서 정하라고 함"}` — 같은 기준을 다시 관찰하면 같은 문장으로 기록해 근거를 쌓는다.
- `statement`는 다음 작업에 적용할 수 있는 한 문장 기준. 일회성 지시·감정·개인정보는 기록하지 않는다.
- `evidence`는 관찰을 짧게 요약한다(원문 인용·민감 정보 금지).
- 사용자가 기준을 부정하면 `{"op":"retire","id":"p3"}`. id는 `ltm pref json`. 내려놓은 기준은 사용자만 다시 적용한다.

Issue `code` and change `event` contain codes and values. Explain them to the user in the conversation language. Markdown exports accept `--lang ko|en` (default: ko).
