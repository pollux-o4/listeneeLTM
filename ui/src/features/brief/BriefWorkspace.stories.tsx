import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn, userEvent, within } from 'storybook/test'
import { useLocale } from '../../copy/index.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'
import { appears, mockClipboard, storyCopy } from '../../story-support.ts'
import { BriefWorkspace } from './BriefWorkspace.tsx'
import {
  doneView,
  emptyView,
  localizedFixture,
  reviewView,
  startedView,
  workingView,
} from './fixtures.ts'
import { StageDetail } from './StageDetail.tsx'

const meta = {
  title: 'Brief/Workspace',
  component: BriefWorkspace,
  render: function WorkspaceStory(args) {
    const { locale } = useLocale()
    return <BriefWorkspace {...args} view={localizedFixture(args.view, locale)} />
  },
  parameters: { layout: 'padded' },
  args: { onPatch: fn(async () => true), onUndo: fn() },
} satisfies Meta<typeof BriefWorkspace>
export default meta

type Story = StoryObj<typeof meta>
/** 갈림길 2개 열림, AI가 정한 것 1개, 확인 전 항목들 */
export const Working: Story = { args: { view: workingView } }
/** 모든 단계 통과, 상자 열림 */
export const Done: Story = { args: { view: doneView } }
/** 막 만든 지시서 */
export const Empty: Story = { args: { view: emptyView } }

/** 기존 fixture에 패치를 적용해 코어가 판정한 상태. */
export const Started: Story = { args: { view: startedView } }
export const Review: Story = { args: { view: reviewView } }

/** 한 단계의 상태를 직접 렌더해 이동 중의 다른 화면에 연결되지 않게 한다. */
function stageStory(view: WorkspaceView, index: number): Story {
  const stage = view.stages[index]
  if (!stage) throw new Error('Missing fixture stage')
  return {
    args: { view },
    render: (args) => (
      <StageDetail
        brief={view.brief}
        stage={stage}
        index={index}
        total={view.stages.length}
        onMove={fn()}
        onPatch={args.onPatch}
      />
    ),
  }
}
export const ReviewStage: Story = stageStory(reviewView, 1)
export const OptionalEmpty: Story = stageStory(emptyView, 2)
export const Constraints: Story = stageStory(workingView, 3)
export const Acceptance: Story = stageStory(workingView, 4)

export const EditTitle: Story = {
  args: { view: workingView },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.workspace.editTitle }))
    await appears(async () =>
      canvas.getByRole('textbox', { name: copy.brief.workspace.editTitleLabel }),
    )
  },
}

export const EditItem: Story = {
  args: { view: workingView },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const item = workingView.brief.sections.scopeIn?.find(
      (item) => !item.id.startsWith('decision-'),
    )
    if (!item) throw new Error('Missing editable fixture item')
    await userEvent.click(
      canvas.getByRole('button', { name: copy.brief.item.editAction(item.text) }),
    )
    await appears(async () => canvas.getByRole('textbox', { name: copy.brief.item.editLabel }))
  },
}

export const AddItem: Story = {
  args: { view: emptyView },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.type(
      canvas.getByRole('textbox', {
        name: copy.brief.stage.inputLabel(copy.brief.stage.purpose.label),
      }),
      workingView.brief.title,
    )
    await appears(async () => canvas.getByRole('button', { name: copy.brief.stage.add }))
  },
}

export const BlockedDelivery: Story = {
  args: { view: workingView },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.path.blocked }))
    await appears(
      async () => canvas.getAllByRole('button', { name: copy.brief.delivery.copyDraft })[0],
    )
  },
}

export const Copied: Story = {
  args: { view: doneView },
  beforeEach: mockClipboard(),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.delivery.copy }))
    await appears(async () => await canvas.findByText(copy.brief.copyResult.copied))
  },
}

export const CopyFailed: Story = {
  ...Copied,
  beforeEach: mockClipboard(true),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.delivery.copy }))
    await appears(async () => await canvas.findByText(copy.brief.copyResult.failed))
  },
}

/** 초안은 기본 숨김. 토글로 펼쳤다 접는다. */
export const DraftToggle: Story = {
  args: { view: workingView },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole('button', { name: copy.brief.workspace.showDraft })
    if (canvas.queryByLabelText(copy.brief.paper.label)) throw new Error('Draft should be hidden')
    await userEvent.click(toggle)
    await appears(async () => canvas.getByLabelText(copy.brief.paper.label))
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.workspace.hideDraft }))
  },
}

export const DraftOpen: Story = {
  args: { view: doneView },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.workspace.showDraft }))
    await appears(async () => canvas.getByLabelText(copy.brief.paper.label))
  },
}

/** 제목 한 줄 + '자세히'(펼쳐야 보임). 펼치기 전에는 풀이가 보이지 않는다. */
export const ItemDetail: Story = {
  ...stageStory(reviewView, 0),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const more = await canvas.findByRole('button', { name: copy.brief.item.more })
    await userEvent.click(more)
    await appears(async () => canvas.getByRole('button', { name: copy.brief.item.less }))
  },
}

/** 이 단계의 '자세히 모두 보기'가 항목 목록 바로 위에 있고, 누르면 모든 항목이 펼쳐진다. */
export const DetailsAll: Story = {
  args: { view: reviewView },
  render: function DetailsAllStory(args) {
    const [all, setAll] = useState(false)
    const stage = reviewView.stages[0]
    if (!stage) throw new Error('Missing fixture stage')
    return (
      <StageDetail
        brief={reviewView.brief}
        stage={stage}
        index={0}
        total={reviewView.stages.length}
        expandAll={all}
        onToggleAll={() => setAll((v) => !v)}
        onMove={fn()}
        onPatch={args.onPatch}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: copy.brief.stage.showDetails }))
    await appears(async () => canvas.getByRole('button', { name: copy.brief.item.less }))
  },
}

/** 되돌리기가 항목 목록 곁에도 있어, 방금 한 행동(모두 좋아요 등)을 그 자리에서 되돌린다. */
export const UndoNearItems: Story = {
  args: { view: reviewView },
  render: function UndoNearItemsStory() {
    const stage = reviewView.stages[0]
    if (!stage) throw new Error('Missing fixture stage')
    const onUndo = fn()
    return (
      <StageDetail
        brief={reviewView.brief}
        stage={stage}
        index={0}
        total={reviewView.stages.length}
        onUndo={onUndo}
        onMove={fn()}
        onPatch={async () => true}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: copy.brief.workspace.undo }))
  },
}

/** 설명·기술이 비어 있어도 칸은 남고 '없음'으로 보인다(사람이 쓴 항목·옛 항목). */
export const DetailEmpty: Story = {
  args: { view: reviewView },
  render: function DetailEmptyStory(args) {
    const stage = reviewView.stages[0]
    if (!stage) throw new Error('Missing fixture stage')
    const sections = Object.fromEntries(
      Object.entries(reviewView.brief.sections).map(([key, items]) => [
        key,
        items?.map(({ detail: _detail, ...item }) => item),
      ]),
    )
    return (
      <StageDetail
        brief={{ ...reviewView.brief, sections }}
        stage={stage}
        index={0}
        total={reviewView.stages.length}
        expandAll
        onMove={fn()}
        onPatch={args.onPatch}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await appears(async () => canvas.getAllByText(copy.brief.item.none)[0])
  },
}
