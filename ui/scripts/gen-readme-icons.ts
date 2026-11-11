// README용 도트 SVG 아이콘 생성. 색은 tokens.css, 마스코트·상자·반짝임은 제품 스프라이트를 그대로 쓴다.
// 실행: pnpm gen:readme-icons → docs/assets/icons/*.svg
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SPRITE_COLORS, type SpriteColor } from '../src/design/palette.ts'
import { chest } from '../src/design/sprites/chest.ts'
import { defineSprite, type Sprite } from '../src/design/sprites/define.ts'
import { icons } from '../src/design/sprites/icons.ts'
import { listenee } from '../src/design/sprites/listenee.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const tokens = readFileSync(join(root, 'ui/src/design/tokens.css'), 'utf8')
const hex = (name: string) => {
  const m = tokens.match(new RegExp(`--p-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m?.[1]) throw new Error(`token --p-${name} not found`)
  return m[1]
}
// 'o'(선)는 테마에 따라 바뀌는 색이라 밝은·어두운 값을 따로 둔다(--c-line과 같은 짝).
const LINE = { light: hex('ink'), dark: hex('mist') }
const fill = (ch: SpriteColor) => {
  const m = SPRITE_COLORS[ch].match(/--p-([a-z]+)/)
  return m?.[1] ? hex(m[1]) : LINE.light
}

/** README 전용 그림(제품 UI에는 쓰지 않는다). */
const readme = {
  map: defineSprite([
    [
      '..........o...',
      '..........oyy.',
      '..........oyyy',
      '..........o...',
      '..........o...',
      '..........o...',
      'oooo.....oooo.',
      'omvo.....ohho.',
      'ommokk.k.ohho.',
      'oooo.....oooo.',
    ],
  ]),
  collab: defineSprite([
    [
      'ooooooo.......',
      'ohhhhho.......',
      'ohkkkho.......',
      'ohhhhho.......',
      'oohoooo.oooooo',
      '.oo....oyyyyyo',
      '.......oykkkyo',
      '.......oyyyyyo',
      '.......ooooyoo',
      '..........oo..',
    ],
  ]),
  note: defineSprite([
    [
      '.oooooooo.',
      'oyhhhhhhho',
      'oyhkkkkkho',
      'oyhhhhhhho',
      'oyhkkkkhho',
      'oyhhhhhhho',
      'oyhkkkkkho',
      'oyhhhhhhho',
      'oyhhhhvvho',
      '.oooooooo.',
    ],
  ]),
  plug: defineSprite([
    [
      '...o..o...',
      '...o..o...',
      '.oooooooo.',
      '.ossssssso',
      '.ossssssso',
      '..osssso..',
      '...osso...',
      '....oo....',
      '....oo....',
      '...oo.....',
    ],
  ]),
  window: defineSprite([
    [
      'oooooooooooo',
      'ovvvvvvvryho',
      'oooooooooooo',
      'ohhhhhhhhhho',
      'ohmmhkkkkkho',
      'ohmmhhhhhhho',
      'ohhhhkkkkhho',
      'ohyyhhhhhhho',
      'ohyyhkkkkkho',
      'oooooooooooo',
    ],
  ]),
  flow: defineSprite([
    ['oooo......oooo', 'occo...k..ohho', 'occokkkkk.ommo', 'occo...k..ohho', 'oooo......oooo'],
  ]),
  play: defineSprite([
    [
      'oooooooooo',
      'ohhhhhhhho',
      'ohmmhhhhho',
      'ohmmmmhhho',
      'ohmmmmmmho',
      'ohmmmmmmho',
      'ohmmmmhhho',
      'ohmmhhhhho',
      'ohhhhhhhho',
      'oooooooooo',
    ],
  ]),
  blocks: defineSprite([
    [
      '...oooooo...',
      '...ovvvvo...',
      '...oooooo...',
      '.....oo.....',
      'oooooooooooo',
      'osssoocccoyo',
      'oooooooooooo',
      '.....oo.....',
      '..oooooooo..',
      '..ommmmmmo..',
      '..oooooooo..',
    ],
  ]),
  book: defineSprite([
    [
      '.oooo..oooo.',
      'ohhhho.ohhho',
      'ohkkhooohkko',
      'ohhhhovohhho',
      'ohkkhovohkko',
      'ohhhhovohhho',
      'ohkkhovohkko',
      'ohhhhovohhho',
      'oooooovooooo',
      '......o.....',
    ],
  ]),
  flask: defineSprite([
    [
      '...oooo...',
      '....oo....',
      '....oo....',
      '...ohho...',
      '..ohhhho..',
      '.ohhhhhho.',
      '.ommmmmmo.',
      'ommymmmmmo',
      'ommmmmymmo',
      '.oooooooo.',
    ],
  ]),
} as const

const out: Record<string, Sprite> = {
  logo: listenee.happy,
  spark: icons.spark,
  chest: chest.closed,
  ...readme,
}

function toSvg(sprite: Sprite, px: number, title: string): string {
  const frame = sprite.frames[0] ?? []
  const rects: string[] = []
  frame.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x] as SpriteColor | '.'
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      if (ch !== '.') {
        const attr = ch === 'o' ? 'class="o"' : `fill="${fill(ch)}"`
        rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" ${attr}/>`)
      }
      x = end
    }
  })
  const { width: w, height: h } = sprite
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * px}" height="${h * px}" shape-rendering="crispEdges"><title>${title}</title><style>.o{fill:${LINE.light}}@media(prefers-color-scheme:dark){.o{fill:${LINE.dark}}}</style>${rects.join('')}</svg>\n`
}

const dir = join(root, 'docs/assets/icons')
mkdirSync(dir, { recursive: true })
for (const [name, sprite] of Object.entries(out)) {
  writeFileSync(join(dir, `${name}.svg`), toSvg(sprite, name === 'logo' ? 6 : 2, name))
}
console.log(`wrote ${Object.keys(out).length} icons → docs/assets/icons`)
