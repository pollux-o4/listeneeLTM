import { defineSprite } from './define.ts'

/** 8×8 아이콘. 한 색 문자로 그려 CSS 색으로 바꾸기 쉽게 한다. */
export const icons = {
  check: defineSprite([
    [
      '........',
      '.......m',
      '......mm',
      'm....mm.',
      'mm..mm..',
      '.mmmm...',
      '..mm....',
      '........',
    ],
  ]),
  warn: defineSprite([
    [
      '...rr...',
      '...rr...',
      '..rrrr..',
      '..r..r..',
      '.rr..rr.',
      '.rrrrrr.',
      'rrr..rrr',
      'rrrrrrrr',
    ],
  ]),
  spark: defineSprite([
    [
      '...y....',
      '...y....',
      '.yyyyy..',
      '...y....',
      '...y....',
      '........',
      '......y.',
      '........',
    ],
    [
      '........',
      '...y....',
      '..yyy...',
      '...y....',
      '........',
      '......y.',
      '.....yyy',
      '......y.',
    ],
  ]),
  pencil: defineSprite([
    [
      '......vv',
      '.....vvv',
      '....vvv.',
      '...vvv..',
      '..vvv...',
      '.yvv....',
      '.yy.....',
      'k.......',
    ],
  ]),
} as const
