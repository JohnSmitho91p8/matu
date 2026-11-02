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
import { loadSettings, saveSettings } from './lib/storage'

const settings = reactive(
  loadSettings(DEFAULT_SETTINGS, {
    theme: (v) => THEMES.some((t) => t.id === v),
    background: (v) => v === 'none' || BACKGROUNDS.some((b) => b.id === v),
    padding: (v) => PADDINGS.some((p) => p.id === v),
    lineNumbers: (v) => typeof v === 'boolean',
    code: (v) => typeof v === 'string',
    filename: (v) => typeof v === 'string' && v.trim() !== '',
  }),
)
useDocumentLang()

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
        v-model:filename="settings.filename"
        :theme="theme"
        :background="background"
        :padding="padding"
        :line-numbers="settings.lineNumbers"
      />
    </main>
    <Toolbar
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
