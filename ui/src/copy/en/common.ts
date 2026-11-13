import type { Messages } from '../types.ts'

export const commonCopy = {
  mascot: {
    idle: 'Listenee is waiting',
    listening: 'Listenee is listening',
    thinking: 'Listenee is thinking',
    happy: 'Listenee is happy',
  },
  origin: {
    ai: 'AI',
    me: 'You',
    written: ' (confirmed)',
    unconfirmed: ' (unconfirmed)',
  },
  notice: { close: 'Dismiss notification' },
  edit: { save: 'Save', cancel: 'Cancel' },
} as const satisfies Messages['common']
