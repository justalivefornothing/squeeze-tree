import { describe, expect, it } from 'vitest'
import { MinHeap } from './heap'
import {
  DecodeError,
  buildTree,
  canonicalCodes,
  codesFromLengths,
  compressionRatio,
  decode,
  encode,
  fixedWidthBits,
  fixedWidthCodes,
  frequencies,
  huffman,
  leavesInOrder,
  pathToRoot,
  totalBits,
  treeFromCodes,
} from './huffman'

const isPrefixFree = (codes: Map<string, string>): boolean => {
  const list = [...codes.values()]
  return list.every((a, i) => list.every((b, j) => i === j || !b.startsWith(a)))
}

describe('MinHeap', () => {
  it('pops in ascending order regardless of push order', () => {
    const heap = new MinHeap<number>((a, b) => a - b)
    for (const n of [5, 3, 8, 1, 9, 2, 7, 3]) heap.push(n)
    const out: number[] = []
    while (heap.size > 0) out.push(heap.pop() as number)
    expect(out).toEqual([1, 2, 3, 3, 5, 7, 8, 9])
    expect(heap.pop()).toBeUndefined()
  })

  it('keeps the heap invariant in its backing array', () => {
    const heap = new MinHeap<number>((a, b) => a - b)
    for (let i = 20; i > 0; i--) heap.push((i * 7) % 11)
    const arr = heap.toArray()
    for (let i = 1; i < arr.length; i++) expect(arr[(i - 1) >> 1]).toBeLessThanOrEqual(arr[i])
    expect(heap.peek()).toBe(Math.min(...arr))
  })
})

describe('huffman (spec)', () => {
  it('aaaabbc: a gets 1 bit, b gets 2 bits, 10 bits total', () => {
    const r = huffman('aaaabbc')
    expect(r.codes.get('a')?.length).toBe(1)
    expect(r.codes.get('b')?.length).toBe(2)
    expect(r.encoded.length).toBe(10)
  })

  it('abracadabra encodes to 23 bits', () => {
    expect(huffman('abracadabra').encoded.length).toBe(23)
  })

  it('round-trips through decode', () => {
    const text = 'the quick brown fox'
    const r = huffman(text)
    expect(decode(r.tree, r.encoded)).toBe(text)
  })

  it('a single distinct symbol gets code "0"', () => {
    const r = huffman('zzzz')
    expect(r.codes.get('z')).toBe('0')
    expect(r.encoded.length).toBe(4)
    expect(decode(r.tree, r.encoded)).toBe('zzzz')
  })

  it('fixed-width and ratio helpers', () => {
    expect(fixedWidthBits('abracadabra')).toBe(33)
    expect(compressionRatio('abracadabra')).toBeCloseTo(23 / 88, 4)
  })
})

describe('huffman (details)', () => {
  it('counts frequencies by code point in first-seen order', () => {
    expect([...frequencies('héllo 🌳🌳')]).toEqual([
      ['h', 1],
      ['é', 1],
      ['l', 2],
      ['o', 1],
      [' ', 1],
      ['🌳', 2],
    ])
  })

  it('breaks weight ties by first-seen order, then by merge order', () => {
    const { steps, initialHeap } = buildTree(frequencies('abcd'))
    expect(initialHeap.map((n) => n.char)).toEqual(['a', 'b', 'c', 'd'])
    expect(steps.map((s) => [s.left.char, s.right.char])).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      [null, null],
    ])
    expect(steps[2].left).toBe(steps[0].merged)
    expect(steps[2].right).toBe(steps[1].merged)
    expect(steps.at(-1)?.heapAfter).toHaveLength(1)
  })

  it('records parent pointers and heap snapshots for every merge', () => {
    const r = huffman('abracadabra')
    expect(r.steps).toHaveLength(r.leaves.length - 1)
    for (const leaf of r.leaves) expect(pathToRoot(leaf)[0]).toBe(r.tree)
    expect(r.steps.map((s) => s.heapAfter.length)).toEqual([4, 3, 2, 1])
    expect(totalBits(r.freq, r.codes)).toBe(23)
  })

  it('produces prefix-free codes whose weighted length matches the bitstream', () => {
    const text = 'it was the best of times, it was the worst of times'
    const r = huffman(text)
    expect(isPrefixFree(r.codes)).toBe(true)
    expect(totalBits(r.freq, r.codes)).toBe(r.encoded.length)
    expect(leavesInOrder(r.tree).map((n) => n.char).sort()).toEqual([...r.freq.keys()].sort())
  })

  it('handles empty text', () => {
    const r = huffman('')
    expect(r.tree).toBeNull()
    expect(r.encoded).toBe('')
    expect(decode(r.tree, '')).toBe('')
    expect(fixedWidthBits('')).toBe(0)
    expect(compressionRatio('')).toBe(0)
  })

  it('rejects invalid and truncated bitstreams', () => {
    const r = huffman('abracadabra')
    expect(() => decode(r.tree, '01x')).toThrow(DecodeError)
    expect(() => decode(r.tree, '01x')).toThrow(/at bit 2/)
    // The trailing "a" is a 1-bit code, so cut two bits to land inside "r".
    const truncated = r.encoded.slice(0, -2)
    expect(() => decode(r.tree, truncated)).toThrow(/middle of a code/)
    expect(() => decode(huffman('zz').tree, '01')).toThrow(DecodeError)
  })

  it('fixed-width codes number the sorted alphabet', () => {
    const codes = fixedWidthCodes(frequencies('abracadabra'))
    expect([...codes]).toEqual([
      ['a', '000'],
      ['b', '001'],
      ['c', '010'],
      ['d', '011'],
      ['r', '100'],
    ])
    expect(encode('abracadabra', codes)).toHaveLength(33)
  })
})

describe('canonical huffman', () => {
  it('rebuilds a prefix-free codebook from lengths alone', () => {
    const codes = codesFromLengths(new Map([['a', 1], ['b', 3], ['c', 3], ['d', 3], ['r', 3]]))
    expect([...codes]).toEqual([
      ['a', '0'],
      ['b', '100'],
      ['c', '101'],
      ['d', '110'],
      ['r', '111'],
    ])
  })

  it('preserves code lengths and decodes with a rebuilt tree', () => {
    const text = 'the quick brown fox jumps over the lazy dog'
    const r = huffman(text)
    const canon = canonicalCodes(r.codes)
    for (const [ch, code] of r.codes) expect(canon.get(ch)).toHaveLength(code.length)
    expect(isPrefixFree(canon)).toBe(true)
    const tree = treeFromCodes(canon, r.freq)
    expect(tree?.weight).toBe(text.length)
    expect(decode(tree, encode(text, canon))).toBe(text)
  })

  it('rebuilds a one-symbol tree as a single leaf', () => {
    const tree = treeFromCodes(new Map([['z', '0']]), new Map([['z', 4]]))
    expect(tree?.char).toBe('z')
    expect(tree?.weight).toBe(4)
    expect(decode(tree, '000')).toBe('zzz')
  })
})
