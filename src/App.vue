<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import CodeCard from './components/CodeCard.vue'
import Toolbar from './components/Toolbar.vue'
import MobileToolbar from './components/MobileToolbar.vue'
import PreviewOverlay from './components/PreviewOverlay.vue'
import Toast from './components/Toast.vue'
import { SCALE_DESKTOP, SCALE_MOBILE, copyImage, downloadImage, renderBlob, shareImage } from './lib/exporter'
import { isMobile } from './lib/useIsMobile'
import { isSampleCode, lang, sampleCode, t, useDocumentLang } from './i18n'
import { THEMES } from './config/themes'
import { BACKGROUNDS } from './config/backgrounds'
import { DEFAULT_SETTINGS, FONT_SIZES, PADDINGS, WATERMARK_MAX_LENGTH } from './config/defaults'
import { isCodeLanguage, isDefaultFilename, languageById } from './config/languages'
import { changeRatio, detectLanguage } from './lib/detectLanguage'
import { remapHighlights, toggleHighlight } from './lib/lineHighlights'
import { loadSettings, saveSettings } from './lib/storage'

const settings = reactive(
  loadSettings(DEFAULT_SETTINGS, {
    theme: (v) => THEMES.some((t) => t.id === v),
    background: (v) => v === 'none' || BACKGROUNDS.some((b) => b.id === v),
    padding: (v) => PADDINGS.some((p) => p.id === v),
    fontSize: (v) => FONT_SIZES.some((f) => f.id === v),
    lineNumbers: (v) => typeof v === 'boolean',
    code: (v) => typeof v === 'string',
    filename: (v) => typeof v === 'string' && v.trim() !== '',
    language: (v) => v === 'auto' || isCodeLanguage(v),
    detectedLanguage: isCodeLanguage,
    filenameEdited: (v) => typeof v === 'boolean',
    watermarkEnabled: (v) => typeof v === 'boolean',
    watermarkText: (v) => typeof v === 'string' && v.length <= WATERMARK_MAX_LENGTH,
    highlightedLines: (v) => Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0),
  }),
)
// 旧版本保存的文件名没有「是否改过」的记录：不是默认名就认为是用户改过的
if (!settings.filenameEdited && !isDefaultFilename(settings.filename)) settings.filenameEdited = true

useDocumentLang()

// ---- 代码语言 ----
const resolvedLanguage = computed(() =>
  settings.language === 'auto' ? settings.detectedLanguage : settings.language,
)

function detect() {
  if (settings.language !== 'auto') return
  const found = detectLanguage(settings.code)
  if (found) settings.detectedLanguage = found
}

// 只在粘贴、或内容大幅变化（超过 50%）时重新识别，逐字打字不会触发
let lastCode = settings.code
watch(
  () => settings.code,
  (code) => {
    // 编辑时让行高亮跟着原来那一行移动
    settings.highlightedLines = remapHighlights(settings.highlightedLines, lastCode, code)
    const ratio = changeRatio(lastCode, code)
    lastCode = code
    if (code.trim() && ratio > 0.5) detect()
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
const padding = computed(() => {
  const p = PADDINGS.find((p) => p.id === settings.padding)
  return isMobile.value ? p.mobilePx : p.px
})
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

// 手机上导出 3 倍，图片宽度就是手机上卡片的实际宽度
const exportOptions = () => ({
  noBackground: settings.background === 'none',
  scale: isMobile.value ? SCALE_MOBILE : SCALE_DESKTOP,
})

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
  try {
    const result = await shareImage(card.value.cardEl, settings.filename, exportOptions())
    if (result.blob) showPreview(result.blob)
  } catch (e) {
    console.error(e)
    toast(t('toast.exportFailed'))
  }
}

async function download() {
  try {
    // 手机上直接下载体验不好（文件会进「文件」App），改为打开预览层，长按即可存到相册
    if (isMobile.value) {
      showPreview(await renderBlob(card.value.cardEl, exportOptions()))
      return
    }
    await downloadImage(card.value.cardEl, settings.filename, exportOptions())
  } catch (e) {
    console.error(e)
    toast(t('toast.exportFailed'))
  }
}

async function copy() {
  try {
    await copyImage(card.value.cardEl, exportOptions())
    toast(t('toast.copied'))
  } catch (e) {
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
      :detected-language="settings.detectedLanguage"
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
  /* 窄屏上卡片放不下时可横向滚动 */
  overflow-x: auto;
}

/* 手机：两侧各留 16px；底部留出工具栏的高度和 iPhone 底部横条，卡片不会被遮住 */
.stage.mobile {
  padding: 8px max(16px, env(safe-area-inset-right)) calc(96px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  overflow-x: hidden;
}
</style>
