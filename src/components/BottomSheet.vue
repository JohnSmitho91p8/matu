<script setup>
import { ref, watch } from 'vue'
import { t } from '../i18n'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
})
const emit = defineEmits(['close'])

// 下滑关闭：只在拖动把手 / 标题区域时跟手
const dragY = ref(0)
const dragging = ref(false)
let startY = 0

function onTouchStart(e) {
  startY = e.touches[0].clientY
  dragging.value = true
}

function onTouchMove(e) {
  dragY.value = Math.max(0, e.touches[0].clientY - startY)
}

function onTouchEnd() {
  dragging.value = false
  if (dragY.value > 80) emit('close')
  dragY.value = 0
}

watch(
  () => props.open,
  () => {
    dragY.value = 0
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-root">
        <div class="backdrop" @click="emit('close')"></div>
        <div
          class="sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :class="{ dragging }"
          :style="{ transform: dragY ? `translateY(${dragY}px)` : undefined }"
        >
          <div class="head" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend="onTouchEnd">
            <div class="handle"></div>
            <div class="title">{{ title }}</div>
          </div>
          <div class="body"><slot /></div>
          <button class="close" :aria-label="t('preview.close')" @click="emit('close')"></button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 75dvh;
  display: flex;
  flex-direction: column;
  border-radius: 16px 16px 0 0;
  background: rgba(34, 34, 38, 0.96);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding-bottom: env(safe-area-inset-bottom);
  color: #f2f2f3;
  transition: transform 0.25s ease;
}

.sheet.dragging {
  transition: none;
}

.head {
  padding: 8px 0 4px;
  touch-action: none;
}

.handle {
  width: 36px;
  height: 5px;
  margin: 0 auto 8px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.title {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  padding-bottom: 8px;
}

.body {
  padding: 4px 16px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* 无障碍用的关闭按钮，视觉上隐藏 */
.close {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  padding: 0;
  border: 0;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
