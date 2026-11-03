// 导出图片的缓存：只保留最新的一份。
// key 是「会影响图片内容的全部状态」的摘要：状态不变就直接用缓存，状态变了缓存自动失效。
// 正在生成的那一份也算：点击时如果同一个 key 已经在生成，就等它生成完，不会重复生成。
export function createExportCache(render) {
  let entry = null // { key, promise }

  return {
    get(key) {
      if (entry?.key === key) return entry.promise
      const promise = Promise.resolve()
        .then(() => render(key))
        .catch((error) => {
          // 失败的结果不缓存，下次重新生成
          if (entry?.promise === promise) entry = null
          throw error
        })
      entry = { key, promise }
      return promise
    },

    // 这个 key 的图片是否已经有了（生成中也算）
    has(key) {
      return entry?.key === key
    },

    // 提前生成，不关心结果（出错了也不抛）
    prewarm(key) {
      return this.get(key).catch(() => {})
    },

    clear() {
      entry = null
    },
  }
}
