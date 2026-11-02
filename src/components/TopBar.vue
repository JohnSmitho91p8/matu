<script setup>
defineEmits(['download', 'copy'])
</script>

<template>
  <header class="topbar">
    <div class="logo">码图</div>
    <div class="actions">
      <button class="btn btn-outline" @click="$emit('download')">下载</button>
      <button class="btn btn-primary" @click="$emit('copy')">复制图片</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 56px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
}

.btn:active {
  transform: scale(0.96);
}

.btn-outline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.45);
}

.btn-primary:hover {
  background: #e8e8ea;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.15);
}

.btn-primary {
  background: #fff;
  color: #111;
  border: 1px solid #fff;
}
</style>
