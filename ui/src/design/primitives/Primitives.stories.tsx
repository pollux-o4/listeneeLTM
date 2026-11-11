import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { useText } from '../../copy/index.ts'
import { InlineEdit, useEditToggle } from './InlineEdit.tsx'
import { PixelButton, SpeechBubble } from './index.tsx'
import { Notice } from './Notice.tsx'
import { OriginBadge } from './OriginBadge.tsx'

const meta = { title: 'Design/Primitives' } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

/** 누가 썼는지와 확인 여부 */
export const Origins: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <OriginBadge by="ai" />
      <OriginBadge by="ai" confirmed={false} />
      <OriginBadge by="me" />
    </div>
  ),
}

/** 제자리 고치기: Enter 저장, Esc 취소, 닫히면 연 버튼으로 포커스가 돌아온다 */
export const Editing: Story = {
  render: () => {
    const copy = useText()
    const [value, setValue] = useState(copy.app.shell.name)
    const { editing, start, stop, trigger } = useEditToggle()
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {editing ? (
          <InlineEdit
            value={value}
            label={copy.brief.item.editLabel}
            onSave={setValue}
            onClose={stop}
          />
        ) : (
          <span>{value}</span>
        )}
        <PixelButton ref={trigger} onClick={start}>
          {copy.brief.item.edit}
        </PixelButton>
      </div>
    )
  },
}

/** 화면을 막지 않는 알림: 저장 실패와 다시 시도 */
export const SaveFailed: Story = {
  render: () => {
    const copy = useText()
    return (
      <Notice
        notice={{
          text: copy.app.notice.offlineSave,
          action: { label: copy.app.notice.retry, run: () => undefined },
        }}
        onClose={() => undefined}
      />
    )
  },
}

export const Bubble: Story = {
  render: () => {
    const copy = useText()
    return <SpeechBubble text={copy.brief.narration.initial} />
  },
}
