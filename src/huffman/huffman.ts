import { MinHeap, type Compare } from './heap'

export interface HuffNode {
  id: number
  weight: number
  /** Creation order: leaves in first-seen order, then merged nodes in merge order. */
  order: number
  /** The symbol for a leaf, `null` for an internal node. */
  char: string | null
  left: HuffNode | null
  right: HuffNode | null
  parent: HuffNode | null
}

export interface MergeStep {
  /** The lightest node popped (becomes the `0` branch). */
  left: HuffNode
  /** The second-lightest node popped (becomes the `1` branch). */
  right: HuffNode
  merged: HuffNode
  /** Heap array snapshot after the merged node was pushed back. */
  heapAfter: HuffNode[]
}

export interface Build {
  tree: HuffNode | null
  leaves: HuffNode[]
  steps: MergeStep[]
  /** Heap array snapshot before any merge. */
  initialHeap: HuffNode[]
}

export interface HuffmanResult extends Build {
  text: string
  freq: Map<string, number>
  codes: Map<string, string>
  encoded: string
}

export class DecodeError extends Error {
  /** Index of the offending bit (or the stream length when it ended early). */
  readonly position: number

  constructor(message: string, position: number) {
    super(message)
    this.name = 'DecodeError'
    this.position = position
  }
}

/** Lighter first; ties broken by creation order so builds are deterministic. */
export const compareNodes: Compare<HuffNode> = (a, b) => a.weight - b.weight || a.order - b.order

/** Iterates by code point so astral symbols (emoji) count as one character. */
export const symbols = (text: string): string[] => Array.from(text)

/** Symbol -> count, in first-seen order. */
export function frequencies(text: string): Map<string, number> {
  const freq = new Map<string, number>()
  for (const ch of symbols(text)) freq.set(ch, (freq.get(ch) ?? 0) + 1)
  return freq
}

function makeNode(id: number, weight: number, order: number, char: string | null): HuffNode {
  return { id, weight, order, char, left: null, right: null, parent: null }
}

/**
 * Builds the Huffman tree bottom-up: every node starts in a min-heap; the two
 * lightest are popped, merged under a new parent and pushed back until one root
 * remains. Every merge is recorded so the UI can replay the construction.
 */
export function buildTree(freq: Map<string, number>): Build {
  let nextId = 0
  const leaves: HuffNode[] = []
  const heap = new MinHeap<HuffNode>(compareNodes)
  for (const [ch, weight] of freq) {
    const leaf = makeNode(nextId, weight, nextId, ch)
    nextId++
    leaves.push(leaf)
    heap.push(leaf)
  }
  const initialHeap = heap.toArray()
  const steps: MergeStep[] = []
  while (heap.size > 1) {
    const left = heap.pop() as HuffNode
    const right = heap.pop() as HuffNode
    const merged = makeNode(nextId, left.weight + right.weight, nextId, null)
    nextId++
    merged.left = left
    merged.right = right
    left.parent = merged
    right.parent = merged
    heap.push(merged)
    steps.push({ left, right, merged, heapAfter: heap.toArray() })
  }
  return { tree: heap.pop() ?? null, leaves, steps, initialHeap }
}

/** Depth-first walk, `0` on the left branch and `1` on the right. */
export function assignCodes(tree: HuffNode | null): Map<string, string> {
  const codes = new Map<string, string>()
  if (!tree) return codes
  // A single distinct symbol still needs one bit per occurrence.
  if (tree.char !== null) return codes.set(tree.char, '0')
  const walk = (node: HuffNode, prefix: string): void => {
    if (node.char !== null) {
      codes.set(node.char, prefix)
      return
    }
    if (node.left) walk(node.left, prefix + '0')
    if (node.right) walk(node.right, prefix + '1')
  }
  walk(tree, '')
  return codes
}

/** Leaves in the order a depth-first code assignment reaches them. */
export function leavesInOrder(tree: HuffNode | null): HuffNode[] {
  const out: HuffNode[] = []
  const walk = (node: HuffNode): void => {
    if (node.char !== null) out.push(node)
    if (node.left) walk(node.left)
    if (node.right) walk(node.right)
  }
  if (tree) walk(tree)
  return out
}

export function encode(text: string, codes: Map<string, string>): string {
  let bits = ''
  for (const ch of symbols(text)) {
    const code = codes.get(ch)
    if (code === undefined) throw new Error(`No code for symbol ${JSON.stringify(ch)}`)
    bits += code
  }
  return bits
}

/** Walks the tree bit by bit; throws `DecodeError` on a bad symbol or a truncated code. */
export function decode(tree: HuffNode | null, bits: string): string {
  if (!tree) {
    if (bits.length === 0) return ''
    throw new DecodeError('There is no tree to decode with — type some text first.', 0)
  }
  let out = ''
  let node = tree
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i]
    if (bit !== '0' && bit !== '1') {
      throw new DecodeError(`Invalid symbol ${JSON.stringify(bit)} at bit ${i}; expected 0 or 1.`, i)
    }
    if (tree.char !== null) {
      if (bit !== '0') throw new DecodeError(`Bit ${i} is 1 but the only code is "0".`, i)
      out += tree.char
      continue
    }
    node = (bit === '0' ? node.left : node.right) as HuffNode
    if (node.char !== null) {
      out += node.char
      node = tree
    }
  }
  if (node !== tree) {
    throw new DecodeError(`Stream ends after bit ${bits.length} in the middle of a code.`, bits.length)
  }
  return out
}

export function huffman(text: string): HuffmanResult {
  const freq = frequencies(text)
  const build = buildTree(freq)
  const codes = assignCodes(build.tree)
  return { ...build, text, freq, codes, encoded: encode(text, codes) }
}

export function totalBits(freq: Map<string, number>, codes: Map<string, string>): number {
  let bits = 0
  for (const [ch, count] of freq) bits += count * (codes.get(ch)?.length ?? 0)
  return bits
}

/** Bits per symbol for a fixed-width code over an alphabet of `size` symbols (at least one). */
export function fixedWidth(size: number): number {
  return size <= 1 ? 1 : Math.ceil(Math.log2(size))
}

export function fixedWidthBits(text: string): number {
  const syms = symbols(text)
  if (syms.length === 0) return 0
  return syms.length * fixedWidth(new Set(syms).size)
}

export function asciiBits(text: string): number {
  return symbols(text).length * 8
}

/** Huffman bits divided by 8-bit ASCII bits; `0` for empty text. */
export function compressionRatio(text: string): number {
  const ascii = asciiBits(text)
  return ascii === 0 ? 0 : huffman(text).encoded.length / ascii
}

/** Fixed-width codebook: symbols sorted by code point, numbered from zero. */
export function fixedWidthCodes(freq: Map<string, number>): Map<string, string> {
  const width = fixedWidth(freq.size)
  const sorted = [...freq.keys()].sort()
  return new Map(sorted.map((ch, i) => [ch, i.toString(2).padStart(width, '0')]))
}

/**
 * Canonical Huffman: the codebook is fully determined by the code lengths.
 * Symbols are sorted by (length, symbol); each code is the previous code plus
 * one, shifted left whenever the length grows.
 */
export function codesFromLengths(lengths: Map<string, number>): Map<string, string> {
  const sorted = [...lengths].sort(([chA, lenA], [chB, lenB]) => lenA - lenB || (chA < chB ? -1 : chA > chB ? 1 : 0))
  const codes = new Map<string, string>()
  let code = 0
  let prevLen = 0
  for (const [ch, len] of sorted) {
    code *= 2 ** (len - prevLen)
    codes.set(ch, code.toString(2).padStart(len, '0'))
    code++
    prevLen = len
  }
  return codes
}

export function canonicalCodes(codes: Map<string, string>): Map<string, string> {
  return codesFromLengths(new Map([...codes].map(([ch, code]) => [ch, code.length])))
}

/** Rebuilds a decoding tree from any prefix-free codebook; weights come from `freq` when given. */
export function treeFromCodes(codes: Map<string, string>, freq?: Map<string, number>): HuffNode | null {
  if (codes.size === 0) return null
  let nextId = 0
  const weightOf = (ch: string): number => freq?.get(ch) ?? 1
  const root = makeNode(nextId++, 0, 0, null)
  for (const [ch, code] of codes) {
    if (code === '0' && codes.size === 1) {
      root.char = ch
      root.weight = weightOf(ch)
      return root
    }
    let node = root
    for (const bit of code) {
      const side = bit === '0' ? 'left' : 'right'
      if (!node[side]) {
        const child = makeNode(nextId, 0, nextId, null)
        nextId++
        child.parent = node
        node[side] = child
      }
      node = node[side] as HuffNode
    }
    node.char = ch
    node.weight = weightOf(ch)
  }
  const sum = (node: HuffNode): number => {
    if (node.char !== null) return node.weight
    node.weight = (node.left ? sum(node.left) : 0) + (node.right ? sum(node.right) : 0)
    return node.weight
  }
  sum(root)
  return root
}

/** The chain of nodes from `node` up to its root, root first. */
export function pathToRoot(node: HuffNode): HuffNode[] {
  const path: HuffNode[] = []
  for (let cur: HuffNode | null = node; cur; cur = cur.parent) path.push(cur)
  return path.reverse()
}
