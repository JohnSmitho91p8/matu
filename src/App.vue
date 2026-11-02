<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import CodeCard from './components/CodeCard.vue'
import Toolbar from './components/Toolbar.vue'
import Toast from './components/Toast.vue'
import { copyImage, downloadImage } from './lib/exporter'
import { isSampleCode, lang, sampleCode, t, useDocumentLang } from './i18n'
import { THEMES } from './config/themes'
import { BACKGROUNDS } from './config/backgrounds'
import { DEFAULT_SETTINGS, PADDINGS } from './config/defaults'
import { isCodeLanguage, isDefaultFilename, languageById } from './config/languages'
import { changeRatio, detectLanguage } from './lib/detectLanguage'
import { remapHighlights, toggleHighlight } from './lib/lineHighlights'
import { loadSettings, saveSettings } from './lib/storage'

const settings = reactive(
  loadSettings(DEFAULT_SETTINGS, {
    theme: (v) => THEMES.some((t) => t.id === v),
    background: (v) => v === 'none' || BACKGROUNDS.some((b) => b.id === v),
    padding: (v) => PADDINGS.some((p) => p.id === v),
    lineNumbers: (v) => typeof v === 'boolean',
    code: (v) => typeof v === 'string',
    filename: (v) => typeof v === 'string' && v.trim() !== '',
    language: (v) => v === 'auto' || isCodeLanguage(v),
    detectedLanguage: isCodeLanguage,
    filenameEdited: (v) => typeof v === 'boolean',
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
const padding = computed(() => PADDINGS.find((p) => p.id === settings.padding).px)

// ---- 导出 ----
const card = ref(null)
const toastMessage = ref('')
let toastTimer
function toast(message) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMessage.value = ''), 2200)
}

const exportOptions = () => ({ noBackground: settings.background === 'none' })

async function download() {
  try {
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
    <TopBar @download="download" @copy="copy" />
    <main class="stage">
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
        :line-numbers="settings.lineNumbers"
      />
    </main>
    <Toolbar
      v-model:language="settings.language"
      :detected-language="settings.detectedLanguage"
      :highlight-count="settings.highlightedLines.length"
      @clear-highlight="clearHighlights"
      v-model:theme="settings.theme"
      v-model:background="settings.background"
      v-model:padding="settings.padding"
      v-model:line-numbers="settings.lineNumbers"
    />
    <Toast :message="toastMessage" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.stage {
  /* 不缩小：内容比窗口高时由页面整体滚动；底部预留工具栏高度 */
  flex: 1 0 auto;
  display: flex;
  padding: 24px 24px 120px;
  /* 窄屏上卡片放不下时可横向滚动 */
  overflow-x: auto;
}
</style>
