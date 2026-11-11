import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { doneView, summaryOf, workingView } from '../features/brief/fixtures.ts'
import { AppBar } from './AppBar.tsx'
import './app.css'

const meta = {
  title: 'App/Navigation',
  component: AppBar,
  args: {
    briefs: [],
    briefId: undefined,
    route: { kind: 'brief' },
    pendingNotes: 2,
    theme: 'system',
    onNextTheme: fn(),
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
