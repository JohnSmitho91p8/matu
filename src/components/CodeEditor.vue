<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { cleanPastedText, replacesWholeDocument } from '../lib/paste'
import { getHighlighter, highlightLines, getCommentColor } from '../lib/highlighter'

const props = defineProps({
  modelValue: { type: String, default: '' },
  theme: { type: String, required: true },
  lang: { type: String, required: true },
  lineNumbers: { type: Boolean, default: true },
  fontSize: { type: Number, default: 15 },
  mobile: { type: Boolean, default: false },
  // 被高亮的行号（0 开始）
  highlighted: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'paste-code', 'toggle-line'])

const textareaEl = ref(null)
const layerEl = ref(null)
const hoverLine = ref(-1)
const highlighter = ref(null)
const commentColor = ref(null)

// 高亮层缓存：上一次完整高亮的源码行与对应 HTML
let cachedLines = []
let cachedTokens = []
const lineTokens = ref([])

const lines = computed(() => props.modelValue.split('\n'))
const highlightedSet = computed(() => new Set(props.highlighted))
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
  cachedTokens = highlightLines(highlighter.value, props.modelValue, props.theme, props.lang)
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
watch(() => [props.theme, props.lang], renderFull)

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
  const el = textareaEl.value
  const replacedAll = replacesWholeDocument(el.value, el.selectionStart, el.selectionEnd)
  const cleaned = cleanPastedText(text)
  if (!cleaned.trim()) return
  insertText(cleaned)
  emit('paste-code', { replacedAll })
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

// ---- 点击行号切换高亮 ----
// 编辑框盖在高亮层上面，所以用鼠标位置反查：落在行号那一列，就找出对应的行
function lineIndexAt(e) {
  if (!props.lineNumbers) return -1
  const layer = layerEl.value
  const rect = layer.getBoundingClientRect()
  // 整张卡片可能被缩小显示，屏幕上的尺寸要换算回排版尺寸
  const zoom = rect.width / layer.offsetWidth || 1
  const gutterRight = (parseFloat(getComputedStyle(layer).paddingLeft) - 4) * zoom
  const x = e.clientX - rect.left
  if (x < 0 || x > gutterRight) return -1
  const rows = layer.children
  let lo = 0
  let hi = rows.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const r = rows[mid].getBoundingClientRect()
    if (e.clientY < r.top) hi = mid - 1
    else if (e.clientY >= r.bottom) lo = mid + 1
    else return mid
  }
  return -1
}

function onMouseMove(e) {
  hoverLine.value = lineIndexAt(e)
}

function onMouseDown(e) {
  // 点在行号上不要把光标放进编辑框
  if (lineIndexAt(e) >= 0) e.preventDefault()
}

function onClick(e) {
  const index = lineIndexAt(e)
  if (index >= 0) emit('toggle-line', { index, shift: e.shiftKey })
}
</script>

<template>
  <div
    class="editor"
    :class="{ 'no-lineno': !lineNumbers, 'has-hl': highlighted.length > 0, 'on-gutter': hoverLine >= 0 }"
    :style="{
      '--digits': digits,
      fontSize: `${fontSize}px`,
      '--k': mobile ? Math.max(1, 16 / fontSize) : 1,
      '--lineno': commentColor ? `color-mix(in srgb, ${commentColor} 60%, transparent)` : 'inherit',
    }"
  >
    <!-- 高亮层：撑开卡片的宽高 -->
    <div ref="layerEl" class="layer" aria-hidden="true">
      <div
        v-for="(tokens, i) in lineTokens"
        :key="i"
        class="line"
        :class="{ hl: highlightedSet.has(i), hover: hoverLine === i }"
        :data-n="i + 1"
      ><span
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
      wrap="off"
      :aria-label="t('editor.label')"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
      @mousemove="onMouseMove"
      @mouseleave="hoverLine = -1"
      @mousedown="onMouseDown"
      @click="onClick"
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
  line-height: 1.6;
  tab-size: 4;
  font-variant-ligatures: none;
  font-kerning: none;
  letter-spacing: 0;
  white-space: pre;
}

/* 关闭行号：不再依赖 --gutter，直接把左内边距写成和右侧一样的 20px */
.editor.no-lineno .layer {
  padding-left: var(--pad-x);
}

.editor.no-lineno .input {
  padding-left: calc(var(--pad-x) * var(--k, 1));
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
}

/* z-index 让行高亮的色带（z-index: -1）留在这一层里面，不会沉到窗口背景下面 */
.layer {
  position: relative;
  z-index: 0;
  pointer-events: none;
  user-select: none;
}

.line {
  position: relative;
  min-height: 1.6em;
  transition: opacity 0.15s;
}

/* 有行被高亮时：其余行变暗，被高亮的行加一条淡色带，左右延伸到窗口边缘 */
.has-hl .line {
  opacity: 0.35;
}

.has-hl .line.hl {
  opacity: 1;
}

.line.hl::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(-1 * (var(--pad-x) + var(--gutter)));
  right: calc(-1 * var(--pad-x));
  background: color-mix(in srgb, var(--fg) 8%, transparent);
  z-index: -1;
}

.no-lineno .line.hl::after {
  left: calc(-1 * var(--pad-x));
}

.line.hover::before {
  color: color-mix(in srgb, var(--fg) 60%, transparent);
}

.on-gutter .input {
  cursor: pointer;
}

.line::before {
  content: attr(data-n);
  position: absolute;
  /* 右边缘贴着代码左侧 16px 处；不写死宽度，避免导出时数字因小数像素被挤到两行 */
  right: calc(100% + 16px);
  white-space: nowrap;
  text-align: right;
  color: var(--lineno);
  transition: color 0.2s;
}

.input {
  position: absolute;
  top: 0;
  left: 0;
  /* iOS 在输入框字号小于 16px 时，聚焦会自动放大页面。
     所以手机上编辑框用 ≥16px 的字号（--k 倍），再整体缩小 1/--k 贴回高亮层：
     字号、内边距、宽高都按同一个倍数放大，文字位置和高亮层完全一致，
     导出的图片不用编辑框，不受影响。--k 为 1 时（电脑、17px 字号）这些都不起作用 */
  width: calc(100% * var(--k, 1));
  height: calc(100% * var(--k, 1));
  font-size: calc(1em * var(--k, 1));
  padding: calc(var(--pad-top) * var(--k, 1)) calc(var(--pad-x) * var(--k, 1)) calc(var(--pad-bottom) * var(--k, 1))
    calc(var(--pad-x) * var(--k, 1) + var(--digits) * 1ch + 16px * var(--k, 1));
  transform: scale(calc(1 / var(--k, 1)));
  transform-origin: 0 0;
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
