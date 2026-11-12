import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, userEvent, within } from 'storybook/test'
import { ApiProvider } from '../api/ApiProvider.tsx'
import { ApiError, type WorkspaceApi } from '../api/client.ts'
import type { LiveError } from '../api/useLive.ts'
import { reviewView, summaryOf, workingView } from '../features/brief/fixtures.ts'
import {
  appears,
  atRoute,
  fakeApi,
  mockClipboard,
  storyCopy,
  switchableApi,
} from '../story-support.ts'
import { App } from './App.tsx'
import type { useWorkspaceData } from './data/useWorkspaceData.ts'
import { MainScreen } from './MainScreen.tsx'
import './app.css'

type Data = ReturnType<typeof useWorkspaceData>

/** 화면 상태만 보이도록 데이터 연결을 고정값으로 대신한다. */
function data(state: {
  list?: Data['list']['data']
  listError?: LiveError
  briefError?: LiveError
  prefsError?: LiveError
}): Data {
  const live = <T,>(value: T | undefined, error?: LiveError) => ({
    data: value,
    error,
    set: fn(),
    refresh: fn(),
  })
  return {
    list: live(state.list, state.listError),
    prefs: live(undefined, state.prefsError),
    brief: live(undefined, state.briefError),
    briefId: state.briefError ? 'missing' : undefined,
    patchBrief: fn(),
    undoBrief: fn(),
    patchPrefs: fn(),
    duplicateBrief: fn(),
  } as unknown as Data
}

const meta = {
  title: 'App/Screens',
  component: MainScreen,
  args: { route: { kind: 'brief' }, data: data({ list: [] }) },
} satisfies Meta<typeof MainScreen>
export default meta

type Story = StoryObj<typeof meta>

/** 지시서가 아직 없을 때: AI에게 할 말 한 가지 */
export const Welcome: Story = {}

/** 서버에 한 번도 닿지 못했을 때 */
export const Offline: Story = {
  args: { data: data({ listError: { offline: true, message: '' } }) },
}

/** 주소의 지시서가 없을 때 */
export const NotFound: Story = {
  args: {
    route: { kind: 'brief', id: 'missing' },
    data: data({
      list: [{ id: 'demo', title: 'demo', revision: 1, updatedAt: '' }] as Data['list']['data'],
      briefError: { offline: false, status: 404, message: 'brief not found: missing' },
    }),
  },
}

/** 취향 노트를 읽지 못했을 때 */
export const NotesFailed: Story = {
  args: {
    route: { kind: 'notes' },
    data: data({ list: [], prefsError: { offline: false, status: 500, message: 'corrupt file' } }),
  },
}

/** 읽는 중 */
export const Loading: Story = {
  args: { route: { kind: 'brief', id: 'demo' }, data: data({}) },
}

export const BriefFailed: Story = {
  args: {
    route: { kind: 'brief', id: 'missing' },
    data: data({
      list: [summaryOf(workingView)],
      briefError: { offline: false, status: 500, message: '500' },
    }),
  },
}

export const WelcomeCopied: Story = {
  beforeEach: mockClipboard(),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText(`“${copy.app.screen.askAiWith('', [])}”`))
    await appears(async () => await canvas.findByText(copy.app.screen.copied))
  },
}
/** 할 일을 적으면 그 내용이 담긴 한 줄 문장을 복사한다 */
export const WelcomeWithTask: Story = {
  beforeEach: mockClipboard(),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText(copy.app.screen.taskLabel), 'social  login{Enter}')
    await canvas.findByText(`“${copy.app.screen.askAiWith('social login', [])}”`)
    await appears(async () => await canvas.findByText(copy.app.screen.copied))
  },
}
/** 세부 조건을 펼쳐 고르고 직접 적으면 문장에 함께 담긴다 */
export const WelcomeWithDetails: Story = {
  play: async ({ canvasElement }) => {
    const s = storyCopy().app.screen
    const canvas = within(canvasElement)
    // 목적을 적기 전에는 세부 조건이 잠겨 있다
    if (canvas.queryByRole('button', { name: s.detailsShow }))
      throw new Error('details unlocked early')
    await userEvent.type(canvas.getByLabelText(s.taskLabel), 'social login')
    await userEvent.click(await canvas.findByRole('button', { name: s.detailsShow }))
    const [first] = s.detailPresets
    await userEvent.click(canvas.getByRole('button', { name: first }))
    await userEvent.type(canvas.getByLabelText(s.detailsExtra), 'mobile')
    await canvas.findByText(`“${s.askAiWith('social login', [first, 'mobile'])}”`)
  },
}
export const WelcomeCopyFailed: Story = {
  beforeEach: mockClipboard(true),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText(`“${copy.app.screen.askAiWith('', [])}”`))
    await appears(async () => await canvas.findByText(copy.app.screen.copyFailed))
  },
}

/** 실제 앱 셸을 주입한 데이터 경계로 띄운다. 전역 상태는 바꾸지 않는다. */
const shellWith = (api: WorkspaceApi) => () => (
  <ApiProvider api={api}>
    <App />
  </ApiProvider>
)
const showsBrief = (canvasElement: HTMLElement) =>
  appears(async () =>
    within(canvasElement).findByRole('heading', { name: workingView.brief.title }),
  )

/** 데이터 경계를 고정하고 실제 앱 셸·쓰기·알림을 함께 보여 준다. */
export const Shell: Story = {
  render: shellWith(fakeApi()),
  beforeEach: atRoute('#/brief/'),
  play: ({ canvasElement }) => showsBrief(canvasElement),
}
export const ShellWelcome: Story = {
  render: shellWith(fakeApi({ briefs: async () => [] })),
  beforeEach: atRoute('#/brief/'),
  play: async ({ canvasElement }) => {
    await appears(
      async () => await within(canvasElement).findByText(storyCopy().app.screen.emptyTitle),
    )
  },
}
export const ShellNotes: Story = {
  render: shellWith(fakeApi()),
  beforeEach: atRoute('#/notes'),
  play: async ({ canvasElement }) => {
    await appears(
      async () =>
        await within(canvasElement).findByRole('heading', {
          name: storyCopy().preferences.notes.title,
        }),
    )
  },
}

/** 서랍에서 복제하면 새 지시서로 가고, 다시 확인하라는 알림이 뜬다(FLOW-002). */
export const ShellDuplicate: Story = {
  render: shellWith(fakeApi()),
  beforeEach: atRoute('#/brief/'),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await showsBrief(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: new RegExp(`^${copy.app.drawer.open}`) }),
    )
    await userEvent.click(
      await canvas.findByRole('button', {
        name: copy.app.drawer.duplicateLabel(workingView.brief.title),
      }),
    )
    const title = copy.app.drawer.copyTitle(workingView.brief.title)
    await appears(async () => await canvas.findByText(copy.app.notice.duplicated(title)))
  },
}

/** 읽기 도중 서버가 끊기거나 오류를 내는 상태. 대역은 스토리마다 따로 둔다. */
const disconnected = switchableApi()
export const Disconnected: Story = {
  render: shellWith(disconnected.api),
  beforeEach: () => {
    disconnected.reset()
    return atRoute('#/brief/')()
  },
  play: async ({ canvasElement }) => {
    await showsBrief(canvasElement)
    disconnected.set({
      brief: async () => {
        throw new TypeError('offline')
      },
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await appears(async () => await within(canvasElement).findByText(storyCopy().app.shell.offline))
  },
}
const readFailing = switchableApi()
export const ReadFailed: Story = {
  render: shellWith(readFailing.api),
  beforeEach: () => {
    readFailing.reset()
    return atRoute('#/brief/')()
  },
  play: async ({ canvasElement }) => {
    await showsBrief(canvasElement)
    const message = storyCopy().app.screen.briefError
    readFailing.set({
      brief: async () => {
        throw new ApiError(500, message)
      },
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await appears(
      async () => await within(canvasElement).findByText(storyCopy().app.shell.readFailed(message)),
    )
  },
}

/** 쓰기 실패: 입력을 지우지 않고 알린다. */
const acceptAll = async (canvasElement: HTMLElement) => {
  await showsBrief(canvasElement)
  await userEvent.click(
    within(canvasElement).getByRole('button', {
      name: storyCopy().brief.workspace.acceptRecommended(2),
    }),
  )
}
export const OfflineSave: Story = {
  render: shellWith(
    fakeApi({
      patchBrief: async () => {
        throw new TypeError('offline')
      },
    }),
  ),
  beforeEach: atRoute('#/brief/'),
  play: async ({ canvasElement }) => {
    await acceptAll(canvasElement)
    await appears(
      async () => await within(canvasElement).findByText(storyCopy().app.notice.offlineSave),
    )
  },
}
export const SaveRejected: Story = {
  render: shellWith(
    fakeApi({
      patchBrief: async () => {
        throw new ApiError(500, storyCopy().app.screen.briefError)
      },
    }),
  ),
  beforeEach: atRoute('#/brief/'),
  play: async ({ canvasElement }) => {
    await acceptAll(canvasElement)
    const copy = storyCopy()
    await appears(
      async () =>
        await within(canvasElement).findByText(
          copy.app.notice.saveFailed(copy.app.screen.briefError),
        ),
    )
  },
}
export const Removed: Story = {
  render: shellWith(fakeApi()),
  beforeEach: atRoute('#/brief/'),
  play: async ({ canvasElement }) => {
    await showsBrief(canvasElement)
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const item = workingView.brief.sections.scopeIn?.find(
      (item) => !item.id.startsWith('decision-'),
    )
    if (!item) throw new Error('Missing removable fixture item')
    await userEvent.click(
      canvas.getByRole('button', { name: copy.brief.item.removeLabel(item.text) }),
    )
    await appears(async () => await canvas.findByText(copy.app.notice.removed))
    await appears(async () =>
      within(canvas.getAllByRole('status').at(-1) as HTMLElement).getByRole('button', {
        name: copy.app.notice.undo,
      }),
    )
  },
}

/** 좋아요도 확인을 묻지 않는 대신 결과를 알리고 바로 되돌릴 길을 준다. */
export const Confirmed: Story = {
  render: shellWith(fakeApi()),
  beforeEach: atRoute('#/brief/'),
  play: async ({ canvasElement }) => {
    await showsBrief(canvasElement)
    const copy = storyCopy()
    const canvas = within(canvasElement)
    const item = workingView.brief.sections.scopeIn?.find(
      (item) => !item.confirmed && !item.id.startsWith('decision-'),
    )
    if (!item) throw new Error('Missing unconfirmed fixture item')
    await userEvent.click(
      canvas.getByRole('button', { name: copy.brief.item.confirmLabel(item.text) }),
    )
    await appears(async () => await canvas.findByText(copy.app.notice.confirmed))
  },
}

export const ConfirmedAll: Story = {
  // 확인 전 항목이 여럿인 단계가 있는 지시서로 띄운다.
  render: shellWith(fakeApi({ brief: async () => reviewView, patchBrief: async () => reviewView })),
  beforeEach: atRoute('#/brief/'),
  play: async ({ canvasElement }) => {
    await appears(async () =>
      within(canvasElement).findByRole('heading', { name: reviewView.brief.title }),
    )
    const copy = storyCopy()
    const canvas = within(canvasElement)
    // 확인 전 항목이 둘 이상인 단계(길의 숫자 배지)로 가야 '모두 좋아요'가 나온다.
    const node = [...canvasElement.querySelectorAll<HTMLElement>('.qp-node')].find(
      (n) => Number(n.querySelector('.status-mark[data-status="review"]')?.textContent) > 1,
    )
    if (!node) throw new Error('Missing stage with several unconfirmed items')
    await userEvent.click(node)
    await userEvent.click(await canvas.findByRole('button', { name: copy.brief.stage.confirmAll }))
    await appears(async () => await canvas.findByText(copy.app.notice.confirmedAll))
  },
}
