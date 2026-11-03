import { describe, expect, it, vi } from 'vitest'
import { createExportCache } from '../../src/lib/exportCache'

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('export cache', () => {
  it('renders once and reuses the image while the state key does not change', async () => {
    const render = vi.fn(async (key) => `image of ${key}`)
    const cache = createExportCache(render)
    expect(await cache.get('a')).toBe('image of a')
    expect(await cache.get('a')).toBe('image of a')
    expect(await cache.get('a')).toBe('image of a')
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('throws the old image away as soon as the state changes', async () => {
    const render = vi.fn(async (key) => `image of ${key}`)
    const cache = createExportCache(render)
    await cache.get('a')
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(await cache.get('b')).toBe('image of b')
    expect(render).toHaveBeenCalledTimes(2)
    // 只保留最新一份：回到 a 要重新生成
    expect(await cache.get('a')).toBe('image of a')
    expect(render).toHaveBeenCalledTimes(3)
  })

  it('waits for a render that is already running instead of starting another one', async () => {
    let finish
    const render = vi.fn(() => new Promise((resolve) => (finish = resolve)))
    const cache = createExportCache(render)
    cache.prewarm('a') // 后台预先生成
    await tick()
    const clicked = cache.get('a') // 用户点击
    const clickedAgain = cache.get('a')
    expect(render).toHaveBeenCalledTimes(1)
    finish('done')
    expect(await clicked).toBe('done')
    expect(await clickedAgain).toBe('done')
  })

  it('does not keep failed results: the next request renders again', async () => {
    const render = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok')
    const cache = createExportCache(render)
    await expect(cache.get('a')).rejects.toThrow('boom')
    expect(cache.has('a')).toBe(false)
    expect(await cache.get('a')).toBe('ok')
    expect(render).toHaveBeenCalledTimes(2)
  })

  it('prewarm never throws', async () => {
    const cache = createExportCache(async () => {
      throw new Error('boom')
    })
    await expect(cache.prewarm('a')).resolves.toBeUndefined()
  })

  it('clear forgets the image', async () => {
    const render = vi.fn(async () => 'x')
    const cache = createExportCache(render)
    await cache.get('a')
    cache.clear()
    await cache.get('a')
    expect(render).toHaveBeenCalledTimes(2)
  })

  it('a result from an older key does not replace the newer one', async () => {
    let finishA
    const render = vi.fn((key) => (key === 'a' ? new Promise((r) => (finishA = r)) : Promise.resolve('image of b')))
    const cache = createExportCache(render)
    const a = cache.get('a')
    expect(await cache.get('b')).toBe('image of b')
    finishA('image of a')
    expect(await a).toBe('image of a')
    expect(cache.has('b')).toBe(true)
    expect(await cache.get('b')).toBe('image of b')
    expect(render).toHaveBeenCalledTimes(2)
  })
})
