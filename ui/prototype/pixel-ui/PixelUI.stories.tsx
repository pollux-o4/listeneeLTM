import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import './foundations/tokens.css'
import { App } from './App.tsx'
import {
  PixelButton,
  PixelMeter,
  PixelPanel,
  PixelSprite,
  SpeechBubble,
} from './primitives/index.tsx'
import { BriefScreen } from './scenes/BriefScreen.tsx'
import { Mascot } from './scenes/Mascot.tsx'
import { icons } from './sprites/icons.ts'
import { listenee } from './sprites/listenee.ts'

const Themed = ({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) => (
  <div
    data-theme={theme}
    style={{ background: 'var(--c-bg)', color: 'var(--c-text)', padding: 24 }}
  >
    {children}
  </div>
)

const meta = {
  title: 'Prototype/Pixel UI',
  parameters: { layout: 'fullscreen' },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Canon: Story = { name: '정본', render: () => <App initialVariant="canon" /> }
export const VariantA: Story = { name: '시안 A · 작업대', render: () => <App initialVariant="A" /> }
export const VariantB: Story = {
  name: '시안 B · 여정 지도',
  render: () => <App initialVariant="B" />,
}
export const VariantC: Story = {
  name: '시안 C · 한 가지씩',
  render: () => <App initialVariant="C" />,
}

export const Screen: Story = { render: () => <BriefScreen /> }
export const ScreenDark: Story = {
  render: () => (
    <div data-theme="dark">
      <BriefScreen prefilled />
    </div>
  ),
}

export const MascotMoods: Story = {
  render: () => (
    <Themed theme="light">
      <div style={{ display: 'flex', gap: 48, alignItems: 'end' }}>
        {(Object.keys(listenee) as (keyof typeof listenee)[]).map((mood) => (
          <figure key={mood} style={{ margin: 0, textAlign: 'center' }}>
            <Mascot mood={mood} scale={6} />
            <figcaption className="px-label">{mood}</figcaption>
          </figure>
        ))}
      </div>
    </Themed>
  ),
}

const SWATCHES =
  'ink night plum violet mist cream paper peach coral honey moss teal sky rose dust stone'.split(
    ' ',
  )

export const Foundations: Story = {
  render: () => (
    <Themed theme="light">
      <div style={{ display: 'grid', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 64px)', gap: 6 }}>
          {SWATCHES.map((name) => (
            <div key={name}>
              <div
                style={{
                  height: 40,
                  background: `var(--p-${name})`,
                  boxShadow: '0 0 0 3px var(--c-line)',
                }}
              />
              <span className="px-label">{name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <span className="px-title" style={{ fontSize: 24 }}>
            Listen to Me · 과업지시서
          </span>
          <span className="px-title">제목 Galmuri11 Bold 15</span>
          <span className="px-label">라벨 Galmuri11 12</span>
          <span style={{ fontFamily: 'var(--font-body)' }}>
            본문은 가독성을 위해 시스템 글꼴을 씁니다.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {Object.entries(icons).map(([name, sprite]) => (
            <PixelSprite key={name} sprite={sprite} scale={4} fps={3} label={name} />
          ))}
        </div>
      </div>
    </Themed>
  ),
}

export const Primitives: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <Themed key={theme} theme={theme}>
          <div style={{ display: 'grid', gap: 20 }}>
            <PixelPanel>
              <h3 className="px-title">패널</h3>
              <p style={{ margin: '8px 0 0' }}>계단 모서리와 아래쪽 그림자.</p>
            </PixelPanel>
            <PixelPanel tone="accent">강조 패널</PixelPanel>
            <div style={{ display: 'flex', gap: 16 }}>
              <PixelButton>확인</PixelButton>
              <PixelButton>되돌리기</PixelButton>
            </div>
            <PixelMeter value={2} max={3} label="예시" />
            <PixelMeter value={3} max={3} label="예시 완료" />
            <SpeechBubble text="한 글자씩 부드럽게 나타나요." />
          </div>
        </Themed>
      ))}
    </div>
  ),
}
