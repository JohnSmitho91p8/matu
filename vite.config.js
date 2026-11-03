import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 与 GitHub 仓库名一致，部署到 https://<用户名>.github.io/matu/
  base: '/matu/',
  plugins: [vue()],
  build: {
    // C++ 的语法文件有 780 kB（Shiki 的 C++ 语法里内嵌了宏、正则和 GLSL 语法），无法再拆小，
    // 其余语言、主题和导出库都已经按需加载。上限设在它之上，真有新的大文件混进来时仍会提醒
    chunkSizeWarningLimit: 850,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
  },
})
