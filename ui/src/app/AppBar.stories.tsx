import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, userEvent, within } from 'storybook/test'
import { doneView, summaryOf, workingView } from '../features/brief/fixtures.ts'
import { AppBar } from './AppBar.tsx'
import './app.css'
import { storyCopy } from '../story-support.ts'
import { manyBriefs } from '../story-volume.ts'

const meta = {
  title: 'App/Navigation',
  component: AppBar,
  args: {
    briefs: [],
    briefId: undefined,
    route: { kind: 'brief' },
    pendingNotes: 2,
    theme: 'system',
    onTheme: fn(),
    drawerOpen: false,
    onToggleDrawer: fn(),
    drawerButton: null,
  },
} satisfies Meta<typeof AppBar>
export default meta

type Story = StoryObj<typeof meta>
export const LanguageSelection: Story = {}

const briefs = [summaryOf(workingView), summaryOf(doneView, { kind: 'learned', count: 3 })]
export const Dark: Story = { args: { briefs: briefs.slice(0, 1), theme: 'dark' } }
export const Light: Story = { args: { briefs: briefs.slice(1), theme: 'light' } }

/** 탭이 넘칠 때: 지금 보는 탭이 보이도록 가로 스크롤, 분석 필요 배지. */
export const ManyBriefs: Story = { args: { briefs: manyBriefs(), briefId: 'brief-24' } }

/** 톱니바퀴: 테마·언어를 한곳에서 고른다. */
export const Settings: Story = {
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: copy.app.navigation.settings }),
    )
  },
}
