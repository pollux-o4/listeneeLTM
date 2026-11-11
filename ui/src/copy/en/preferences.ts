import type { Messages } from '../types.ts'
import { counted } from './plural.ts'

export const preferencesCopy = {
  notes: {
    title: 'Preference notes',
    lead: 'What your AI has learned about how you like to work in this project.\nThe more you work together, the less you need to explain.',
    emptyTitle: 'Nothing learned yet.',
    emptyHint:
      'As you work, your AI picks up your preferences from recurring choices.\nJust confirm what it gets right.',
    restore: 'Restore',
    children: (count: number) => counted(count, 'preference'),
    childrenPending: (count: number) => `${count} to confirm`,
    expand: (statement: string) => `Show preferences under “${statement}”`,
    ungroup: 'Ungroup',
    ungroupLabel: (statement: string) => `Ungroup “${statement}”`,
    sources: 'From briefs',
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
    pending: (count: number) => `${counted(count, 'preference')} to confirm`,
    retired: (count: number) => counted(count, 'retired preference'),
    restoreLabel: (statement: string) => `Restore “${statement}”`,
    evidenceLabel: (count: number) => counted(count, 'piece of evidence', 'pieces of evidence'),
    evidence: (count: number) => `Evidence: ${count}`,
    confirmLabel: (statement: string) => `Confirm “${statement}”`,
    editAction: (statement: string) => `Edit “${statement}”`,
    retireLabel: (statement: string) => `Retire “${statement}”`,
  },
} as const satisfies Messages['preferences']
