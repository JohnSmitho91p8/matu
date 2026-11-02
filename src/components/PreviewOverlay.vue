<script setup>
import { t } from '../i18n'

defineProps({ url: { type: String, default: '' } })
defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="url" class="preview" role="dialog" aria-modal="true">
      <button class="close" :aria-label="t('preview.close')" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div class="scroll" @click.self="$emit('close')">
        <!-- 长按图片即可保存或转发（不要禁用 touch-callout） -->
        <img :src="url" alt="" />
      </div>
      <p class="tip">{{ t('preview.tip') }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.preview {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 12, 0.96);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.close {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 6px);
  right: calc(env(safe-area-inset-right) + 6px);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  z-index: 1;
}

.scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  padding: 60px 16px 8px;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: auto;
  border-radius: 4px;
  /* 透明背景的图在深色底上也看得清 */
  background: rgba(255, 255, 255, 0.04);
}

.tip {
  margin: 0;
  padding: 12px 16px 16px;
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
}
</style>
