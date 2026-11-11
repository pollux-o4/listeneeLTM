import { PixelSprite } from '../primitives/index.tsx'
import { type ListeneeMood, listenee } from '../sprites/listenee.ts'

const LABEL: Record<ListeneeMood, string> = {
  idle: '리스니가 기다리는 중',
  listening: '리스니가 듣는 중',
  thinking: '리스니가 생각하는 중',
  happy: '리스니가 기뻐함',
}

export function Mascot({ mood, scale = 4 }: { mood: ListeneeMood; scale?: number }) {
  return (
    <div className="px-float" style={{ display: 'inline-block' }}>
      <PixelSprite
        sprite={listenee[mood]}
        scale={scale}
        fps={mood === 'listening' ? 3 : 2}
        label={LABEL[mood]}
      />
    </div>
  )
}
