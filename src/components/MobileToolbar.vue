<script setup>
import { computed, ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import { BACKGROUNDS } from '../config/backgrounds'
import { THEMES } from '../config/themes'
import { CODE_LANGUAGES, languageById } from '../config/languages'
import { FONT_SIZES, PADDINGS, WATERMARK_MAX_LENGTH } from '../config/defaults'
import { t } from '../i18n'

defineProps({
  detectedLanguage: { type: String, required: true },
  highlightCount: { type: Number, default: 0 },
})
defineEmits(['clear-highlight'])

const language = defineModel('language')
const theme = defineModel('theme')
const background = defineModel('background')
const padding = defineModel('padding')
const fontSize = defineModel('fontSize')
const lineNumbers = defineModel('lineNumbers')
const watermarkEnabled = defineModel('watermarkEnabled')
const watermarkText = defineModel('watermarkText')

// 每一项：图标 + 小字标签，点击后从底部弹出面板
const ITEMS = [
  { id: 'language', label: 'toolbar.language', icon: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 5l-4 14' },
  { id: 'theme', label: 'toolbar.theme', icon: 'M12 3a9 9 0 1 0 0 18V3z' },
  { id: 'background', label: 'toolbar.background', icon: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4' },
  { id: 'padding', label: 'toolbar.padding', icon: 'M3 3h18v18H3zM8 8h8v8H8z' },
  { id: 'fontSize', label: 'toolbar.fontSize', icon: 'M3 19l5-14 5 14M5 14h6M15 19l3.5-9 3.5 9M16.3 16h4.4' },
  { id: 'lineNumbers', label: 'toolbar.lineNumbers', icon: 'M9 6h12M9 12h12M9 18h12M4 5v3M4 11h2l-2 3h2M4 17h2v2H4' },
  { id: 'watermark', label: 'toolbar.watermark', icon: 'M4 20h16M5 16c3-1 5-8 7-8s1 6 4 6c1.5 0 2-2 3-3' },
]

const openItem = ref(null)
const current = computed(() => ITEMS.find((i) => i.id === openItem.value))

function pickLanguage(id) {
  language.value = id
  openItem.value = null
}
</script>

<template>
  <nav class="mtoolbar" role="toolbar" :aria-label="t('toolbar.label')">
    <button v-for="item in ITEMS" :key="item.id" class="item" @click="openItem = item.id">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path :d="item.icon" />
      </svg>
      <span>{{ t(item.label) }}</span>
    </button>
    <button v-if="highlightCount > 0" class="item" @click="$emit('clear-highlight')">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
      <span>{{ t('toolbar.clearHighlight') }}</span>
    </button>
  </nav>

  <BottomSheet :open="openItem !== null" :title="current ? t(current.label) : ''" @close="openItem = null">
    <!-- 代码语言 -->
    <div v-if="openItem === 'language'" class="list">
      <button class="row" :class="{ active: language === 'auto' }" @click="pickLanguage('auto')">
        <span>{{ t('language.auto') }} · {{ languageById(detectedLanguage).name }}</span>
      </button>
      <button
        v-for="l in CODE_LANGUAGES"
        :key="l.id"
        class="row"
        :class="{ active: language === l.id }"
        @click="pickLanguage(l.id)"
      >
        <span>{{ l.name }}</span>
      </button>
    </div>

    <!-- 主题 -->
    <div v-else-if="openItem === 'theme'" class="grid">
      <button
        v-for="th in THEMES"
        :key="th.id"
        class="choice"
        :class="{ active: theme === th.id }"
        :aria-label="t('theme.' + th.id)"
        :aria-pressed="theme === th.id"
        @click="theme = th.id"
      >
        <span class="swatch" :style="{ background: th.bg, '--kw': th.keyword, '--str': th.string, '--cmt': th.comment }">
          <i></i><i></i><i></i>
        </span>
        <small>{{ t('theme.' + th.id) }}</small>
      </button>
    </div>

    <!-- 背景 -->
    <div v-else-if="openItem === 'background'" class="grid">
      <button
        v-for="b in BACKGROUNDS"
        :key="b.id"
        class="choice"
        :class="{ active: background === b.id }"
        :aria-label="t('bg.' + b.id)"
        :aria-pressed="background === b.id"
        @click="background = b.id"
      >
        <span class="dot" :style="{ background: b.value }"></span>
        <small>{{ t('bg.' + b.id) }}</small>
      </button>
      <button
        class="choice"
        :class="{ active: background === 'none' }"
        :aria-label="t('bg.none')"
        :aria-pressed="background === 'none'"
        @click="background = 'none'"
      >
        <span class="dot none"></span>
        <small>{{ t('bg.none') }}</small>
      </button>
    </div>

    <!-- 边距 -->
    <div v-else-if="openItem === 'padding'" class="seg">
      <button
        v-for="p in PADDINGS"
        :key="p.id"
        :class="{ active: padding === p.id }"
        :disabled="background === 'none'"
        :aria-pressed="padding === p.id"
        @click="padding = p.id"
      >
        {{ t('size.' + p.id) }}
      </button>
    </div>

    <!-- 字号 -->
    <div v-else-if="openItem === 'fontSize'" class="seg">
      <button
        v-for="f in FONT_SIZES"
        :key="f.id"
        :class="{ active: fontSize === f.id }"
        :aria-pressed="fontSize === f.id"
        @click="fontSize = f.id"
      >
        {{ t('size.' + f.id) }}
      </button>
    </div>

    <!-- 行号 -->
    <div v-else-if="openItem === 'lineNumbers'" class="list">
      <div class="row switch-row">
        <span>{{ t('toolbar.lineNumbers') }}</span>
        <button
          class="switch"
          :class="{ on: lineNumbers }"
          role="switch"
          :aria-checked="lineNumbers"
          :aria-label="t('toolbar.lineNumbers')"
          @click="lineNumbers = !lineNumbers"
        >
          <i></i>
        </button>
      </div>
    </div>

    <!-- 署名 -->
    <div v-else-if="openItem === 'watermark'" class="list">
      <div class="row switch-row">
        <span>{{ t('watermark.show') }}</span>
        <button
          class="switch"
          :class="{ on: watermarkEnabled }"
          role="switch"
          :aria-checked="watermarkEnabled"
          :aria-label="t('watermark.show')"
          @click="watermarkEnabled = !watermarkEnabled"
        >
          <i></i>
        </button>
      </div>
      <!-- 输入框字号必须不小于 16px，否则 iOS 聚焦时会自动放大页面 -->
      <input
        v-model="watermarkText"
        type="text"
        :maxlength="WATERMARK_MAX_LENGTH"
        placeholder="@yourname"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        :aria-label="t('watermark.text')"
      />
    </div>
  </BottomSheet>
</template>

<style scoped>
.mtoolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  padding: 6px max(8px, env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
  background: rgba(28, 28, 32, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow-x: auto;
  scrollbar-width: none;
}

.mtoolbar::-webkit-scrollbar {
  display: none;
}

.item {
  flex: 1 0 52px;
  min-height: 48px;
  padding: 4px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-size: 10.5px;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.item:active {
  color: #fff;
  transform: scale(0.94);
}

/* ---- 面板内容 ---- */
.list {
  display: flex;
  flex-direction: column;
}

.row {
  min-height: 48px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: inherit;
  font-size: 16px;
  text-align: left;
}

.list > .row:last-child {
  border-bottom: 0;
}

.row.active {
  font-weight: 600;
}

.row.active::after {
  content: '✓';
  color: #34c759;
}

.switch-row {
  cursor: default;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 8px;
}

.choice {
  min-height: 76px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  -webkit-tap-highlight-color: transparent;
}

.choice small {
  font-size: 12px;
  white-space: nowrap;
}

.choice.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.dot {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
}

.dot.none::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: rgba(255, 255, 255, 0.5);
  transform: translateX(-50%) rotate(45deg);
}

.swatch {
  width: 56px;
  height: 44px;
  padding: 8px 8px 7px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.swatch i {
  display: block;
  height: 4px;
  border-radius: 2px;
}

.swatch i:nth-child(1) {
  width: 14px;
  background: var(--kw);
}

.swatch i:nth-child(2) {
  width: 24px;
  background: var(--str);
}

.swatch i:nth-child(3) {
  width: 18px;
  background: var(--cmt);
}

.seg {
  display: flex;
  padding: 3px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.seg button {
  flex: 1;
  min-height: 48px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
}

.seg button.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.seg button:disabled {
  opacity: 0.4;
}

.switch {
  position: relative;
  width: 52px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.2s;
}

.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
}

/* 开关本身只有 32px 高，用透明的伪元素把点击区域扩到 44px 以上 */
.switch::before {
  content: '';
  position: absolute;
  inset: -8px -4px;
}

.switch.on {
  background: #34c759;
}

.switch.on i {
  left: 23px;
}

input {
  width: 100%;
  height: 48px;
  margin-top: 8px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  font-size: 16px;
  outline: none;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
</style>
