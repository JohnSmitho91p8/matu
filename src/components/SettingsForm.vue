<script setup>
import { nextTick, ref, watch } from 'vue'
import { CODE_LANGUAGES } from '../config/languages'
import { FONT_SIZES, PADDINGS, WATERMARK_MAX_LENGTH } from '../config/defaults'
import { t } from '../i18n'
import { normalizeStartLine } from '../lib/startLine'

// 电脑上的设置面板和手机上的设置面板共用这一份内容；touch 为手机排版（更大的点击区域）
defineProps({
  touch: { type: Boolean, default: false },
  // 无背景时边距固定，不能调
  paddingDisabled: { type: Boolean, default: false },
})

const language = defineModel('language')
const padding = defineModel('padding')
const fontSize = defineModel('fontSize')
const lineNumbers = defineModel('lineNumbers')
const startLine = defineModel('startLine')

// 输入框里的文字单独保存：输入过程中允许是空的或不合法的，失去焦点或按回车时再整理
const startText = ref(String(startLine.value))
watch(startLine, (v) => {
  startText.value = String(v)
})

function commitStartLine() {
  const n = normalizeStartLine(startText.value)
  startLine.value = n
  startText.value = String(n)
}
const watermarkEnabled = defineModel('watermarkEnabled')
const watermarkText = defineModel('watermarkText')

const input = ref(null)

function toggleWatermark() {
  const next = !watermarkEnabled.value
  watermarkEnabled.value = next
  if (next) nextTick(() => input.value?.focus())
}
</script>

<template>
  <div class="form" :class="{ touch }" data-testid="settings">
    <div class="row" data-testid="language">
      <label class="label" for="settings-language">{{ t('toolbar.language') }}</label>
      <div class="select">
        <select id="settings-language" v-model="language">
          <option value="auto">{{ t('language.auto') }}</option>
          <option v-for="l in CODE_LANGUAGES" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </div>
    </div>

    <div class="row" data-testid="padding">
      <span class="label">{{ t('toolbar.padding') }}</span>
      <div class="seg">
        <button
          v-for="p in PADDINGS"
          :key="p.id"
          :class="{ active: padding === p.id }"
          :disabled="paddingDisabled"
          :title="t('size.' + p.id)"
          :aria-label="t('size.' + p.id)"
          :aria-pressed="padding === p.id"
          @click="padding = p.id"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div class="row" data-testid="font-size">
      <span class="label">{{ t('toolbar.fontSize') }}</span>
      <div class="seg">
        <button
          v-for="f in FONT_SIZES"
          :key="f.id"
          :class="{ active: fontSize === f.id }"
          :title="t('size.' + f.id)"
          :aria-label="t('size.' + f.id)"
          :aria-pressed="fontSize === f.id"
          @click="fontSize = f.id"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <div class="row" data-testid="line-numbers">
      <span class="label">{{ t('toolbar.lineNumbers') }}</span>
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

    <div class="row" data-testid="start-line">
      <label class="label" for="settings-start-line">{{ t('toolbar.startLine') }}</label>
      <input
        id="settings-start-line"
        v-model="startText"
        class="num"
        type="text"
        inputmode="numeric"
        maxlength="5"
        :disabled="!lineNumbers"
        autocomplete="off"
        @blur="commitStartLine"
        @keydown.enter="$event.target.blur()"
      />
    </div>

    <div class="row stacked" data-testid="watermark">
      <div class="line">
        <span class="label">{{ t('toolbar.watermark') }}</span>
        <button
          class="switch"
          :class="{ on: watermarkEnabled }"
          role="switch"
          :aria-checked="watermarkEnabled"
          :aria-label="t('watermark.show')"
          @click="toggleWatermark"
        >
          <i></i>
        </button>
      </div>
      <!-- 手机上输入框字号不能小于 16px，否则 iOS 聚焦时会自动放大页面 -->
      <input
        ref="input"
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
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  color: #f2f2f3;
  font-size: 14px;
}

.row {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.row.stacked {
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 8px;
  padding: 6px 0 2px;
}

.line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
}

.label {
  color: rgba(255, 255, 255, 0.7);
}

/* 语言下拉：用系统自带的选择器（手机上就是 iOS 的滚轮），外观统一 */
.select {
  position: relative;
  min-width: 140px;
}

.select select {
  width: 100%;
  height: 30px;
  padding: 0 28px 0 10px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  font: inherit;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  outline: none;
}

.select select:focus-visible {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.45);
}

.select option {
  color: #111;
}

.select svg {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.7;
  pointer-events: none;
}

.seg {
  display: flex;
  padding: 2px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.seg button {
  width: 36px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  transition: background 0.15s, color 0.15s, transform 0.1s;
}

.seg button:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.12);
}

.seg button:not(:disabled):active {
  transform: scale(0.94);
}

.seg button.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.seg button:disabled {
  opacity: 0.4;
  cursor: default;
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.2s, transform 0.1s;
}

.switch:active {
  transform: scale(0.94);
}

.switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
}

.switch.on {
  background: #34c759;
}

.switch.on i {
  left: 18px;
}

input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  outline: none;
}

input:focus {
  border-color: rgba(255, 255, 255, 0.5);
}

input.num {
  width: 80px;
  text-align: right;
}

input:disabled {
  opacity: 0.4;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

/* ---- 手机排版：所有点击区域不小于 44×44px，字号不小于 16px ---- */
.touch {
  font-size: 16px;
}

.touch .row {
  min-height: 52px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.touch .row:last-child {
  border-bottom: 0;
}

.touch .row.stacked {
  padding: 8px 0 10px;
  gap: 10px;
}

.touch .line {
  min-height: 44px;
}

.touch .select {
  min-width: 170px;
}

.touch .select select {
  height: 44px;
  padding: 0 34px 0 14px;
  font-size: 16px;
  border-radius: 10px;
}

.touch .select svg {
  right: 14px;
}

.touch .seg {
  padding: 3px;
  border-radius: 12px;
}

.touch .seg button {
  width: 56px;
  height: 44px;
  border-radius: 10px;
  font-size: 16px;
}

.touch .switch {
  width: 52px;
  height: 32px;
}

/* 开关本身只有 32px 高，用透明的伪元素把点击区域扩到 44px 以上 */
.touch .switch::before {
  content: '';
  position: absolute;
  inset: -8px -4px;
}

.touch .switch i {
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
}

.touch .switch.on i {
  left: 23px;
}

.touch input.num {
  width: 110px;
}

.touch input {
  height: 48px;
  padding: 0 14px;
  font-size: 16px;
  border-radius: 12px;
}
</style>
