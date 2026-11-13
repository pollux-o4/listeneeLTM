import { useEffect, useMemo, useState } from 'react'
import { SPRITE_COLORS, type SpriteColor } from '../foundations/palette.ts'
import type { Sprite } from '../sprites/define.ts'
import { useReducedMotion } from './useReducedMotion.ts'

type Props = {
  sprite: Sprite
  /** 도트 하나의 화면 크기(px 단위 배수) */
  scale?: number
  fps?: number
  /** 한 색으로 칠하기(아이콘 상태색 등) */
  tint?: string
  label?: string
  className?: string
}

type Run = { x: number; y: number; w: number; color: SpriteColor }

/** 같은 색이 이어진 가로 구간을 하나의 rect로 합쳐 DOM을 줄인다. */
function toRuns(frame: readonly string[]): Run[] {
  const runs: Run[] = []
  frame.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x] as SpriteColor | '.'
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      if (ch !== '.') runs.push({ x, y, w: end - x, color: ch })
      x = end
    }
  })
  return runs
}

export function PixelSprite({ sprite, scale = 4, fps = 4, tint, label, className }: Props) {
  const frames = useMemo(() => sprite.frames.map(toRuns), [sprite])
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    setIndex(0)
    if (frames.length < 2 || reduced) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % frames.length), 1000 / fps)
    return () => clearInterval(timer)
  }, [frames, fps, reduced])

  const size = `calc(var(--px) * ${scale})`
  return (
    <svg
      className={className}
      viewBox={`0 0 ${sprite.width} ${sprite.height}`}
      width={`calc(${size} * ${sprite.width})`}
      height={`calc(${size} * ${sprite.height})`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        width: `calc(${size} * ${sprite.width})`,
        height: `calc(${size} * ${sprite.height})`,
      }}
    >
      {(frames[index] ?? []).map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          fill={tint ?? SPRITE_COLORS[r.color]}
        />
      ))}
    </svg>
  )
}
