<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import CodeCard from './components/CodeCard.vue'
import Toolbar from './components/Toolbar.vue'
import MobileToolbar from './components/MobileToolbar.vue'
import PreviewOverlay from './components/PreviewOverlay.vue'
import Toast from './components/Toast.vue'
import {
  ExportError,
  SCALE_DESKTOP,
  SCALE_MOBILE,
  copyImage,
  downloadImage,
  exportProblem,
  loadExportLibrary,
  renderBlob,
  shareImage,
} from './lib/exporter'
import { createExportCache } from './lib/exportCache'
import { isMobile } from './lib/useIsMobile'
import { isSampleCode, lang, sampleCode, t, useDocumentLang } from './i18n'
import { THEMES } from './config/themes'
import { BACKGROUNDS } from './config/backgrounds'
import { FONT_SIZES, PADDINGS } from './config/defaults'
import { languageById } from './config/languages'
import { resolveDetectedLanguage, shouldRedetect } from './lib/detectLanguage'
import { remapHighlights, toggleHighlight } from './lib/lineHighlights'
import { saveSettings } from './lib/storage'
import { loadAppSettings } from './lib/settings'

const settings = reactive(loadAppSettings())

useDocumentLang()

// ---- 代码语言 ----
const resolvedLanguage = computed(() =>
  settings.language === 'auto' ? settings.detectedLanguage : settings.language,
)

function detect() {
  settings.detectedLanguage = resolveDetectedLanguage(settings.language, settings.detectedLanguage, settings.code)
}

// 只在粘贴、或内容大幅变化（超过 50%）时重新识别，逐字打字不会触发
let lastCode = settings.code
watch(
  () => settings.code,
  (code) => {
    // 编辑时让行高亮跟着原来那一行移动
    settings.highlightedLines = remapHighlights(settings.highlightedLines, lastCode, code)
    const redetect = shouldRedetect(lastCode, code)
    lastCode = code
    if (redetect) detect()
  },
)
// 切回「自动」时立刻识别一次
watch(
  () => settings.language,
  (value) => {
    if (value === 'auto') detect()
  },
)

// 文件名没被改过时跟随语言
watch(
  resolvedLanguage,
  (id) => {
    if (!settings.filenameEdited) settings.filename = languageById(id).filename
  },
  { immediate: true },
)

// ---- 行高亮 ----
let highlightAnchor = null

function onToggleLine({ index, shift }) {
  settings.highlightedLines = toggleHighlight(settings.highlightedLines, index, highlightAnchor, shift)
  highlightAnchor = index
}

function clearHighlights() {
  settings.highlightedLines = []
  highlightAnchor = null
}

// 粘贴：选中全部内容再粘贴，等于换了一段新代码，清除高亮；然后重新识别语言
function onPasteCode({ replacedAll }) {
  if (replacedAll) clearHighlights()
  detect()
}

function onFilenameInput(value) {
  settings.filename = value
  settings.filenameEdited = true
}

function resetFilename() {
  settings.filenameEdited = false
  settings.filename = languageById(resolvedLanguage.value).filename
}

// 代码还是默认示例时，示例的注释跟随界面语言；用户自己改过的代码不动
function followSample() {
  if (isSampleCode(settings.code)) settings.code = sampleCode(lang.value)
}
followSample()
watch(lang, followSample)

watch(settings, () => saveSettings({ ...settings }))

const theme = computed(() => THEMES.find((t) => t.id === settings.theme))
const background = computed(() => BACKGROUNDS.find((b) => b.id === settings.background) ?? null)
const padding = computed(() => PADDINGS.find((p) => p.id === settings.padding).px)
// 开关打开但文字为空时，不显示水印
const watermark = computed(() => (settings.watermarkEnabled ? settings.watermarkText.trim() : ''))
const fontSize = computed(() => FONT_SIZES.find((f) => f.id === settings.fontSize).px)

// ---- 导出 ----
const card = ref(null)
const toastMessage = ref('')
let toastTimer
function toast(message) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMessage.value = ''), 2200)
}

// 手机上导出 3 倍，图片宽度就是手机上卡片的实际宽度（超过画布上限时会自动降低倍率）
const exportOptions = () => ({
  scale: isMobile.value ? SCALE_MOBILE : SCALE_DESKTOP,
})

// 会影响图片内容的全部状态。摘要不变，缓存里的图片就还有效
const exportKey = computed(() =>
  JSON.stringify([
    settings.code,
    resolvedLanguage.value,
    settings.theme,
    settings.background,
    settings.padding,
    settings.fontSize,
    settings.lineNumbers,
    settings.highlightedLines,
    settings.filename,
    watermark.value,
    isMobile.value,
  ]),
)

// 后台预先生成的图片（只保留最新一份）。点复制、下载、分享时直接用，不用再等
const imageCache = createExportCache(async () => {
  await card.value.flush()
  await nextTick()
  return renderBlob(card.value.cardEl, exportOptions())
})

const currentImage = () => imageCache.get(exportKey.value)

// 点击时先同步检查：没有代码、图片太大都直接提示，不生成空图
function canExport() {
  if (!settings.code.trim()) {
    toast(t('toast.nothingToExport'))
    return false
  }
  if (exportProblem(card.value.cardEl, exportOptions())) {
    toast(t('toast.tooLarge'))
    return false
  }
  return true
}

function reportExportError(e) {
  if (e instanceof ExportError) toast(t(e.code === 'empty' ? 'toast.nothingToExport' : 'toast.tooLarge'))
  else {
    console.error(e)
    toast(t('toast.exportFailed'))
  }
}

const PREWARM_MAX_LINES = 400
// 停下来一会儿后，在浏览器空闲时提前生成图片。代码越长生成越久，多等一会儿，避免影响打字
const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 0))
let prewarmTimer
function schedulePrewarm() {
  clearTimeout(prewarmTimer)
  if (!settings.code.trim()) return
  const lineCount = settings.code.split('\n').length
  // 太长的代码生成要好几秒，会让输入卡住，不提前生成（点击时再现场生成）
  if (lineCount > PREWARM_MAX_LINES) return
  const delay = Math.min(2000, 500 + lineCount * 4)
  prewarmTimer = setTimeout(() => {
    if (document.hidden || !card.value) return
    idle(() => {
      if (!card.value || exportProblem(card.value.cardEl, exportOptions())) return
      imageCache.prewarm(exportKey.value)
    })
  }, delay)
}
watch(exportKey, schedulePrewarm)
onMounted(() => {
  schedulePrewarm()
  // 空闲时把导出用的代码提前下载好，第一次导出不用等
  idle(() => loadExportLibrary().catch(() => {}))
})
onBeforeUnmount(() => clearTimeout(prewarmTimer))

// 预览层：系统分享用不了时（例如微信内置浏览器），显示图片让用户长按保存
const previewUrl = ref('')

function showPreview(blob) {
  closePreview()
  previewUrl.value = URL.createObjectURL(blob)
}

function closePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

async function share() {
  if (!canExport()) return
  try {
    const result = await shareImage(currentImage(), settings.filename)
    if (result.blob) showPreview(result.blob)
  } catch (e) {
    reportExportError(e)
  }
}

async function download() {
  if (!canExport()) return
  try {
    // 手机上直接下载体验不好（文件会进「文件」App），改为打开预览层，长按即可存到相册
    if (isMobile.value) {
      showPreview(await currentImage())
      return
    }
    await downloadImage(currentImage(), settings.filename)
  } catch (e) {
    reportExportError(e)
  }
}

async function copy() {
  if (!canExport()) return
  try {
    await copyImage(currentImage())
    toast(t('toast.copied'))
  } catch (e) {
    if (e instanceof ExportError) return reportExportError(e)
    console.error(e)
    toast(t('toast.copyFailed'))
    download()
  }
}

// Cmd/Ctrl + Shift + C 复制图片；Cmd/Ctrl + S 下载图片
function onKeydown(e) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return
  const key = e.key.toLowerCase()
  if (e.shiftKey && key === 'c') {
    e.preventDefault()
    copy()
  } else if (!e.shiftKey && key === 's') {
    e.preventDefault()
    download()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="app">
    <TopBar :mobile="isMobile" @download="download" @copy="copy" @share="share" />
    <main class="stage" :class="{ mobile: isMobile }">
      <CodeCard
        ref="card"
        v-model:code="settings.code"
        :filename="settings.filename"
        :lang="resolvedLanguage"
        @update:filename="onFilenameInput"
        @reset-filename="resetFilename"
        :highlighted="settings.highlightedLines"
        @paste-code="onPasteCode"
        @toggle-line="onToggleLine"
        :theme="theme"
        :background="background"
        :padding="padding"
        :font-size="fontSize"
        :watermark="watermark"
        :line-numbers="settings.lineNumbers"
        :mobile="isMobile"
      />
    </main>
    <component
      :is="isMobile ? MobileToolbar : Toolbar"
      v-model:language="settings.language"
      :highlight-count="settings.highlightedLines.length"
      @clear-highlight="clearHighlights"
      v-model:theme="settings.theme"
      v-model:background="settings.background"
      v-model:padding="settings.padding"
      v-model:font-size="settings.fontSize"
      v-model:watermark-enabled="settings.watermarkEnabled"
      v-model:watermark-text="settings.watermarkText"
      v-model:line-numbers="settings.lineNumbers"
    />
    <PreviewOverlay :url="previewUrl" @close="closePreview" />
    <Toast :message="toastMessage" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  /* 手机上用动态视口高度，避免 Safari 地址栏伸缩时页面跳动 */
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.stage {
  /* 不缩小：内容比窗口高时由页面整体滚动；底部预留工具栏高度 */
  flex: 1 0 auto;
  display: flex;
  padding: 24px max(24px, env(safe-area-inset-right)) 120px max(24px, env(safe-area-inset-left));
  /* 卡片比可用宽度宽时会整体缩小，不需要横向滚动 */
  overflow-x: hidden;
}

/* 手机：两侧各留 16px（卡片缩小到刚好放进这个宽度）；底部留出工具栏的高度和 iPhone 底部横条，卡片不会被遮住 */
.stage.mobile {
  padding: 8px max(16px, env(safe-area-inset-right)) calc(96px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}
</style>
