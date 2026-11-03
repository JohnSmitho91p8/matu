import { describe, expect, it } from 'vitest'
import { MAX_PIXELS_DESKTOP, MAX_PIXELS_IOS, MAX_SIDE, chooseScale } from '../../src/lib/exporter'

describe('chooseScale', () => {
  it('keeps the wanted scale when the image fits', () => {
    expect(chooseScale(733, 664, 2, { maxPixels: MAX_PIXELS_DESKTOP })).toBe(2)
    expect(chooseScale(733, 664, 3, { maxPixels: MAX_PIXELS_IOS })).toBe(3)
  })

  it('never goes above the wanted scale', () => {
    expect(chooseScale(100, 100, 2, { maxPixels: MAX_PIXELS_DESKTOP })).toBe(2)
    expect(chooseScale(100, 100, 1, { maxPixels: MAX_PIXELS_DESKTOP })).toBe(1)
  })

  it('lowers the scale step by step when the canvas would be too big', () => {
    // 手机上 3 倍超过 iOS 的面积上限，2 倍也超过，1 倍可以
    expect(chooseScale(900, 7300, 3, { maxPixels: MAX_PIXELS_IOS })).toBe(1)
    // 2 倍刚好放得下
    expect(chooseScale(1000, 2000, 3, { maxPixels: MAX_PIXELS_IOS })).toBe(2)
    expect(chooseScale(1000, 2000, 3, { maxPixels: MAX_PIXELS_DESKTOP })).toBe(3)
  })

  it('also respects the longest side', () => {
    expect(chooseScale(11182, 292, 3, { maxPixels: MAX_PIXELS_DESKTOP })).toBe(2)
    expect(chooseScale(18000, 292, 2, { maxPixels: MAX_PIXELS_DESKTOP })).toBe(1)
  })

  it('gives up (null) when even 1x does not fit', () => {
    expect(chooseScale(MAX_SIDE + 1, 300, 3, { maxPixels: MAX_PIXELS_DESKTOP })).toBeNull()
    expect(chooseScale(800, 24_000, 3, { maxPixels: MAX_PIXELS_IOS })).toBeNull()
    expect(chooseScale(800, 24_000, 3, { maxPixels: MAX_PIXELS_DESKTOP })).toBe(1)
  })

  it('the safe limits stay below what browsers actually allow', () => {
    // iOS Safari：16,777,216 像素；桌面浏览器至少 2.68 亿像素、单边 32,767
    expect(MAX_PIXELS_IOS).toBeLessThan(16_777_216)
    expect(MAX_PIXELS_DESKTOP).toBeLessThan(268_435_456)
    expect(MAX_SIDE).toBeLessThan(32_767)
  })
})
