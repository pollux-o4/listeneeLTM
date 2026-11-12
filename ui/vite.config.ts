import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // 개발 API는 4319: 릴리스 실사용 서버(4318, mise run refresh)와 동시에 띄운다.
  server: { port: 4320, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4319' } },
})
