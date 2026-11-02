<script setup>
defineProps({ message: { type: String, default: '' } })
</script>

<template>
  <Transition name="toast">
    <div v-if="message" class="toast">{{ message }}</div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(40, 40, 44, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  font-size: 14px;
  white-space: nowrap;
  z-index: 10;
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
