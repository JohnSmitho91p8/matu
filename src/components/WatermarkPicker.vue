<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { WATERMARK_MAX_LENGTH } from '../config/defaults'
import { t } from '../i18n'

const enabled = defineModel('enabled')
const text = defineModel('text')

const open = ref(false)
const trigger = ref(null)
const input = ref(null)
const panelStyle = ref({})

// 工具栏自己会横向滚动，面板用 fixed 定位，避免被裁掉
async function toggle() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  const rect = trigger.value.getBoundingClientRect()
  const width = 240
  panelStyle.value = {
    left: `${Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8)}px`,
    bottom: `${window.innerHeight - rect.top + 10}px`,
    width: `${width}px`,
  }
}

function toggleEnabled() {
  const next = !enabled.value
  enabled.value = next
  if (next) nextTick(() => input.value?.focus())
}

function close() {
  open.value = false
}

function onDocClick(e) {
  if (!open.value) return
  if (trigger.value?.contains(e.target) || e.target.closest?.('.watermark-panel')) return
  close()
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', close)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <button
    ref="trigger"
    class="trigger"
    :class="{ on: enabled && text.trim() }"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :title="t('toolbar.watermark')"
    @click="toggle"
  >
    {{ t('toolbar.watermark') }}
  </button>
  <Teleport to="body">
    <div v-if="open" class="watermark-panel" role="dialog" :aria-label="t('toolbar.watermark')" :style="panelStyle">
      <div class="row">
        <span>{{ t('watermark.show') }}</span>
        <button
          class="switch"
          :class="{ on: enabled }"
          role="switch"
          :aria-checked="enabled"
          :aria-label="t('watermark.show')"
          @click="toggleEnabled"
        >
          <i></i>
        </button>
      </div>
      <input
        ref="input"
        v-model="text"
        type="text"
        :maxlength="WATERMARK_MAX_LENGTH"
        placeholder="@yourname"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        :aria-label="t('watermark.text')"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.trigger {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.15s, transform 0.1s;
}

.trigger:hover {
  background: rgba(255, 255, 255, 0.16);
}

.trigger:active {
  transform: scale(0.96);
}

.trigger.on {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
</style>

<style>
.watermark-panel {
  position: fixed;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 12px;
  background: rgba(40, 40, 44, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  z-index: 30;
  color: #f2f2f3;
  font-size: 14px;
}

.watermark-panel .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.watermark-panel .switch {
  width: 36px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  position: relative;
  transition: background 0.2s;
}

.watermark-panel .switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
}

.watermark-panel .switch.on {
  background: #34c759;
}

.watermark-panel .switch.on i {
  left: 18px;
}

.watermark-panel input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  outline: none;
}

.watermark-panel input:focus {
  border-color: rgba(255, 255, 255, 0.5);
}

.watermark-panel input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
</style>
