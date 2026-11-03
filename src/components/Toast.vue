<script setup>
// action：可选的操作按钮 { label, run }，例如「撤销」
defineProps({
  message: { type: String, default: '' },
  action: { type: Object, default: null },
})
</script>

<template>
  <Transition name="toast">
    <div v-if="message" class="toast" role="status">
      <span>{{ message }}</span>
      <button v-if="action" class="action" @click="action.run()">{{ action.label }}</button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: calc(72px + env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 18px;
  background: rgba(40, 40, 44, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  font-size: 14px;
  /* 窄屏上长提示（日、韩文）要能换行，不能超出屏幕 */
  width: max-content;
  max-width: calc(100vw - 32px);
  text-align: center;
  z-index: 10;
}

.toast:has(.action) {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-right: 10px;
  text-align: left;
}

.action {
  flex-shrink: 0;
  min-height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.action:hover {
  background: rgba(255, 255, 255, 0.26);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
