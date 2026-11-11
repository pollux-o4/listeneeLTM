import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useText } from '../../copy/index.ts'
import { doneView, workingView } from './fixtures.ts'
import { narrate } from './narration.ts'
import { QuestPath } from './QuestPath.tsx'

const meta = {
  title: 'Brief/QuestPath',
  component: QuestPath,
  render: (args) => {
    const copy = useText()
    return <QuestPath {...args} {...narrate(args.ready ? doneView : workingView, copy)} />
  },
  args: { onOpen: fn() },
} satisfies Meta<typeof QuestPath>
export default meta

type Story = StoryObj<typeof meta>
export const Working: Story = {
  args: {
    stages: workingView.stages,
    current: workingView.current,
    ready: false,
    open: 1,
    mood: 'thinking',
    say: '',
  },
}
export const Ready: Story = {
  args: {
    stages: doneView.stages,
    current: doneView.current,
    ready: true,
    open: 5,
    mood: 'happy',
    say: '',
  },
}
