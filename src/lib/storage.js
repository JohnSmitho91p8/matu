const KEY = 'matu:settings'

// 读不到、数据损坏或值不合法时，都退回默认值；migrate 可以先把旧版本的数据转换成新格式
export function loadSettings(defaults, validators, migrate) {
  const result = { ...defaults }
  try {
    let saved = JSON.parse(localStorage.getItem(KEY))
    if (saved && typeof saved === 'object') {
      if (migrate) saved = migrate(saved)
      for (const key of Object.keys(defaults)) {
        if (key in saved && validators[key](saved[key])) result[key] = saved[key]
      }
    }
  } catch (e) {
    // 隐私模式或数据损坏：忽略
  }
  return result
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch (e) {
    // 存储已满或被禁用：忽略
  }
}
