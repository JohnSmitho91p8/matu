import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 与 GitHub 仓库名一致，部署到 https://<用户名>.github.io/matu/
  base: '/matu/',
  plugins: [
    vue(),
    // 离线安装：Service Worker 预缓存整个应用（页面、全部 JS/CSS、字体、图标）。
    // 页面请求直接用缓存（缓存优先）：在国内 github.io 常常不是立刻失败而是一直卡住，先等网络就没有意义了。
    // 新版本在后台下载，下次打开时才换上，不打断正在进行的使用（不用 skipWaiting，也没有任何界面提示）
    VitePWA({
      registerType: 'prompt',
      manifest: {
        id: '/matu/',
        name: '码图 Matu',
        short_name: 'Matu',
        start_url: '/matu/',
        scope: '/matu/',
        display: 'standalone',
        theme_color: '#0f0f10',
        background_color: '#0f0f10',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 全部字体分片都要预缓存：离线时打开含有新汉字的分享链接，才不会缺字
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
