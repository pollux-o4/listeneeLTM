import { defineSprite } from './define.ts'

/** 10×10 단계 상징. 글을 읽지 않아도 무엇을 정하는 단계인지 보이게 한다(포함·제외는 O·X 짝). */
export const stageIcons = {
  /** 과녁: 무엇을 이루려는가 */
  target: defineSprite([
    [
      '..oooooo..',
      '.orrrrrro.',
      'orrhhhhrro',
      'orhhrrhhro',
      'orhryyrhro',
      'orhryyrhro',
      'orhhrrhhro',
      'orrhhhhrro',
      '.orrrrrro.',
      '..oooooo..',
    ],
  ]),
  /** 굵은 O: 이번에 한다(포함). OX 퀴즈처럼 읽힌다. */
  signIn: defineSprite([
    [
      '...oooo...',
      '..ommmmo..',
      '.ommoommo.',
      'ommo..ommo',
      'omo....omo',
      'omo....omo',
      'ommo..ommo',
      '.ommoommo.',
      '..ommmmo..',
      '...oooo...',
    ],
  ]),
  /** 굵은 X: 이번엔 안 한다(제외). O와 짝. */
  signOut: defineSprite([
    [
      'oo......oo',
      'orro..orro',
      'orrroorrro',
      '.orrrrrro.',
      '..orrrro..',
      '..orrrro..',
      '.orrrrrro.',
      'orrroorrro',
      'orro..orro',
      'oo......oo',
    ],
  ]),
  /** 자물쇠: 지켜야 할 제약 */
  lock: defineSprite([
    [
      '...ssss...',
      '..s....s..',
      '..s....s..',
      '.oooooooo.',
      '.oyyyyyyo.',
      '.oyyooyyo.',
      '.oyyooyyo.',
      '.oyyyoyyo.',
      '.oyyyyyyo.',
      '.oooooooo.',
    ],
  ]),
  /** 결승 깃발: 끝났다고 판단하는 기준 */
  flag: defineSprite([
    [
      '..o.......',
      '..okhkhkh.',
      '..ohkhkhk.',
      '..okhkhkh.',
      '..ohkhkhk.',
      '..o.......',
      '..o.......',
      '..o.......',
      '..o.......',
      '.ooo......',
    ],
  ]),
} as const
