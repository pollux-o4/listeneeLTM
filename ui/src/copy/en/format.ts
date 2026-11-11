import type { ChangeEvent } from '../../generated/ChangeEvent.ts'
import type { IssueCode } from '../../generated/IssueCode.ts'
import { counted } from './plural.ts'

export function issue(code: IssueCode, stageLabel: string): string {
  switch (code.kind) {
    case 'emptyStage':
      return `${stageLabel} is empty`
    case 'openDecision':
      return `Decision needed: ${code.question}`
    case 'unconfirmed':
      return `${stageLabel}: ${counted(code.count, 'unconfirmed item')}`
  }
}

export function change(event: ChangeEvent): string {
  switch (event.kind) {
    case 'setTitle':
      return `Changed title to “${event.value}”`
    case 'addItem':
      return `Added “${event.text}”`
    case 'editItem':
      return `Edited “${event.text}”`
    case 'removeItem':
      return `Removed “${event.text}”`
    case 'confirmItem':
      return `Confirmed “${event.text}”`
    case 'confirmSection':
      return `Confirmed ${counted(event.count, 'item')}`
    case 'ask':
      return `Added decision: ${event.question}`
    case 'decideRecommended':
      return `Accepted recommendation: ${event.question}`
    case 'choose':
      return `“${event.question}” → ${event.label}`
    case 'acceptRecommended':
      return `Accepted recommendations for ${counted(event.count, 'decision')}`
    case 'undo':
      return event.undone ? `Undid: ${change(event.undone)}` : 'Undid last change'
    case 'noteAdded':
      return `Added preference: ${event.statement}`
    case 'noteReinforced':
      return `Added evidence: ${event.statement}`
    case 'noteEdited':
      return `Edited preference: ${event.statement}`
    case 'noteConfirmed':
      return `Confirmed preference: ${event.statement}`
    case 'noteRetired':
      return `Retired preference: ${event.statement}`
    case 'noteRestored':
      return `Restored preference: ${event.statement}`
    case 'noteGrouped':
      return `Grouped ${event.count} preferences under "${event.statement}"`
    case 'noteUngrouped':
      return `Ungrouped "${event.statement}"`
    case 'analyzed':
      return 'Analyzed for preferences'
    case 'derived':
      return `Duplicated from "${event.from}"`
    case 'legacy':
      return event.summary
  }
}
