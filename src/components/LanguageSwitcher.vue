<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { LANGUAGES, lang, setLang, t } from '../i18n'

defineProps({ compact: { type: Boolean, default: false } })

const open = ref(false)
const root = ref(null)

const current = computed(() => LANGUAGES.find((l) => l.code === lang.value))

function choose(code) {
  setLang(code)
  open.value = false
}

function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="lang">
    <button
      class="trigger"
      :class="{ compact }"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="t('lang.label')"
      :title="t('lang.label')"
      @click="open = !open"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.6 2.6 3.9 5.6 3.9 9S14.6 18.4 12 21c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" />
      </svg>
      <span v-if="!compact">{{ current.name }}</span>
    </button>
    <ul v-if="open" class="menu" role="listbox" :aria-label="t('lang.label')">
      <li
        v-for="l in LANGUAGES"
        :key="l.code"
        role="option"
        :aria-selected="l.code === lang"
        :class="{ active: l.code === lang }"
        :lang="l.htmlLang"
        tabindex="0"
        @click="choose(l.code)"
        @keydown.enter="choose(l.code)"
      >
        {{ l.name }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.lang {
  position: relative;
}

.trigger {
  height: 34px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, transform 0.1s;
}

.trigger.compact {
  width: 44px;
  height: 44px;
  padding: 0;
  justify-content: center;
}

.trigger:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.trigger:active {
  transform: scale(0.96);
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 140px;
  margin: 0;
  padding: 4px;
  list-style: none;
  border-radius: 10px;
  background: rgba(40, 40, 44, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  z-index: 20;
}

.menu li {
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
}

.menu li:hover,
.menu li:focus-visible {
  background: rgba(255, 255, 255, 0.12);
}

.menu li.active {
  color: #fff;
  font-weight: 600;
}
</style>
