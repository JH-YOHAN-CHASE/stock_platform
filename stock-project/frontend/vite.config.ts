import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      // oauth2, login은 프록시하지 않음
      // LoginPage에서 http://localhost:8083 으로 직접 이동하기 때문
    },
  },
})
