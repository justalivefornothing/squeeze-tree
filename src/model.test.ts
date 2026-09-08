import { describe, expect, it } from 'vitest'
import { fixedWidthBits } from './huffman/huffman'
import { buildModel, viewAt } from './model'

describe('timeline model', () => {
  const text = 'abracadabra'
  const model = buildModel(text)

  it('has one tick per merge plus one per leaf', () => {
    expect(model.merges).toBe(4)
    expect(model.leaves).toBe(5)
    expect(model.total).toBe(9)
    expect(model.height).toBe(3)
    expect(model.fw).toBe(3)
  })

  it('starts as a forest of leaves at fixed width and ends at the Huffman total', () => {
    const start = viewAt(model, 0, false)
    expect(start.roots).toHaveLength(5)
    expect(start.active).toBeNull()
    expect(start.currentBits).toBe(fixedWidthBits(text))
    expect([...start.shown.values()].every((c) => c === null)).toBe(true)

    const end = viewAt(model, 99, false)
    expect(end.pos).toBe(9)
    expect(end.roots).toHaveLength(1)
    expect(end.complete).toBe(true)
    expect(end.currentBits).toBe(model.result.encoded.length)
  })

  it('ticks the bit count down one code at a time after the last merge', () => {
    const bits = Array.from({ length: model.total + 1 }, (_, p) => viewAt(model, p, false).currentBits)
    expect(bits.slice(0, model.merges + 1).every((b) => b === 33)).toBe(true)
    expect(bits.at(-1)).toBe(23)
    // 'a' (5 x 3 bits -> 5 x 1 bit) is assigned first because it is the shallowest leaf.
    expect(bits[model.merges + 1]).toBe(33 - 10)
  })

  it('keeps the leaf order fixed while the forest merges', () => {
    const orders = Array.from({ length: model.merges + 1 }, (_, p) => viewAt(model, p, false).leafOrder.join(''))
    expect(new Set(orders).size).toBe(1)
    expect(viewAt(model, 2, false).active?.merged.weight).toBe(4)
  })

  it('switches to the canonical tree only once the build is complete', () => {
    const mid = viewAt(model, 2, true)
    expect(mid.root).toBe(model.result.tree)
    const done = viewAt(model, model.total, true)
    expect(done.root).toBe(model.canonTree)
    expect(done.codes).toBe(model.canonCodes)
    expect(done.currentBits).toBe(23)
  })

  it('handles empty and single-symbol text', () => {
    const empty = viewAt(buildModel(''), 0, false)
    expect(empty.roots).toEqual([])
    expect(empty.complete).toBe(true)
    const one = buildModel('zzz')
    expect(one.total).toBe(1)
    expect(viewAt(one, 1, false).shown.get('z')).toBe('0')
    expect(viewAt(one, 1, false).currentBits).toBe(3)
  })
})
