import { defineSprite, variant } from './define.ts'

/** 마스코트 '리스니': 큰 귀로 듣는 작은 생물. 16×16. */
const base = [
  '................',
  '..oo........oo..',
  '.obeo......oebo.',
  '.obeo......oebo.',
  '.obeo......oebo.',
  '..obeo....oebo..',
  '...oooooooooo...',
  '..obhbbbbbbbbo..',
  '.obhbbbbbbbbbbo.',
  '.obbbkbbbbkbbbo.',
  '.obbbkbbbbkbbbo.',
  '.obcbbbbbbbbcbo.',
  '.obbbbbkkbbbbbo.',
  '..obbbbbbbbbbo..',
  '...oooooooooo...',
  '....oo....oo....',
]

const blink = variant(base, { 9: '.obbbbbbbbbbbbo.', 10: '.obbbobbbbobbbo.' })

/** 귀를 세움: 귀 끝이 한 칸 올라가고 안쪽이 넓어진다. */
const perk = variant(base, {
  0: '..oo........oo..',
  1: '.obeo......oebo.',
  2: '.oeeo......oeeo.',
  4: '..obeo....oebo..',
  5: '..obeo....oebo..',
})

const happy = variant(base, {
  9: '.obbbobbbbobbbo.',
  10: '.obbkbkbbkbkbbo.',
  12: '.obbbboeeobbbbo.',
})

const think = variant(base, {
  9: '.obbbbkbbbbkbbo.',
  10: '.obbbbkbbbbkbbo.',
  12: '.obbbbbbbkkbbbo.',
})

export const listenee = {
  idle: defineSprite([base, base, base, base, base, blink]),
  listening: defineSprite([perk, base]),
  thinking: defineSprite([think]),
  happy: defineSprite([happy]),
} as const

export type ListeneeMood = keyof typeof listenee
