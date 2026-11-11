import { icons, PixelSprite } from '../../design/index.ts'
import type { StageStatus } from '../../generated/StageStatus.ts'

/** 단계 상태의 표시 원본: 모양(글리프)과 글자(이름). 색은 CSS의 `data-status`가 맡는다(UX-001 시각 단서). */
const GLYPH: Record<Exclude<StageStatus, 'clear'>, string> = { fork: '?', empty: '!', review: '○' }

/** 글자 한 칸 크기(1em)의 상태 글리프. 완료 표시는 픽셀 글꼴에 없어 도트 그림으로 그린다. */
export function StatusGlyph({ status }: { status: StageStatus }) {
  if (status === 'clear') return <PixelSprite sprite={icons.check} scale={1} tint="currentColor" />
  return <>{GLYPH[status]}</>
}
