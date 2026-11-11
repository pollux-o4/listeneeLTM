import type { Preview } from '@storybook/react-vite'
import { createElement } from 'react'
import { LocaleProvider } from '../src/copy/index.ts'
import '../src/design/index.ts'

const preview: Preview = {
  decorators: [(Story) => createElement(LocaleProvider, null, createElement(Story))],
  parameters: { layout: 'padded' },
}
export default preview
