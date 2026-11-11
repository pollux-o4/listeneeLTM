import type { Meta, StoryObj } from '@storybook/react-vite'
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
