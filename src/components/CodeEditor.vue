<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getHighlighter, highlightLines, getCommentColor } from '../lib/highlighter'

const props = defineProps({
  modelValue: { type: String, default: '' },
  theme: { type: String, required: true },
  lineNumbers: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const textareaEl = ref(null)
const highlighter = ref(null)
const commentColor = ref(null)

// 高亮层缓存：上一次完整高亮的源码行与对应 HTML
let cachedLines = []
let cachedTokens = []
const lineTokens = ref([])

const lines = computed(() => props.modelValue.split('\n'))
const digits = computed(() => Math.max(2, String(lines.value.length).length))

// 输入后立刻渲染：与缓存相同的首尾行沿用旧颜色，改动的行先显示为纯文本，
// 等 50ms 防抖后的完整高亮再补上颜色，避免光标和文字错位或闪烁
function renderQuick() {
  const now = lines.value
  const old = cachedLines
  let p = 0
  while (p < now.length && p < old.length && now[p] === old[p]) p++
  let s = 0
  while (
    s < now.length - p &&
    s < old.length - p &&
    now[now.length - 1 - s] === old[old.length - 1 - s]
  ) {
    s++
  }
  lineTokens.value = now.map((text, i) => {
    if (i < p) return cachedTokens[i]
    if (i >= now.length - s) return cachedTokens[old.length - (now.length - i)]
    return [{ content: text, color: null, fontStyle: 0 }]
  })
}

function renderFull() {
  if (!highlighter.value) return
  cachedLines = lines.value
  cachedTokens = highlightLines(highlighter.value, props.modelValue, props.theme)
  lineTokens.value = cachedTokens
  commentColor.value = getCommentColor(highlighter.value, props.theme)
}

let timer
function scheduleFull() {
  clearTimeout(timer)
  timer = setTimeout(renderFull, 50)
}

watch(
  () => props.modelValue,
  () => {
    renderQuick()
    scheduleFull()
  },
  { immediate: true },
)
watch(() => props.theme, renderFull)

onMounted(async () => {
  highlighter.value = await getHighlighter()
  renderFull()
})

// ---- 编辑行为 ----
function insertText(text) {
  const el = textareaEl.value
  // execCommand 能保留浏览器的撤销栈；不可用时退回 setRangeText
  if (!document.execCommand('insertText', false, text)) {
    el.setRangeText(text, el.selectionStart, el.selectionEnd, 'end')
    emit('update:modelValue', el.value)
  }
}

function onKeydown(e) {
  if (e.key === 'Tab' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    insertText('    ')
  }
}

function onPaste(e) {
  const text = e.clipboardData?.getData('text/plain')
  if (text == null) return
  e.preventDefault()
  insertText(text.replace(/\r\n?/g, '\n').replace(/\t/g, '    '))
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<template>
  <div
    class="editor"
    :class="{ 'no-lineno': !lineNumbers }"
    :style="{
      '--digits': digits,
      '--lineno': commentColor ? `color-mix(in srgb, ${commentColor} 60%, transparent)` : 'inherit',
    }"
  >
    <!-- 高亮层：撑开卡片的宽高 -->
    <div class="layer" aria-hidden="true">
      <div v-for="(tokens, i) in lineTokens" :key="i" class="line" :data-n="i + 1"><span
          v-for="(t, j) in tokens"
          :key="j"
          :style="{
            color: t.color,
            fontStyle: t.fontStyle & 1 ? 'italic' : undefined,
            fontWeight: t.fontStyle & 2 ? 'bold' : undefined,
          }"
        >{{ t.content }}</span></div>
    </div>
    <!-- 编辑层：透明文字，叠在高亮层上 -->
    <textarea
      ref="textareaEl"
      class="input"
      :value="modelValue"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      wrap="soft"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
    ></textarea>
  </div>
</template>

<style scoped>
.editor {
  position: relative;
  /* 高亮层和编辑层共用同一套排版参数，必须保持一致 */
  --pad-top: 16px;
  --pad-x: 20px;
  --pad-bottom: 20px;
  --gutter: calc(var(--digits) * 1ch + 16px);
  font-family: var(--font-code);
  font-size: 15px;
  line-height: 1.6;
  tab-size: 4;
  font-variant-ligatures: none;
  font-kerning: none;
  letter-spacing: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: normal;
}

/* 关闭行号：不再依赖 --gutter，直接把左内边距写成和右侧一样的 20px */
.editor.no-lineno .layer,
.editor.no-lineno .input {
  padding-left: var(--pad-x);
}

.editor.no-lineno .line::before {
  display: none;
}

.line span {
  transition: color 0.2s;
}

.layer,
.input {
  margin: 0;
  padding: var(--pad-top) var(--pad-x) var(--pad-bottom) calc(var(--pad-x) + var(--gutter));
  border: 0;
  font: inherit;
  line-height: inherit;
  tab-size: inherit;
  font-variant-ligatures: inherit;
  font-kerning: inherit;
  letter-spacing: inherit;
  white-space: inherit;
  overflow-wrap: inherit;
  word-break: inherit;
}

.layer {
  position: relative;
  pointer-events: none;
  user-select: none;
}

.line {
  position: relative;
  min-height: 1.6em;
}

.line::before {
  content: attr(data-n);
  position: absolute;
  left: calc(-1 * var(--gutter));
  width: calc(var(--digits) * 1ch);
  text-align: right;
  color: var(--lineno);
  transition: color 0.2s;
}

.input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: transparent;
  caret-color: var(--fg);
  outline: none;
  -webkit-text-fill-color: transparent;
}

.input::selection {
  background: rgba(110, 150, 255, 0.35);
}
</style>
