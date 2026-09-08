import { useMemo, useState } from 'react'
import { DecodeError, decode, type HuffNode } from '../huffman/huffman'

interface Props {
  tree: HuffNode | null
  encoded: string
}

type Outcome = { ok: true; text: string } | { ok: false; error: DecodeError }

const btn =
  'small-caps border border-ink px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:border-faint disabled:text-faint disabled:hover:bg-paper'

export function DecodePanel({ tree, encoded }: Props) {
  const [bits, setBits] = useState('')
  const clean = bits.replace(/\s+/g, '')

  const outcome = useMemo<Outcome | null>(() => {
    if (clean.length === 0) return null
    try {
      return { ok: true, text: decode(tree, clean) }
    } catch (e) {
      if (e instanceof DecodeError) return { ok: false, error: e }
      throw e
    }
  }, [tree, clean])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="bits" className="text-sm">
          Paste a bitstream and walk it down the tree.
        </label>
        <div className="flex gap-1">
          <button type="button" className={btn} onClick={() => setBits(encoded)} disabled={encoded.length === 0}>
            use encoded
          </button>
          <button type="button" className={btn} onClick={() => setBits('')} disabled={bits.length === 0}>
            clear
          </button>
        </div>
      </div>
      <textarea
        id="bits"
        value={bits}
        onChange={(e) => setBits(e.target.value)}
        rows={3}
        spellCheck={false}
        placeholder="0110100…"
        className="w-full resize-y border border-ink bg-paper p-2 font-mono text-[13px] leading-6 break-all placeholder:italic placeholder:text-rule focus:outline-2 focus:outline-offset-2 focus:outline-ink"
      />
      {outcome === null ? (
        <p className="text-xs italic text-rule">
          {clean.length === 0 && bits.length > 0 ? 'Only whitespace so far.' : 'Waiting for bits.'}
        </p>
      ) : outcome.ok ? (
        <div className="border-l-2 border-ink pl-3">
          <p className="small-caps text-xs font-semibold">
            decoded · {clean.length} bits → {Array.from(outcome.text).length} characters
          </p>
          <p className="mt-1 font-serif text-base leading-relaxed whitespace-pre-wrap break-words">{outcome.text}</p>
        </div>
      ) : (
        <div className="border-l-2 border-ink pl-3" role="alert">
          <p className="small-caps text-xs font-semibold">✗ invalid stream</p>
          <p className="mt-1 text-sm">{outcome.error.message}</p>
          <p className="mt-1 font-mono text-[13px] leading-6 break-all">
            {clean.slice(Math.max(0, outcome.error.position - 24), outcome.error.position)}
            <span className="bg-ink px-0.5 text-paper">{clean[outcome.error.position] ?? '⏎'}</span>
            <span className="text-rule">{clean.slice(outcome.error.position + 1, outcome.error.position + 12)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
