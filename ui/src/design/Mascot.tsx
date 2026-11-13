import { useText } from '../copy/index.ts'
import { PixelSprite } from './primitives/index.tsx'
import { type ListeneeMood, listenee } from './sprites/listenee.ts'

/** 마스코트 '리스니'. 상태(mood)는 화면의 진행 상황을 그대로 반영한다. */
export function Mascot({ mood, scale = 4 }: { mood: ListeneeMood; scale?: number }) {
  const text = useText().common
  return (
    <span className="ltm-float">
      <PixelSprite
        sprite={listenee[mood]}
        scale={scale}
        fps={mood === 'listening' ? 3 : 2}
        label={text.mascot[mood]}
      />
    </span>
  )
}
