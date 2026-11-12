import type { ChangeEvent } from '../../generated/ChangeEvent.ts'
import type { IssueCode } from '../../generated/IssueCode.ts'
import { subject } from './grammar.ts'

export function issue(code: IssueCode, stageLabel: string): string {
  switch (code.kind) {
    case 'emptyStage':
      return `${subject(stageLabel)} 비어 있다`
    case 'openDecision':
      return `정할 것: ${code.question}`
    case 'unconfirmed':
      return `${stageLabel}: AI가 쓴 ${code.count}개 확인 전`
  }
}

export function change(event: ChangeEvent): string {
  switch (event.kind) {
    case 'setTitle':
      return `제목을 "${event.value}"(으)로`
    case 'addItem':
      return `"${event.text}" 추가`
    case 'editItem':
      return `"${event.text}"(으)로 수정`
    case 'removeItem':
      return `"${event.text}" 삭제`
    case 'confirmItem':
      return `"${event.text}" 확인`
    case 'confirmSection':
      return `${event.count}개 항목 확인`
    case 'ask':
      return `갈림길 "${event.question}"`
    case 'decideRecommended':
      return `"${event.question}" 추천대로 정함`
    case 'choose':
      return `"${event.question}" → ${event.label}`
    case 'acceptRecommended':
      return `남은 갈림길 ${event.count}개를 추천대로`
    case 'undo':
      return event.undone ? `되돌림: ${change(event.undone)}` : '되돌림: '
    case 'noteAdded':
      return `"${event.statement}" 기록`
    case 'noteReinforced':
      return `"${event.statement}" 근거 추가`
    case 'noteEdited':
      return `"${event.statement}"(으)로 수정`
    case 'noteConfirmed':
      return `"${event.statement}" 확인`
    case 'noteRetired':
      return `"${event.statement}" 내려놓음`
    case 'noteRestored':
      return `"${event.statement}" 다시 적용`
    case 'noteGrouped':
      return `기준 ${event.count}개를 "${event.statement}"(으)로 묶음`
    case 'noteUngrouped':
      return `"${event.statement}" 묶음 풀기`
    case 'analyzed':
      return '취향 분석 완료'
    case 'reviewed':
      return '자기 리뷰 완료'
    case 'requestAdded':
      return `AI에게 요청: "${event.text}"`
    case 'requestsTaken':
      return `AI가 요청 ${event.count}개를 맡음`
    case 'requestResolved':
      return `AI가 답함: "${event.text}"`
    case 'requestAcknowledged':
      return `AI 답 확인: "${event.text}"`
    case 'requestRemoved':
      return `요청 지움: "${event.text}"`
    case 'derived':
      return `"${event.from}"에서 복제`
    case 'legacy':
      return event.summary
  }
}
