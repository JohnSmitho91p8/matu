<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { CODE_LANGUAGES, languageById } from '../config/languages'
import { t } from '../i18n'

const props = defineProps({
  // 'auto' 或手动锁定的语言 id
  modelValue: { type: String, required: true },
  // 自动识别的结果
  detected: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const trigger = ref(null)
const menuStyle = ref({})

const label = computed(() =>
  props.modelValue === 'auto'
    ? `${t('language.auto')} · ${languageById(props.detected).name}`
    : languageById(props.modelValue).name,
)

// 工具栏自己会横向滚动，菜单用 fixed 定位，避免被裁掉
async function toggle() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  const rect = trigger.value.getBoundingClientRect()
  menuStyle.value = {
    left: `${Math.max(8, rect.left)}px`,
    bottom: `${window.innerHeight - rect.top + 10}px`,
  }
}

function choose(id) {
  emit('update:modelValue', id)
  open.value = false
}

function close() {
  open.value = false
}

function onDocClick(e) {
  if (!open.value) return
  if (trigger.value?.contains(e.target) || e.target.closest?.('.code-lang-menu')) return
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
    aria-haspopup="listbox"
    :aria-expanded="open"
    :aria-label="t('toolbar.language')"
    :title="t('toolbar.language')"
    @click="toggle"
  >
    <span class="text">{{ label }}</span>
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M2.5 7.5L6 4l3.5 3.5" />
    </svg>
  </button>
  <Teleport to="body">
    <ul v-if="open" class="code-lang-menu" role="listbox" :aria-label="t('toolbar.language')" :style="menuStyle">
      <li
        role="option"
        :aria-selected="modelValue === 'auto'"
        :class="{ active: modelValue === 'auto' }"
        tabindex="0"
        @click="choose('auto')"
        @keydown.enter="choose('auto')"
      >
        {{ t('language.auto') }}
      </li>
      <li
        v-for="l in CODE_LANGUAGES"
        :key="l.id"
        role="option"
        :aria-selected="modelValue === l.id"
        :class="{ active: modelValue === l.id }"
        tabindex="0"
        @click="choose(l.id)"
        @keydown.enter="choose(l.id)"
      >
        {{ l.name }}
      </li>
    </ul>
  </Teleport>
</template>

<style scoped>
.trigger {
  height: 28px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  border: 0;
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

.trigger svg {
  transform: rotate(0deg);
  opacity: 0.7;
}
</style>

<style>
.code-lang-menu {
  position: fixed;
  min-width: 140px;
  margin: 0;
  padding: 4px;
  list-style: none;
  border-radius: 10px;
  background: rgba(40, 40, 44, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  z-index: 30;
  color: #f2f2f3;
}

.code-lang-menu li {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
}

.code-lang-menu li:hover,
.code-lang-menu li:focus-visible {
  background: rgba(255, 255, 255, 0.12);
}

.code-lang-menu li.active {
  font-weight: 600;
}
</style>
