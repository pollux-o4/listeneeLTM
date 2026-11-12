import { icons, PixelSprite, stageIcons } from '../../design/index.ts'
import type { SectionKey } from '../../generated/SectionKey.ts'
import type { StageStatus } from '../../generated/StageStatus.ts'
import './status.css'

/** 단계 → 상징 그림. 무엇을 정하는 단계인지 모양으로 알린다. */
const STAGE_ICON: Record<SectionKey, (typeof stageIcons)[keyof typeof stageIcons]> = {
  purpose: stageIcons.target,
  scopeIn: stageIcons.signIn,
  scopeOut: stageIcons.signOut,
  constraints: stageIcons.lock,
  acceptance: stageIcons.flag,
}

/**
 * 단계 상징. 막힘은 꺼짐(흑백), 확인 전은 반쯤 켜짐, 완료는 제 색으로 켜진다(게임의 잠긴/진행/깬 칸).
 * 색만으로 구분하지 않도록 상태는 StatusMark가 모양으로 함께 알린다(UX-001 시각 단서).
 */
export function StageIcon({
  section,
  status,
  scale = 1,
}: {
  section: SectionKey
  status: StageStatus
  scale?: number
}) {
  return (
    <span className="stage-icon" data-status={status}>
      <PixelSprite sprite={STAGE_ICON[section]} scale={scale} />
    </span>
  )
}

/** 단계 상태 표식의 모양 원본. 확인 전은 개수, 완료는 체크. 색은 CSS의 `data-status`가 맡는다. */
const GLYPH: Record<'fork' | 'empty', string> = { fork: '?', empty: '!' }

/** 상징 모서리의 상태 표식. */
export function StatusMark({ status, unconfirmed }: { status: StageStatus; unconfirmed: number }) {
  return (
    <span className="status-mark" data-status={status}>
      {status === 'clear' ? (
        <PixelSprite sprite={icons.check} scale={2 / 3} tint="currentColor" />
      ) : status === 'review' ? (
        unconfirmed
      ) : (
        GLYPH[status]
      )}
    </span>
  )
}
