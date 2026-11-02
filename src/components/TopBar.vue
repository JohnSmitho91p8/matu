<script setup>
import LanguageSwitcher from './LanguageSwitcher.vue'
import { t } from '../i18n'

defineProps({ mobile: { type: Boolean, default: false } })
defineEmits(['download', 'copy', 'share'])
</script>

<template>
  <header class="topbar" :class="{ mobile }">
    <div class="logo">{{ t('app.logo') }}</div>
    <div class="actions">
      <LanguageSwitcher :compact="mobile" />
      <!-- 手机：下载是图标按钮，主按钮是分享 -->
      <button
        v-if="mobile"
        class="icon-btn"
        :title="t('top.download')"
        :aria-label="t('top.download')"
        @click="$emit('download')"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
        </svg>
      </button>
      <button v-else class="btn btn-outline" :title="t('top.download.title')" @click="$emit('download')">
        {{ t('top.download') }}
      </button>
      <button
        v-if="mobile"
        class="btn btn-primary btn-lg"
        :title="t('top.share.title')"
        @click="$emit('share')"
      >
        {{ t('top.share') }}
      </button>
      <button v-else class="btn btn-primary" :title="t('top.copy.title')" @click="$emit('copy')">
        {{ t('top.copy') }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  min-height: 56px;
  /* 横屏时避开刘海 */
  padding: 0 max(24px, env(safe-area-inset-right)) 0 max(24px, env(safe-area-inset-left));
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
  align-items: center;
  gap: 10px;
}

.btn {
  height: 34px;
  padding: 0 16px;
  white-space: nowrap;
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
/* 手机：避开刘海和灵动岛，点击区域不小于 44px */
.topbar.mobile {
  padding: env(safe-area-inset-top) max(12px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left));
}

.topbar.mobile .actions {
  gap: 2px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
}

.icon-btn:active {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(0.94);
}

.btn-lg {
  height: 44px;
  margin-left: 4px;
  padding: 0 20px;
  font-size: 15px;
}
</style>
