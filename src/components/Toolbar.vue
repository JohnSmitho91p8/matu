<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SettingsForm from './SettingsForm.vue'
import { BACKGROUNDS } from '../config/backgrounds'
import { THEMES } from '../config/themes'
import { t } from '../i18n'

defineProps({ highlightCount: { type: Number, default: 0 } })
defineEmits(['clear-highlight'])

const theme = defineModel('theme')
const background = defineModel('background')
const language = defineModel('language')
const padding = defineModel('padding')
const fontSize = defineModel('fontSize')
const lineNumbers = defineModel('lineNumbers')
const startLine = defineModel('startLine')
const watermarkEnabled = defineModel('watermarkEnabled')
const watermarkText = defineModel('watermarkText')

// 设置面板：在「设置」按钮上方弹出。工具栏自己会横向滚动，面板用 fixed 定位，避免被裁掉
const open = ref(false)
const trigger = ref(null)
const panelStyle = ref({})

function toggle() {
  open.value = !open.value
  if (!open.value) return
  const rect = trigger.value.getBoundingClientRect()
  const width = 300
  panelStyle.value = {
    left: `${Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8)}px`,
    bottom: `${window.innerHeight - rect.top + 10}px`,
    width: `${width}px`,
  }
}

function close() {
  open.value = false
}

function onDocClick(e) {
  if (!open.value) return
  if (trigger.value?.contains(e.target) || e.target.closest?.('.settings-panel')) return
  close()
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', close)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <div class="toolbar" role="toolbar" :aria-label="t('toolbar.label')">
    <div class="group" data-testid="theme">
      <span class="label">{{ t('toolbar.theme') }}</span>
      <button
        v-for="th in THEMES"
        :key="th.id"
        class="swatch"
        :class="{ active: theme === th.id }"
        :title="t('theme.' + th.id)"
        :aria-label="t('theme.' + th.id)"
        :aria-pressed="theme === th.id"
        :style="{ background: th.bg, '--kw': th.keyword, '--str': th.string, '--cmt': th.comment }"
        @click="theme = th.id"
      >
        <i></i><i></i><i></i>
      </button>
    </div>
    <div class="divider"></div>
    <div class="group" data-testid="background">
      <span class="label">{{ t('toolbar.background') }}</span>
      <button
        v-for="b in BACKGROUNDS"
        :key="b.id"
        class="dot"
        :class="{ active: background === b.id }"
        :title="t('bg.' + b.id)"
        :aria-label="t('bg.' + b.id)"
        :aria-pressed="background === b.id"
        :style="{ background: b.value }"
        @click="background = b.id"
      ></button>
      <button
        class="dot none"
        :class="{ active: background === 'none' }"
        :title="t('bg.none')"
        :aria-label="t('bg.none')"
        :aria-pressed="background === 'none'"
        @click="background = 'none'"
      ></button>
    </div>
    <div class="divider"></div>
    <button
      ref="trigger"
      class="settings-btn"
      :class="{ on: open }"
      aria-haspopup="dialog"
      :aria-expanded="open"
      data-testid="settings-button"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
      <span>{{ t('toolbar.settings') }}</span>
    </button>
    <template v-if="highlightCount > 0">
      <div class="divider"></div>
      <button class="clear" @click="$emit('clear-highlight')">{{ t('toolbar.clearHighlight') }}</button>
    </template>
  </div>

  <Teleport to="body">
    <div v-if="open" class="settings-panel" role="dialog" :aria-label="t('toolbar.settings')" :style="panelStyle">
      <SettingsForm
        v-model:language="language"
        v-model:padding="padding"
        v-model:font-size="fontSize"
        v-model:line-numbers="lineNumbers"
        v-model:start-line="startLine"
        v-model:watermark-enabled="watermarkEnabled"
        v-model:watermark-text="watermarkText"
        :padding-disabled="background === 'none'"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.toolbar {
  position: fixed;
  left: 50%;
  bottom: calc(28px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(40, 40, 44, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  white-space: nowrap;
  /* 手机上放不下时横向滚动 */
  max-width: calc(100vw - 24px);
  overflow-x: auto;
  scrollbar-width: none;
}

.toolbar::-webkit-scrollbar {
  display: none;
}

.toolbar > * {
  flex-shrink: 0;
}

.swatch,
.dot {
  transition: transform 0.15s, outline-color 0.15s, background 0.2s, opacity 0.15s;
}

.swatch:hover,
.dot:hover {
  transform: scale(1.12);
}

.swatch:active,
.dot:active {
  transform: scale(0.92);
}

.group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  margin-right: 2px;
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.12);
}

.swatch {
  width: 28px;
  height: 26px;
  padding: 5px 5px 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 迷你代码预览：三条短横线依次是关键字、字符串、注释的颜色 */
.swatch i {
  display: block;
  height: 3px;
  border-radius: 2px;
}

.swatch i:nth-child(1) {
  width: 9px;
  background: var(--kw);
}

.swatch i:nth-child(2) {
  width: 15px;
  background: var(--str);
}

.swatch i:nth-child(3) {
  width: 11px;
  background: var(--cmt);
}

.dot {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dot.none {
  background: transparent;
  position: relative;
}

.dot.none::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: 2px;
  width: 1.5px;
  background: rgba(255, 255, 255, 0.5);
  transform: translateX(-50%) rotate(45deg);
}

.swatch.active,
.dot.active {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.settings-btn {
  height: 28px;
  padding: 0 12px 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.15s, transform 0.1s;
}

.settings-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}

.settings-btn:active {
  transform: scale(0.96);
}

.settings-btn.on {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.clear {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.15s, transform 0.1s;
}

.clear:hover {
  background: rgba(255, 255, 255, 0.16);
}

.clear:active {
  transform: scale(0.96);
}
</style>

<style>
/* 设置面板被放到了 body 下面（Teleport），样式不能是 scoped */
.settings-panel {
  position: fixed;
  padding: 8px 14px 10px;
  border-radius: 12px;
  background: rgba(40, 40, 44, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  z-index: 30;
}
</style>
