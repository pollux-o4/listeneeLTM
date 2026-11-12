import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { useLocale } from '../../copy/index.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'
import { appears, mockClipboard, storyCopy } from '../../story-support.ts'
import { BriefWorkspace } from './BriefWorkspace.tsx'
import {
  askedView,
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
/** 줄 도구의 이름은 '동작: 항목 글'이라 동작 이름으로 시작하는 버튼을 찾는다. */
const rowAction = (action: string) => new RegExp(`^${action}:`)
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

/** 확인 패치만 흉내 내 뷰에 반영한다(스토리 전용): 항목·단계 확인 → confirmed, 남은 게 없으면 권고 해제. */
function confirmIn(view: WorkspaceView, p: BriefPatch): WorkspaceView {
  const hit = (section: string, id: string) =>
    (p.op === 'confirmItem' && p.id === id) || (p.op === 'confirmSection' && p.section === section)
  const sections = Object.fromEntries(
    Object.entries(view.brief.sections).map(([section, items]) => [
      section,
      (items ?? []).map((i) => (hit(section, i.id) ? { ...i, confirmed: true } : i)),
    ]),
  )
  const issues = view.issues.filter(
    (i) => i.kind !== 'review' || (sections[i.section] ?? []).some((it) => !it.confirmed),
  )
  return { ...view, brief: { ...view.brief, sections }, issues }
}

/** 전달 단계: 확인 전 AI 항목을 단계별로 펼쳐 그 자리에서 확인한다. 다 확인한 묶음은 '확인함'으로 남는다. */
export const ReviewInDelivery: Story = {
  args: { view: reviewView },
  render: function ReviewInDeliveryStory(args) {
    const { locale } = useLocale()
    const [view, setView] = useState(() => localizedFixture(args.view, locale))
    return (
      <BriefWorkspace
        {...args}
        view={view}
        onPatch={async (p) => {
          setView((v) => confirmIn(v, p))
          return true
        }}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: new RegExp(`^${copy.brief.path.delivery}`) }),
    )
    const head = () => canvasElement.querySelector<HTMLElement>('.rg-head') ?? undefined
    await appears(head)
    const group = head()
    if (!group) throw new Error('Missing review group')
    await userEvent.click(group)
    const body = () => canvasElement.querySelector<HTMLElement>('.rg-body') ?? undefined
    await appears(body)
    for (const like of within(body() as HTMLElement).getAllByTitle(copy.brief.item.confirm)) {
      await userEvent.click(like)
    }
    await appears(async () => within(group).getByText(copy.brief.delivery.reviewed))
  },
}

export const Copied: Story = {
  args: { view: doneView },
  beforeEach: mockClipboard(),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.delivery.copy }))
    await appears(async () => await canvas.findByText(copy.brief.delivery.copied))
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
    // 길어진 초안 안에서도 붙어 있는 막대의 접기로 닫는다.
    const paper = canvas.getByLabelText(copy.brief.paper.label)
    await userEvent.click(
      within(paper).getByRole('button', { name: copy.brief.workspace.hideDraft }),
    )
  },
}

/** 펼친 초안의 복사: 결과가 그 자리에서 알려진다. */
export const PaperCopied: Story = {
  args: { view: doneView },
  beforeEach: mockClipboard(),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.workspace.showDraft }))
    const paper = await canvas.findByLabelText(copy.brief.paper.label)
    await userEvent.click(within(paper).getByRole('button', { name: copy.brief.paper.copy }))
    await appears(async () => within(paper).getAllByText(copy.brief.copyResult.copied).at(-1))
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
    const [more] = await canvas.findAllByRole('button', { name: rowAction(copy.brief.item.more) })
    if (!more) throw new Error('Missing detail toggle')
    await userEvent.click(more)
    await appears(
      async () => canvas.getAllByRole('button', { name: rowAction(copy.brief.item.less) })[0],
    )
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
    await appears(
      async () => canvas.getAllByRole('button', { name: rowAction(copy.brief.item.less) })[0],
    )
    await userEvent.click(canvas.getByRole('button', { name: copy.brief.stage.hideDetails }))
    await waitFor(() => expect(canvasElement.querySelectorAll('.ir-detail').length).toBe(0))
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

/** AI에게 남긴 요청: 쌓인 요청 띠(할 말 복사·사진 안내)와 자리가 사라진 답. */
export const Requests: Story = {
  args: { view: askedView },
  beforeEach: () => {
    localStorage.removeItem(`ltm.copied-requests.${askedView.brief.id}`)
    return mockClipboard()()
  },
  play: async ({ canvasElement }) => {
    const copy = storyCopy().brief.request
    const canvas = within(canvasElement)
    await appears(async () => canvas.getByTitle(copy.photoHint))
    await expect(canvas.getByText(copy.uncopied(1))).toBeVisible()
    await expect(canvas.getByText(copy.acknowledged, { exact: false })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: copy.copyAll }))
    await appears(async () => canvas.getByRole('button', { name: copy.copied }))
    await expect(canvas.getByText(copy.paste)).toBeVisible()
    await expect(canvas.getByText(copy.pasteStep)).toBeVisible()
  },
}

/** 항목 아래 보낸 요청과, 그 자리에서 AI에게 묻기. */
export const RequestOnItem: Story = {
  ...stageStory(askedView, 1),
  play: async ({ canvasElement }) => {
    const copy = storyCopy().brief.request
    const canvas = within(canvasElement)
    const item = askedView.brief.sections.scopeIn?.[0]?.text ?? ''
    await userEvent.click(canvas.getByRole('button', { name: copy.askLabel(item) }))
    await appears(async () => canvas.getByRole('textbox', { name: copy.inputLabel }))
    await expect(canvas.getByRole('textbox', { name: copy.inputLabel })).toHaveAttribute(
      'placeholder',
      copy.placeholder,
    )
    await expect(canvas.getByRole('button', { name: new RegExp(copy.leave) })).toBeVisible()
    await expect(canvas.getAllByText(copy.state.working).length).toBeGreaterThan(0)
    await expect(canvas.getAllByText(copy.state.noted).length).toBeGreaterThan(0)
  },
}

/** 갈림길에 남긴 요청에 AI가 답함: 답과 물은 것이 그 자리에 보이고 닫을 수 있다. */
export const RequestReplied: Story = {
  ...stageStory(askedView, 3),
  play: async ({ canvasElement }) => {
    const copy = storyCopy().brief.request
    const canvas = within(canvasElement)
    const asked = askedView.brief.requests.find((r) => r.target.kind === 'decision')?.text ?? ''
    await appears(async () => canvas.getAllByText(copy.state.replied)[0])
    await expect(canvas.getByRole('button', { name: `${copy.dismiss}: ${asked}` })).toBeVisible()
    // 확인은 선택: 누르면 흔적이 한 줄로 접힌다(스토리는 저장 대역이라 누르기만 확인한다).
    await userEvent.click(canvas.getByRole('button', { name: `${copy.acknowledge}: ${asked}` }))
  },
}

/** 쌓인 요청을 이미 복사함: 단추는 차분해지고, AI가 맡기를 기다리는 수와 처리 중인 수가 보인다. */
export const RequestsCopied: Story = {
  args: { view: askedView },
  beforeEach: () => {
    const open = askedView.brief.requests.filter((r) => !r.taken).map((r) => r.id)
    localStorage.setItem(`ltm.copied-requests.${askedView.brief.id}`, JSON.stringify(open))
    return () => localStorage.removeItem(`ltm.copied-requests.${askedView.brief.id}`)
  },
  play: async ({ canvasElement }) => {
    const copy = storyCopy().brief.request
    const c = within(canvasElement)
    await appears(async () => c.getByText(copy.waiting(1)))
    await expect(c.getByText(copy.working(1))).toBeVisible()
  },
}
