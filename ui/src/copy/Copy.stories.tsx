import type { Meta, StoryObj } from '@storybook/react-vite'
import { Catalog } from './catalog/Catalog.tsx'

const meta = {
  title: 'Copy/전체 문구',
  parameters: { layout: 'fullscreen' },
} satisfies Meta
export default meta

/** 모든 사용자 노출 문구를 화면 흐름 순서로, 언어별로 나란히 본다. 고칠 곳은 `copy/<언어>/`. */
export const All: StoryObj<typeof meta> = { render: () => <Catalog /> }
