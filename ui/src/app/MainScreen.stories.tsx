import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ApiProvider } from '../api/ApiProvider.tsx'
import { ApiError, type WorkspaceApi } from '../api/client.ts'
import type { LiveError } from '../api/useLive.ts'
import { workingView } from '../features/brief/fixtures.ts'
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
      list: [
        {
          id: workingView.brief.id,
          title: workingView.brief.title,
          revision: workingView.brief.revision,
          updatedAt: workingView.brief.updatedAt,
          ready: workingView.ready,
        },
      ],
      briefError: { offline: false, status: 500, message: '500' },
    }),
  },
}

export const WelcomeCopied: Story = {
  beforeEach: mockClipboard(),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
    await appears(async () => await canvas.findByText(copy.app.screen.copied))
  },
}
export const WelcomeCopyFailed: Story = {
  beforeEach: mockClipboard(true),
  play: async ({ canvasElement }) => {
    const copy = storyCopy()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
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
