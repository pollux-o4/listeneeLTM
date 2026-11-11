import { setProjectAnnotations } from '@storybook/react-vite'
import { render } from '@testing-library/react'
import preview from '../.storybook/preview.ts'

setProjectAnnotations([preview, { testingLibraryRender: render }])

// jsdom에는 미디어 쿼리 엔진이 없다. 애니메이션은 수집에 필요하지 않다.
Object.defineProperty(window, 'matchMedia', {
  value: (media: string) => ({
    media,
    matches: media === '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {},
  }),
})

HTMLElement.prototype.scrollIntoView = () => {}
