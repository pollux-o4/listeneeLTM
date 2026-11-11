import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import prefs from '../../generated/fixtures/preferences.json'
import type { Preferences } from '../../generated/Preferences.ts'
import { appears, storyCopy } from '../../story-support.ts'
import { PreferenceNotes } from './PreferenceNotes.tsx'

const meta = {
  title: 'Preferences/Notes',
  component: PreferenceNotes,
  args: { onPatch: fn(async () => true) },
} satisfies Meta<typeof PreferenceNotes>
export default meta

type Story = StoryObj<typeof meta>
export const WithNotes: Story = { args: { prefs: prefs as Preferences } }
export const Empty: Story = { args: { prefs: { revision: 0, items: [], changes: [] } } }

export const Editing: Story = {
  args: { prefs: prefs as Preferences },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const item = prefs.items.find((item) => !item.retired)
    if (!item) throw new Error('Missing editable fixture note')
    await userEvent.click(
      canvas.getByRole('button', { name: copy.preferences.notes.editAction(item.statement) }),
    )
    await appears(async () =>
      canvas.getByRole('textbox', { name: copy.preferences.notes.editLabel }),
    )
  },
}

export const AddWithoutTopic: Story = {
  args: { prefs: prefs as Preferences },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.type(
      canvas.getByRole('textbox', { name: copy.preferences.notes.statementLabel }),
      prefs.items[0]?.statement ?? '',
    )
    await userEvent.click(canvas.getByRole('button', { name: copy.preferences.notes.add }))
    await expect(
      canvas.getByRole('textbox', { name: copy.preferences.notes.statementLabel }),
    ).toHaveValue('')
  },
}
