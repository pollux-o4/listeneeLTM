import { useState } from 'react'
import { assemble, summarize } from '../../model/brief.ts'
import type { VariantProps } from '../../model/props.ts'
import { PixelButton, PixelPanel, SpeechBubble } from '../../primitives/index.tsx'
import { CopyBrief } from '../../shell/CopyBrief.tsx'
import type { ListeneeMood } from '../../sprites/listenee.ts'
import { BriefPaper } from './BriefPaper.tsx'
import { QuestPath } from './QuestPath.tsx'
import { StageDetail } from './StageDetail.tsx'
import { currentStage } from './stage.ts'
import './canon.css'

/**
 * 정본: B 여정 지도를 뼈대로
 * + A 작성자 표시·직접 추가/삭제·변경 기록·되돌리기·확인 전 개수
 * + C 실시간 지시서 미리보기(새 줄 강조)·남은 결정 추천대로 한 번에.
 * 미리보기는 A의 "전체 훑어보기"를 대신하며, 제목을 누르면 해당 단계로 간다.
 */
export function Canon({ state, dispatch }: VariantProps) {
  const sum = summarize(state)
  const n = state.sections.length
  const [open, setOpen] = useState(() => Math.min(currentStage(state), n - 1))
  const here = currentStage(state)
  const section = state.sections[open]

  const mood: ListeneeMood = sum.ready ? 'happy' : sum.pending.length ? 'thinking' : 'listening'
  const say = sum.ready
    ? sum.unconfirmed.length
      ? `완성! AI가 쓴 ${sum.unconfirmed.length}개는 한 번 확인해 주세요.`
      : '상자가 열렸어요. 완성된 지시서를 가져가세요.'
    : `"${state.sections[here]?.label}" 단계에서 기다리고 있어요. 남은 갈림길 ${sum.pending.length}개.`

  return (
    <div className="cn">
      <header className="cn-head">
        <h1 className="px-title">{state.title}</h1>
        <SpeechBubble key={say} text={say} />
        <div className="cn-row">
          <PixelButton onClick={() => dispatch({ type: 'undo' })} disabled={!state.history.length}>
            ↶ 되돌리기
          </PixelButton>
          <CopyBrief state={state} ready={sum.ready} />
        </div>
      </header>

      <div className="cn-map">
        <QuestPath state={state} open={open} onOpen={setOpen} ready={sum.ready} mood={mood} />
        {sum.pending.length > 1 && (
          <button
            type="button"
            className="cn-link cn-accept"
            onClick={() => dispatch({ type: 'acceptAll' })}
          >
            남은 갈림길 {sum.pending.length}개, 리스니 추천대로 →
          </button>
        )}
      </div>

      <div className="cn-body">
        {section && open < n ? (
          <StageDetail
            state={state}
            dispatch={dispatch}
            section={section}
            index={open}
            total={n}
            onMove={setOpen}
          />
        ) : (
          <PixelPanel enterIndex={0} tone="accent" className="cn-detail">
            <h2 className="px-title">{sum.ready ? '전달 준비 완료' : '아직 잠겨 있어요'}</h2>
            <p className="cn-why-text">
              {sum.ready
                ? '오른쪽 지시서를 복사해 AI나 사람에게 넘기면 돼요. 프로젝트에도 저장돼서 다음 작업이 이어받아요.'
                : `${[...sum.missing.map((s) => s.label), ...sum.pending.map((d) => d.question)].join(' · ')}`}
            </p>
            {sum.ready && <CopyBrief state={state} ready />}
          </PixelPanel>
        )}
        <BriefPaper
          text={assemble(state)}
          changes={state.changes}
          onLine={(label) => {
            const i = state.sections.findIndex((s) => s.label === label)
            if (i >= 0) setOpen(i)
          }}
        />
      </div>
    </div>
  )
}
