import { defineSprite } from './define.ts'

/** 12×10 전달 상자. 닫힘/열림. */
export const chest = {
  closed: defineSprite([
    [
      '............',
      '.oooooooooo.',
      'occcccccccco',
      'oyyyyyyyyyyo',
      'oooooyyooooo',
      'occcoyyoccco',
      'occccoocccco',
      'occcccccccco',
      'occcccccccco',
      'oooooooooooo',
    ],
  ]),
  open: defineSprite([
    [
      '.oooooooooo.',
      'oyyyyyyyyyyo',
      'occcccccccco',
      'oooooooooooo',
      'ohyhyyyyhyho',
      'occccyycccco',
      'occcccccccco',
      'occcccccccco',
      'occcccccccco',
      'oooooooooooo',
    ],
  ]),
} as const
