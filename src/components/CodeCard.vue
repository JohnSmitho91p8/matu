<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CodeEditor from './CodeEditor.vue'
import { BASE_FONT_SIZE } from '../config/defaults'
import { t } from '../i18n'

const props = defineProps({
  code: { type: String, required: true },
  filename: { type: String, required: true },
  lang: { type: String, required: true },
  theme: { type: Object, required: true },
  // null 表示无背景
  background: { type: Object, default: null },
  padding: { type: Number, required: true },
  fontSize: { type: Number, default: BASE_FONT_SIZE },
  // 署名文字，空字符串表示不显示
  watermark: { type: String, default: '' },
  mobile: { type: Boolean, default: false },
  lineNumbers: { type: Boolean, default: true },
  // 行标记 [{ line, kind }]
  marks: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:code', 'update:filename', 'reset-filename', 'paste-code', 'toggle-line'])

// 导出的就是这个元素（始终按原始尺寸导出，屏幕上的缩放不影响它）
const cardEl = ref(null)
const fitEl = ref(null)
const editorRef = ref(null)
// 导出前先把还没做完的高亮做完，保证图片和最新的代码一致
defineExpose({ cardEl, flush: () => editorRef.value?.flush() })

// 卡片宽度跟随最长的一行，从不换行。比可用区域宽时，整张卡片等比例缩小到刚好放下：
// 缩小只用 transform，卡片自身的排版和不缩小时完全一致；外层 .fit 按缩小后的尺寸占位
const fit = ref({ scale: 1, width: 0, height: 0 })

function measure() {
  const card = cardEl.value
  const host = fitEl.value?.parentElement
  if (!card || !host) return
  const cs = getComputedStyle(host)
  const available = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  const width = card.offsetWidth
  const height = card.offsetHeight
  const scale = width > 0 ? Math.min(1, available / width) : 1
  fit.value = { scale, width: width * scale, height: height * scale }
}

let observer
onMounted(() => {
  observer = new ResizeObserver(measure)
  observer.observe(cardEl.value)
  observer.observe(fitEl.value.parentElement)
  measure()
})
onBeforeUnmount(() => observer?.disconnect())

const fitStyle = computed(() =>
  fit.value.width ? { width: `${fit.value.width}px`, height: `${fit.value.height}px` } : undefined,
)
const cardTransform = computed(() => (fit.value.scale < 1 ? `scale(${fit.value.scale})` : undefined))

// 无背景时卡片就是窗口本身：没有边距和阴影，圆角也小一些，导出的图片紧贴窗口边缘
const cardStyle = computed(() => ({
  background: props.background ? props.background.value : 'none',
  padding: `${props.background ? props.padding : 0}px`,
  '--scale': props.fontSize / BASE_FONT_SIZE,
  transform: cardTransform.value,
}))

// 署名：12px，随字号档位等比例变化
const MARK_SIZE = 12
const markLineHeight = computed(() => MARK_SIZE * (props.fontSize / BASE_FONT_SIZE) * 1.4)
// 有背景时放在窗口下方的边距里；无背景、或边距太小放不下时，放进窗口内部右下角
const markInside = computed(
  () => !props.background || props.padding < markLineHeight.value + 16,
)
const markOutsideStyle = computed(() => ({
  right: `${props.padding}px`,
  bottom: `${(props.padding - markLineHeight.value) / 2}px`,
}))

function onFilenameBlur(e) {
  // 清空后恢复为跟随语言的文件名
  if (!props.filename.trim()) emit('reset-filename')
  e.target.scrollLeft = 0
}
</script>

<template>
  <div ref="fitEl" class="fit" :class="{ mobile }" :style="fitStyle">
  <div ref="cardEl" class="card" :style="cardStyle">
    <div
      class="window"
      :class="{ bare: !background }"
      :style="{ background: theme.bg, '--fg': theme.fg, '--wrong': theme.wrong, '--right': theme.right, '--scale': fontSize / BASE_FONT_SIZE }"
    >
      <div class="titlebar">
        <div class="dots">
          <span style="background: #ff5f57"></span>
          <span style="background: #febc2e"></span>
          <span style="background: #28c840"></span>
        </div>
        <label class="filename" :data-value="filename">
          <input
            :value="filename"
            :aria-label="t('filename.label')"
            spellcheck="false"
            @input="emit('update:filename', $event.target.value)"
            @keydown.enter="$event.target.blur()"
            @focus="$event.target.select()"
            @blur="onFilenameBlur"
          />
        </label>
        <div class="dots-spacer"></div>
      </div>
      <CodeEditor
        ref="editorRef"
        :model-value="code"
        :theme="theme.id"
        :lang="lang"
        :font-size="fontSize"
        :mobile="mobile"
        :line-numbers="lineNumbers"
        :marks="marks"
        @update:model-value="emit('update:code', $event)"
        @paste-code="emit('paste-code', $event)"
        @toggle-line="emit('toggle-line', $event)"
      />
      <div v-if="watermark && markInside" class="mark mark-inside" :style="{ color: theme.comment }">
        {{ watermark }}
      </div>
    </div>
    <div v-if="watermark && !markInside" class="mark mark-outside" :style="markOutsideStyle">
      {{ watermark }}
    </div>
  </div>
  </div>
</template>

<style scoped>
.fit {
  flex-shrink: 0;
  margin: auto;
}

/* 手机：缩小后的卡片不高，贴着顶部放，不要在屏幕中间留一大片空白 */
.fit.mobile {
  margin: 0 auto;
}

/* 宽度跟随最长的一行（不换行），最小 480px；没有最大宽度 */
.card {
  position: relative;
  width: max-content;
  min-width: 480px;
  transform-origin: 0 0;
}

.window {
  border-radius: 12px;
  box-shadow: 0 20px 68px rgba(0, 0, 0, 0.55);
  color: var(--fg);
  overflow: hidden;
  /* 切换主题时颜色平滑过渡 */
  transition: background-color 0.2s, color 0.2s;
}

.mark {
  font-family: var(--font-ui);
  font-size: calc(12px * var(--scale, 1));
  line-height: 1.4;
  white-space: nowrap;
}

.mark-outside {
  position: absolute;
  color: rgba(255, 255, 255, 0.7);
}

/* 无背景：去掉阴影，圆角缩小，四角露出的透明区域尽量少 */
.window.bare {
  border-radius: 4px;
  box-shadow: none;
}

/* 在窗口里占一行，不会盖住代码 */
.mark-inside {
  margin-top: -8px;
  padding: 0 20px 12px;
  text-align: right;
}

.titlebar {
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dots {
  display: flex;
  gap: 8px;
  width: 52px;
}

.dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dots-spacer {
  width: 52px;
}

/* 输入框宽度跟随文字：隐藏的伪元素撑开宽度，input 叠在上面 */
.filename {
  display: inline-grid;
  font-size: calc(13px * var(--scale, 1));
  font-family: var(--font-ui);
  color: color-mix(in srgb, var(--fg) 60%, transparent);
}

.filename::after,
.filename input {
  grid-area: 1 / 1;
  font: inherit;
  padding: 2px 4px;
  white-space: pre;
}

.filename::after {
  content: attr(data-value) ' ';
  visibility: hidden;
}

.filename input {
  width: 100%;
  min-width: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  text-align: center;
  outline: none;
}

.filename input:focus {
  background: color-mix(in srgb, var(--fg) 10%, transparent);
}
</style>
