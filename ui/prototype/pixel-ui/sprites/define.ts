import { SPRITE_COLORS } from '../foundations/palette.ts'

/** 도트 그림: 같은 크기의 프레임 목록. 각 프레임은 문자 격자, '.'은 투명. */
export type Sprite = {
  readonly width: number
  readonly height: number
  readonly frames: readonly (readonly string[])[]
}

/** 격자 크기·색 문자를 검증해 그림 데이터 오류를 정의 시점에 잡는다. */
export function defineSprite(frames: readonly (readonly string[])[]): Sprite {
  const first = frames[0]
  if (!first?.[0]) throw new Error('sprite needs at least one non-empty frame')
  const width = first[0].length
  const height = first.length
  for (const [i, frame] of frames.entries()) {
    if (frame.length !== height) throw new Error(`frame ${i}: height ${frame.length} != ${height}`)
    for (const [y, row] of frame.entries()) {
      if (row.length !== width)
        throw new Error(`frame ${i} row ${y}: width ${row.length} != ${width}`)
      for (const ch of row) {
        if (ch !== '.' && !(ch in SPRITE_COLORS))
          throw new Error(`frame ${i} row ${y}: unknown color '${ch}'`)
      }
    }
  }
  return { width, height, frames }
}

/** 기준 프레임의 일부 행만 바꾼 변형 프레임. */
export const variant = (base: readonly string[], rows: Record<number, string>) =>
  base.map((row, y) => rows[y] ?? row)
