import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发时前端 5173 端口，/api 代理到后端 3001 端口
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.DEV_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
