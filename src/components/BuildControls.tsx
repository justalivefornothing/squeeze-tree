import type { ReactNode } from 'react'
import { compareNodes, type HuffNode, type MergeStep } from '../huffman/huffman'
import { glyph } from './format'

interface Props {
  pos: number
  merges: number
  leaves: number
  playing: boolean
  heap: HuffNode[]
  active: MergeStep | null
  onSeek: (pos: number) => void
  onTogglePlay: () => void
}

function Btn({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="h-8 min-w-8 border border-ink px-2 font-mono text-xs leading-none transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:border-faint disabled:text-faint disabled:hover:bg-paper"
    >
      {children}
    </button>
  )
}

const nodeLabel = (n: HuffNode): string => (n.char !== null ? glyph(n.char) : '•')

export function BuildControls({ pos, merges, leaves, playing, heap, active, onSeek, onTogglePlay }: Props) {
  const total = merges + leaves
  const atEnd = pos >= total
  const nextPair = pos < merges ? heap.slice().sort(compareNodes).slice(0, 2) : []
  const nextIds = new Set(nextPair.map((n) => n.id))

  let status: ReactNode
  if (total === 0) status = <span className="italic text-rule">Waiting for text.</span>
  else if (pos === 0 && merges > 0) status = <>Ready — {leaves} leaves waiting in the heap.</>
  else if (pos <= merges && active)
    status = (
      <>
        Merge {pos} of {merges}: pop <b>{nodeLabel(active.left)}</b>
        <sub className="font-serif text-[10px]">{active.left.weight}</sub> and <b>{nodeLabel(active.right)}</b>
        <sub className="font-serif text-[10px]">{active.right.weight}</sub>, push back <b className="text-red">•</b>
        <sub className="font-serif text-[10px]">{active.merged.weight}</sub>.
      </>
    )
  else if (!atEnd) status = <>Assigning codes by depth-first walk — {pos - merges} of {leaves}.</>
  else status = <>Complete — {leaves} prefix-free codes assigned.</>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex gap-1">
          <Btn onClick={() => onSeek(0)} disabled={pos === 0} label="Back to start">
            |◁
          </Btn>
          <Btn onClick={() => onSeek(pos - 1)} disabled={pos === 0} label="Previous step">
            ◁
          </Btn>
          <Btn onClick={onTogglePlay} disabled={total === 0} label={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}>
            <span className="inline-block w-12">{playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}</span>
          </Btn>
          <Btn onClick={() => onSeek(pos + 1)} disabled={atEnd} label="Next step">
            ▷
          </Btn>
          <Btn onClick={() => onSeek(total)} disabled={atEnd} label="Skip to end">
            ▷|
          </Btn>
        </div>
        <p className="font-mono text-xs tabular-nums">{status}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="small-caps font-semibold">heap array</span>
        {heap.length === 0 && <span className="italic text-rule">empty</span>}
        {heap.map((n, i) => {
          const next = nextIds.has(n.id)
          return (
            <span
              key={n.id}
              title={`index ${i}, weight ${n.weight}`}
              className={`inline-flex h-7 min-w-7 items-center justify-center gap-0.5 border px-1.5 font-mono transition-colors ${next ? 'border-red text-red' : 'border-ink'}`}
            >
              {nodeLabel(n)}
              <sub className="font-serif text-[9px]">{n.weight}</sub>
            </span>
          )
        })}
        {nextPair.length === 2 && (
          <span className="ml-1 italic text-rule">
            next pop: {nodeLabel(nextPair[0])} and {nodeLabel(nextPair[1])}
          </span>
        )}
      </div>
    </div>
  )
}
