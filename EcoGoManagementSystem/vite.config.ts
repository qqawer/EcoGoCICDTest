import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://13.229.148.21:8090',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist', // 打包输出目录（Pipeline 部署时会读取这个目录）
    sourcemap: false, // 生产环境关闭源码映射，提升前端加载速度
    chunkSizeWarningLimit: 1000, // 避免打包时出现不必要的体积警告
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
})