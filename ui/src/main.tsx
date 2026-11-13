import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import { LocaleProvider } from './copy/index.ts'
import './design/index.ts'

const root = document.getElementById('root')
if (root)
  createRoot(root).render(
    <StrictMode>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </StrictMode>,
  )
