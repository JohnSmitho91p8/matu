<script setup>
import { BACKGROUNDS } from '../config/backgrounds'
import { THEMES } from '../config/themes'
import { PADDINGS } from '../config/defaults'
import CodeLanguagePicker from './CodeLanguagePicker.vue'
import { t } from '../i18n'

defineProps({ detectedLanguage: { type: String, required: true } })

const language = defineModel('language')
const theme = defineModel('theme')
const background = defineModel('background')
const padding = defineModel('padding')
const lineNumbers = defineModel('lineNumbers')
</script>

<template>
  <div class="toolbar" role="toolbar" :aria-label="t('toolbar.label')">
    <div class="group">
      <span class="label">{{ t('toolbar.language') }}</span>
      <CodeLanguagePicker v-model="language" :detected="detectedLanguage" />
    </div>
    <div class="divider"></div>
    <div class="group">
      <span class="label">{{ t('toolbar.theme') }}</span>
      <button
        v-for="th in THEMES"
        :key="th.id"
        class="swatch"
        :class="{ active: theme === th.id }"
        :title="t('theme.' + th.id)"
        :aria-label="t('theme.' + th.id)"
        :aria-pressed="theme === th.id"
        :style="{ background: th.bg, color: th.fg }"
        @click="theme = th.id"
      >
        A
      </button>
    </div>
    <div class="divider"></div>
    <div class="group">
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
    <div class="group">
      <span class="label">{{ t('toolbar.padding') }}</span>
      <div class="seg">
        <button
          v-for="p in PADDINGS"
          :key="p.id"
          :class="{ active: padding === p.id }"
          :disabled="background === 'none'"
          :title="t('padding.' + p.id)"
          :aria-label="t('padding.' + p.id)"
          :aria-pressed="padding === p.id"
          @click="padding = p.id"
        >
          {{ p.label }}
        </button>
      </div>
    </div>
    <div class="divider"></div>
    <div class="group">
      <span class="label">{{ t('toolbar.lineNumbers') }}</span>
      <button
        class="switch"
        :class="{ on: lineNumbers }"
        role="switch"
        :aria-checked="lineNumbers"
        :aria-label="t('toolbar.lineNumbers')"
        :title="t('toolbar.lineNumbers')"
        @click="lineNumbers = !lineNumbers"
      >
        <i></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
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
.dot,
.seg button,
.switch,
.switch i {
  transition: transform 0.15s, outline-color 0.15s, background 0.2s, left 0.2s, opacity 0.15s;
}

.swatch:hover,
.dot:hover {
  transform: scale(1.12);
}

.swatch:active,
.dot:active {
  transform: scale(0.92);
}

.seg button:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.12);
}

.seg button:not(:disabled):active,
.switch:active {
  transform: scale(0.94);
}

.group {
  display: flex;
  align-items: center;
  gap: 8px;
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
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-code);
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

.seg {
  display: flex;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 2px;
}

.seg button {
  width: 28px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.seg button.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.switch {
  width: 36px;
  height: 20px;
  padding: 0;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.2);
  position: relative;
}

.seg button:disabled {
  opacity: 0.4;
  cursor: default;
}

.switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
}

.switch.on {
  background: #34c759;
}

.switch.on i {
  left: 18px;
}
</style>
