import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    env: {
      // Never let tests reach the Redis configured in .env (it may be shared or
      // production). An empty value makes the cache helpers no-ops.
      REDIS_URL: '',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

