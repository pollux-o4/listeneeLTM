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
  /** 12×12, 2px 칸(scale 2/3)으로 쓰면 정수 픽셀에 맞는다. 톱니 8개·팔각 구멍. */
  gear: defineSprite([
    [
      '.....mm.....',
      '.mm.mmmm.mm.',
      '.mmmmmmmmmm.',
      '..mmmmmmmm..',
      '.mmmm..mmmm.',
      'mmmm....mmmm',
      'mmmm....mmmm',
      '.mmmm..mmmm.',
      '..mmmmmmmm..',
      '.mmmmmmmmmm.',
      '.mm.mmmm.mm.',
      '.....mm.....',
    ],
  ]),
  /** 펼치기(아래). 끝이 한 칸으로 뾰족해 잘린 듯 보이지 않게 7칸 폭. 펼친 상태는 CSS로 뒤집는다. */
  chevron: defineSprite([
    ['.......', '.......', 'mm...mm', '.mm.mm.', '..mmm..', '...m...', '.......'],
  ]),
  /** 모두 펼치기 */
  expandAll: defineSprite([
    ['mm...mm', '.mm.mm.', '..mmm..', '...m...', 'mm...mm', '.mm.mm.', '..mmm..', '...m...'],
  ]),
  /** 모두 접기 */
  collapseAll: defineSprite([
    ['...m...', '..mmm..', '.mm.mm.', 'mm...mm', '...m...', '..mmm..', '.mm.mm.', 'mm...mm'],
  ]),
  /** 되돌리기 */
  undo: defineSprite([
    [
      '..m.....',
      '.mm.....',
      'mmmmmm..',
      '.mm...m.',
      '..m....m',
      '.......m',
      '......m.',
      '..mmmm..',
    ],
  ]),
  /** 빼기·닫기 */
  /** AI에게 묻기: 말풍선. */
  ask: defineSprite([
    [
      '........',
      '.mmmmmm.',
      'm......m',
      'm.m.m.mm',
      'm......m',
      '.mmmmmm.',
      '.mm.....',
      '.m......',
    ],
  ]),
  /** 사진 찍기 안내. */
  camera: defineSprite([
    [
      '........',
      '..mm....',
      'mmmmmmmm',
      'm..mm..m',
      'm.m..m.m',
      'm..mm..m',
      'mmmmmmmm',
      '........',
    ],
  ]),
  cross: defineSprite([
    [
      '........',
      '.m....m.',
      '..m..m..',
      '...mm...',
      '...mm...',
      '..m..m..',
      '.m....m.',
      '........',
    ],
  ]),
  /** 좋아요(확인). 펼치기 화살표(∨)와 모양이 겹치지 않게 체크 대신 하트. */
  heart: defineSprite([
    [
      '........',
      '.mm..mm.',
      'mmmmmmmm',
      'mmmmmmmm',
      'mmmmmmmm',
      '.mmmmmm.',
      '..mmmm..',
      '...mm...',
    ],
  ]),
  /** 아직 좋아요 전: 빈 하트. 채운 하트(heart)는 누른 뒤에만 보인다. */
  heartEmpty: defineSprite([
    [
      '........',
      '.mm..mm.',
      'm..mm..m',
      'm......m',
      'm......m',
      '.m....m.',
      '..m..m..',
      '...mm...',
    ],
  ]),
} as const
