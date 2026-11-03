<script setup>
import { computed, ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import SettingsForm from './SettingsForm.vue'
import { BACKGROUNDS } from '../config/backgrounds'
import { THEMES } from '../config/themes'
import { t } from '../i18n'

defineProps({ highlightCount: { type: Number, default: 0 } })
defineEmits(['clear-highlight'])

const language = defineModel('language')
const theme = defineModel('theme')
const background = defineModel('background')
const padding = defineModel('padding')
const fontSize = defineModel('fontSize')
const lineNumbers = defineModel('lineNumbers')
const startLine = defineModel('startLine')
const watermarkEnabled = defineModel('watermarkEnabled')
const watermarkText = defineModel('watermarkText')

// 常驻三项：主题、背景、设置；每一项是「图标 + 小字标签」，点击后从底部弹出面板
const ITEMS = [
  { id: 'theme', label: 'toolbar.theme', icon: 'M12 3a9 9 0 1 0 0 18V3z' },
  { id: 'background', label: 'toolbar.background', icon: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4' },
  {
    id: 'settings',
    label: 'toolbar.settings',
    // 齿轮：与电脑上的「设置」按钮相同
    icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  },
]

const openItem = ref(null)
const current = computed(() => ITEMS.find((i) => i.id === openItem.value))
</script>

<template>
  <nav class="mtoolbar" role="toolbar" :aria-label="t('toolbar.label')">
    <button v-for="item in ITEMS" :key="item.id" class="item" :data-testid="'item-' + item.id" @click="openItem = item.id">
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
    <!-- 主题 -->
    <div v-if="openItem === 'theme'" class="grid">
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

    <!-- 设置：和电脑上的设置面板是同一份内容，只是排版更大 -->
    <SettingsForm
      v-else-if="openItem === 'settings'"
      v-model:language="language"
      v-model:padding="padding"
      v-model:font-size="fontSize"
      v-model:line-numbers="lineNumbers"
        v-model:start-line="startLine"
      v-model:watermark-enabled="watermarkEnabled"
      v-model:watermark-text="watermarkText"
      :padding-disabled="background === 'none'"
      touch
    />
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
</style>
