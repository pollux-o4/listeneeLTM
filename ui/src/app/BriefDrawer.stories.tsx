import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { doneView, reviewView, summaryOf, workingView } from '../features/brief/fixtures.ts'
import { storyCopy } from '../story-support.ts'
import { BriefDrawer } from './BriefDrawer.tsx'
import './app.css'

const briefs = [
  summaryOf(doneView, { kind: 'learned', count: 3 }),
  {
    ...summaryOf(reviewView, { kind: 'stale', count: 1 }),
    id: 'gallery-review',
    title: 'Gallery v2',
  },
  {
    ...summaryOf(workingView),
    id: 'gallery-2',
    title: 'Gallery v3',
    derivedFrom: doneView.brief.id,
  },
  { ...summaryOf(reviewView, { kind: 'nothingNew' }), id: 'landing', title: 'Landing page' },
]

const meta = {
  title: 'App/BriefDrawer',
  component: BriefDrawer,
  args: { briefs, briefId: doneView.brief.id, onClose: fn(), onDuplicate: fn() },
} satisfies Meta<typeof BriefDrawer>
export default meta

type Story = StoryObj<typeof meta>
export const Mixed: Story = {}

/** 미분석·다시 분석만 거르고, 복제·Esc가 호출 측에 전달된다. */
export const FilterAndDuplicate: Story = {
  play: async ({ canvasElement, args }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: `${copy.app.drawer.filterTodo} 2` }))
    await expect(canvas.getAllByRole('listitem')).toHaveLength(2)
    const target = briefs[1]
    if (!target) throw new Error('Missing fixture brief')
    await userEvent.click(
      canvas.getByRole('button', { name: copy.app.drawer.duplicateLabel(target.title) }),
    )
    await expect(args.onDuplicate).toHaveBeenCalledWith(target)
    await userEvent.keyboard('{Escape}')
    await expect(args.onClose).toHaveBeenCalled()
  },
}

export const NothingToAnalyze: Story = {
  args: { briefs: [summaryOf(doneView, { kind: 'learned', count: 3 })] },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: `${copy.app.drawer.filterTodo} 0` }))
    await expect(canvas.getByText(copy.app.drawer.nothingTodo)).toBeVisible()
  },
}
