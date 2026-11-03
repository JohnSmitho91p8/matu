import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// 电脑和 iPhone 尺寸，各在 Chromium 和 WebKit 上运行
export default defineConfig({
  testDir: 'tests/e2e',
  // 截图对比的基准图按系统和浏览器引擎分开存放（不同系统的字体渲染有细微差异）
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/matu/`,
    trace: 'retain-on-failure',
    acceptDownloads: true,
    // 固定语言，测试用英文界面
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/matu/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } },
    { name: 'chromium-iphone', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 14'] } },
  ],
})
