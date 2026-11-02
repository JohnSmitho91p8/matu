import { ref } from 'vue'

// 屏幕宽度不超过 640px 时使用手机布局
const query = window.matchMedia('(max-width: 640px)')
export const isMobile = ref(query.matches)
query.addEventListener('change', (e) => {
  isMobile.value = e.matches
})
