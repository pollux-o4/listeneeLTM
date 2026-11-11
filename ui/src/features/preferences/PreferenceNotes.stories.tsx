import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import prefs from '../../generated/fixtures/preferences.json'
import type { Preferences } from '../../generated/Preferences.ts'
import { appears, storyCopy } from '../../story-support.ts'
import { manyPreferences, onePreference } from '../../story-volume.ts'
import { PreferenceNotes } from './PreferenceNotes.tsx'

const meta = {
  title: 'Preferences/Notes',
  component: PreferenceNotes,
  args: { onPatch: fn(async () => true), briefHref: (id: string) => `#/brief/${id}` },
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

/** 원칙은 접어도 문장·개수가 보이고, 펼치면 하위 기준이 나온다(UX-002). */
export const PrincipleToggle: Story = {
  args: { prefs: prefs as Preferences },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const principle = prefs.items.find((p) => prefs.items.some((c) => c.parent === p.id))
    const child = prefs.items.find((c) => c.parent === principle?.id)
    if (!principle || !child) throw new Error('Missing principle fixture')
    const toggle = canvas.getByRole('button', {
      name: copy.preferences.notes.expand(principle.statement),
    })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByText(child.statement)).toBeVisible()
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(canvas.queryByText(child.statement)).toBeNull())
    await expect(canvas.getByText(principle.statement)).toBeVisible()
  },
}

/** 데이터 양: 묶음 5개·원칙 5개·긴 문장·내려놓은 것 여럿 / 기준 하나. */
export const ManyNotes: Story = { args: { prefs: manyPreferences() } }

/** 많을 때: 확인할 것만 보기로 확인된 항목·내려놓은 것을 숨긴다. */
export const PendingOnly: Story = {
  args: { prefs: manyPreferences() },
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const prefs = manyPreferences()
    const pending = prefs.items.filter((p) => !p.retired && !p.confirmed).length
    const confirmedChild = prefs.items.find((p) => p.parent && p.confirmed && !p.retired)
    if (!confirmedChild) throw new Error('Missing confirmed child fixture')
    await userEvent.click(
      canvas.getByRole('button', { name: copy.preferences.notes.pending(pending) }),
    )
    await expect(canvas.queryByText(confirmedChild.statement)).toBeNull()
    await expect(canvas.queryByText(copy.preferences.notes.retired(6))).toBeNull()
  },
}
export const OneNote: Story = { args: { prefs: onePreference() } }
