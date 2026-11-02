<script setup>
import { computed, ref } from 'vue'
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
  lineNumbers: { type: Boolean, default: true },
  highlighted: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:code', 'update:filename', 'reset-filename', 'paste-code', 'toggle-line'])

// 导出的就是这个元素
const cardEl = ref(null)
defineExpose({ cardEl })

// 无背景时四周留 16px 透明边，避免导出时阴影被裁掉
const cardStyle = computed(() => ({
  background: props.background ? props.background.value : 'none',
  padding: `${props.background ? props.padding : 16}px`,
}))

function onFilenameBlur(e) {
  // 清空后恢复为跟随语言的文件名
  if (!props.filename.trim()) emit('reset-filename')
  e.target.scrollLeft = 0
}
</script>

<template>
  <div ref="cardEl" class="card" :style="cardStyle">
    <div
      class="window"
      :style="{ background: theme.bg, '--fg': theme.fg, '--scale': fontSize / BASE_FONT_SIZE }"
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
        :model-value="code"
        :theme="theme.id"
        :lang="lang"
        :font-size="fontSize"
        :line-numbers="lineNumbers"
        :highlighted="highlighted"
        @update:model-value="emit('update:code', $event)"
        @paste-code="emit('paste-code', $event)"
        @toggle-line="emit('toggle-line', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.card {
  min-width: 480px;
  max-width: 960px;
  flex-shrink: 0;
  margin: auto;
}

.window {
  border-radius: 12px;
  box-shadow: 0 20px 68px rgba(0, 0, 0, 0.55);
  color: var(--fg);
  overflow: hidden;
  /* 切换主题时颜色平滑过渡 */
  transition: background-color 0.2s, color 0.2s;
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
