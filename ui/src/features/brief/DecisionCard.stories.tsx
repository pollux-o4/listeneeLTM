import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, userEvent, within } from 'storybook/test'
import type { Decision } from '../../generated/Decision.ts'
import { appears, storyCopy } from '../../story-support.ts'
import { DecisionCard } from './DecisionCard.tsx'
import { workingView } from './fixtures.ts'

const pick = (id: string) => workingView.brief.decisions.find((d) => d.id === id) as Decision
const derived = workingView.brief.sections.constraints?.find((i) => i.id === 'decision-image-host')

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
