import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 与 GitHub 仓库名一致，部署到 https://<用户名>.github.io/cpp-shot/
  base: '/cpp-shot/',
  plugins: [vue()],
})
