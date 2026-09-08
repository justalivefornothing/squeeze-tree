import {
  canonicalCodes,
  fixedWidth,
  fixedWidthCodes,
  huffman,
  leavesInOrder,
  treeFromCodes,
  type HuffNode,
  type HuffmanResult,
  type MergeStep,
} from './huffman/huffman'

/** Everything derived from the text alone. */
export interface Model {
  result: HuffmanResult
  canonCodes: Map<string, string>
  canonTree: HuffNode | null
  fwCodes: Map<string, string>
  /** Bits per symbol at fixed width. */
  fw: number
  merges: number
  leaves: number
  /** Timeline length: one tick per merge, then one per code assigned. */
  total: number
  /** Height of the finished tree (longest code). */
  height: number
}

/** What the page shows at one timeline position. */
export interface View {
  pos: number
  roots: HuffNode[]
  root: HuffNode | null
  active: MergeStep | null
  codes: Map<string, string>
  leafOrder: string[]
  leafByChar: Map<string, HuffNode>
  /** Code if assigned so far, otherwise `null` (still at fixed width). */
  shown: Map<string, string | null>
  /** Running bit count: fixed width for unassigned symbols, Huffman for assigned. */
  currentBits: number
  complete: boolean
}

export function buildModel(text: string): Model {
  const result = huffman(text)
  const canonCodes = canonicalCodes(result.codes)
  const leaves = result.leaves.length
  const merges = result.steps.length
  const height = result.tree && result.tree.char === null ? Math.max(...[...result.codes.values()].map((c) => c.length)) : 0
  return {
    result,
    canonCodes,
    canonTree: treeFromCodes(canonCodes, result.freq),
    fwCodes: fixedWidthCodes(result.freq),
    fw: fixedWidth(result.freq.size),
    merges,
    leaves,
    total: merges + leaves,
    height,
  }
}

export function viewAt(model: Model, rawPos: number, canonical: boolean): View {
  const { result, merges, leaves, total } = model
  const pos = Math.max(0, Math.min(rawPos, total))
  const treeDone = pos >= merges
  const useCanon = canonical && treeDone
  const root = useCanon ? model.canonTree : result.tree
  const codes = useCanon ? model.canonCodes : result.codes

  let roots: HuffNode[]
  if (!treeDone) roots = pos === 0 ? result.initialHeap : result.steps[pos - 1].heapAfter
  else roots = root ? [root] : []

  const orderedLeaves = leavesInOrder(root)
  const leafOrder = orderedLeaves.map((n) => n.char as string)
  const assignedCount = Math.max(0, Math.min(pos - merges, leaves))
  const assigned = new Set(leafOrder.slice(0, assignedCount))

  const shown = new Map<string, string | null>()
  let currentBits = 0
  for (const [ch, count] of result.freq) {
    const code = assigned.has(ch) ? (codes.get(ch) ?? null) : null
    shown.set(ch, code)
    currentBits += count * (code ? code.length : model.fw)
  }

  return {
    pos,
    roots,
    root,
    active: pos >= 1 && pos <= merges ? result.steps[pos - 1] : null,
    codes,
    leafOrder,
    leafByChar: new Map(orderedLeaves.map((n) => [n.char as string, n])),
    shown,
    currentBits,
    complete: pos >= total,
  }
}
