import { useEffect, useRef } from 'react'
import type { HuffNode, MergeStep } from '../huffman/huffman'
import { glyph } from './format'

interface Props {
  /** Every tree currently in the forest (the heap contents at this step). */
  roots: HuffNode[]
  /** Left-to-right order for leaves, fixed for the whole build so nothing jumps. */
  leafOrder: string[]
  /** Height of the finished tree, so the drawing keeps one size while it grows. */
  height: number
  /** The merge that just happened; drawn in red. */
  active: MergeStep | null
  /** Node ids on the hovered root-to-leaf path. */
  pathIds: ReadonlySet<number>
  onHover: (ch: string | null) => void
}

const COL = 46
const ROW = 56
const LEAF_W = 36
const LEAF_H = 40
const INT_W = 32
const INT_H = 22
const PAD = 14

interface Placed {
  node: HuffNode
  x: number
  y: number
  h: number
}

export function TreeView({ roots, leafOrder, height, active, pathIds, onHover }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const xOfLeaf = new Map(leafOrder.map((ch, i) => [ch, PAD + LEAF_W / 2 + i * COL]))
  const yOfHeight = (h: number): number => PAD + INT_H / 2 + (height - h) * ROW
  const placed = new Map<number, Placed>()

  const place = (node: HuffNode): Placed => {
    if (node.char !== null) {
      const p = { node, x: xOfLeaf.get(node.char) ?? PAD, y: yOfHeight(0), h: 0 }
      placed.set(node.id, p)
      return p
    }
    const l = place(node.left as HuffNode)
    const r = place(node.right as HuffNode)
    const h = 1 + Math.max(l.h, r.h)
    const p = { node, x: (l.x + r.x) / 2, y: yOfHeight(h), h }
    placed.set(node.id, p)
    return p
  }
  roots.forEach(place)

  const width = PAD * 2 + LEAF_W + Math.max(0, leafOrder.length - 1) * COL
  const svgHeight = yOfHeight(0) + LEAF_H / 2 + PAD

  // Wide trees overflow horizontally; start them centred so the root is in view.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [width])

  if (roots.length === 0) {
    return (
      <p className="border-y border-ink py-14 text-center text-sm italic text-rule">
        Type something above and the forest of leaves will appear here.
      </p>
    )
  }

  const edges: { parent: Placed; child: Placed; bit: '0' | '1' }[] = []
  for (const p of placed.values()) {
    if (p.node.char !== null) continue
    const l = placed.get((p.node.left as HuffNode).id)
    const r = placed.get((p.node.right as HuffNode).id)
    if (l) edges.push({ parent: p, child: l, bit: '0' })
    if (r) edges.push({ parent: p, child: r, bit: '1' })
  }

  const activeIds = active ? new Set([active.merged.id, active.left.id, active.right.id]) : new Set<number>()

  return (
    <div ref={scroller} className="overflow-x-auto border-y border-ink py-2" onMouseLeave={() => onHover(null)}>
      <svg
        width={width}
        height={svgHeight}
        viewBox={`0 0 ${width} ${svgHeight}`}
        className="mx-auto block"
        role="img"
        aria-label="Huffman tree under construction"
      >
        {edges.map(({ parent, child, bit }) => {
          const top = parent.y + INT_H / 2
          const bus = parent.y + ROW * 0.55
          const childTop = child.y - (child.node.char !== null ? LEAF_H : INT_H) / 2
          const red = active?.merged.id === parent.node.id
          const onPath = pathIds.has(child.node.id) && pathIds.has(parent.node.id)
          return (
            <g key={child.node.id} className="edge-enter">
              <path
                d={`M${parent.x},${top} V${bus} H${child.x} V${childTop}`}
                pathLength={1}
                fill="none"
                className={red ? 'stroke-red' : 'stroke-ink'}
                strokeWidth={onPath ? 2.5 : red ? 1.75 : 1}
              />
              <text
                x={child.x + (bit === '0' ? -5 : 5)}
                y={childTop - 4}
                textAnchor={bit === '0' ? 'end' : 'start'}
                className={`font-mono text-[10px] ${red ? 'fill-red' : onPath ? 'fill-ink font-medium' : 'fill-rule'}`}
              >
                {bit}
              </text>
            </g>
          )
        })}
        {[...placed.values()].map((p) => {
          const leaf = p.node.char !== null
          const red = activeIds.has(p.node.id)
          const merged = active?.merged.id === p.node.id
          const onPath = pathIds.has(p.node.id)
          const w = leaf ? LEAF_W : INT_W
          const h = leaf ? LEAF_H : INT_H
          const fill = merged ? 'fill-red' : onPath && leaf ? 'fill-ink' : 'fill-paper'
          const text = merged || (onPath && leaf) ? 'fill-paper' : red ? 'fill-red' : 'fill-ink'
          return (
            <g
              key={p.node.id}
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
              className="transition-transform duration-500 ease-out"
              onMouseEnter={leaf ? () => onHover(p.node.char) : undefined}
            >
              <g className={merged ? 'node-enter' : undefined}>
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  className={`${fill} ${red ? 'stroke-red' : 'stroke-ink'}`}
                  strokeWidth={onPath || red ? 2 : 1}
                />
                {leaf ? (
                  <>
                    <text y={-2} textAnchor="middle" className={`font-mono text-[15px] ${text}`}>
                      {glyph(p.node.char as string)}
                    </text>
                    <text y={13} textAnchor="middle" className={`font-serif text-[10px] tabular-nums ${text}`}>
                      {p.node.weight}
                    </text>
                  </>
                ) : (
                  <text y={4} textAnchor="middle" className={`font-mono text-[11px] tabular-nums ${text}`}>
                    {p.node.weight}
                  </text>
                )}
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
