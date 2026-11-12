import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { Decision } from '../../../../generated/Decision.ts'
import { appears, storyCopy } from '../../../../story-support.ts'
import { doneView, workingView } from '../../fixtures.ts'
import { DecisionCard } from './DecisionCard.tsx'

const pick = (id: string) => workingView.brief.decisions.find((d) => d.id === id) as Decision
const derived = workingView.brief.sections.constraints?.find(
  (i) => i.id === workingView.decisionItems['image-host'],
)

const meta = {
  title: 'Brief/DecisionCard',
  component: DecisionCard,
  args: { onPatch: fn(async () => true) },
} satisfies Meta<typeof DecisionCard>
export default meta

type Story = StoryObj<typeof meta>
/** 열린 갈림길: 선택지·추천·이유 */
export const Open: Story = { args: { decision: pick('done-bar') } }
/** AI가 추천대로 정해 둠: 확인하거나 바꾸기 */
export const DecidedByAi: Story = { args: { decision: pick('image-host'), derived } }

const zoom = pick('zoom')
const waiting = {
  question: zoom.question,
  labels: zoom.options.filter((o) => o.id === 'yes').map((o) => o.label),
}

/** 잠든 갈림길: 앞 갈림길에서 고를 것을 기다린다. 흐리고 잠겨 고를 수 없다. */
export const Waiting: Story = {
  args: { decision: pick('zoom-open'), waiting },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await appears(async () =>
      canvas.getByText(copy.brief.decision.waiting(waiting.question, waiting.labels)),
    )
    await expect(canvas.queryAllByRole('button')).toHaveLength(0)
  },
}

const zoomOpen = pick('zoom-open')
const effects = { yes: { sleeps: [], wakes: [zoomOpen.question] } }

/** 다른 갈림길을 여는 선택지는 고르기 전에 영향을 보이고, 고른 뒤에는 그 자리에 알림과 되돌리기가 남는다. */
export const WithImpact: Story = {
  args: { decision: zoom, effects, onUndo: fn() },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const preview = copy.brief.decision.wakes(zoomOpen.question)
    await appears(async () => canvas.getByText(preview, { exact: false }))
    const yes = zoom.options.find((o) => o.id === 'yes')?.label ?? ''
    await userEvent.click(canvas.getByText(yes))
    await appears(async () => canvas.getByRole('status'))
    await expect(canvas.getByRole('status')).toHaveTextContent(preview)
    await expect(canvas.getByRole('button', { name: copy.brief.decision.undo })).toBeVisible()
  },
}

const doneZoom = doneView.brief.decisions.find((d) => d.id === 'zoom') as Decision
const doneOpen = doneView.brief.decisions.find((d) => d.id === 'zoom-open') as Decision
const dropped = doneOpen.options.find((o) => o.id === doneOpen.chosen)?.label ?? ''

/** 정한 답이 있는 갈림길을 잠그는 선택지: 바꾸려고 펼치면 무엇이 빠지는지 미리 보인다. */
export const ChangingLocksAnother: Story = {
  args: {
    decision: doneZoom,
    effects: { later: { sleeps: [{ question: doneOpen.question, dropped }], wakes: [] } },
  },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: copy.brief.decision.changeLabel(doneZoom.question) }),
    )
    await appears(async () =>
      canvas.getByText(copy.brief.decision.sleeps(doneOpen.question, dropped), { exact: false }),
    )
  },
}

export const Changing: Story = {
  args: { decision: pick('image-host'), derived },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', {
        name: copy.brief.decision.changeLabel(pick('image-host').question),
      }),
    )
    await appears(async () => canvas.getByRole('button', { name: copy.brief.decision.keep }))
  },
}
