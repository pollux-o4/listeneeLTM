import type { Messages } from '../types.ts'
import { counted } from './plural.ts'

export const preferencesCopy = {
  notes: {
    title: 'Preference notes',
    lead: 'These are working preferences your AI has picked up from your requests. It reads them before starting your next task.',
    emptyHint:
      'No preferences yet. Your AI will record recurring requests as you work. You can also add your own.',
    restore: 'Restore',
    editLabel: 'Edit preference',
    confirm: 'Confirm',
    edit: 'Edit',
    retire: 'Retire',
    defaultTopic: 'General',
    manualEvidence: 'Added manually',
    topicPlaceholder: 'Topic (e.g. decisions)',
    topicLabel: 'Topic',
    statementPlaceholder: 'Add a preference',
    statementLabel: 'Preference',
    add: 'Add',
    pending: (count: number) => ` ${counted(count, 'unconfirmed preference')}.`,
    retired: (count: number) => counted(count, 'retired preference'),
    restoreLabel: (statement: string) => `Restore “${statement}”`,
    evidenceLabel: (count: number) => counted(count, 'piece of evidence', 'pieces of evidence'),
    evidence: (count: number) => `Evidence: ${count}`,
    confirmLabel: (statement: string) => `Confirm “${statement}”`,
    editAction: (statement: string) => `Edit “${statement}”`,
    retireLabel: (statement: string) => `Retire “${statement}”`,
  },
} as const satisfies Messages['preferences']
