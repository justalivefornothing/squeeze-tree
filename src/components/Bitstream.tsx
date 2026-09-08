import { useEffect, useState } from 'react'
import { symbols } from '../huffman/huffman'
import { glyph } from './format'

interface Props {
  text: string
  freq: Map<string, number>
  shown: Map<string, string | null>
  fwCodes: Map<string, string>
  bits: number
  complete: boolean
  hoverChar: string | null
  onHover: (ch: string | null) => void
}

const SHADES = ['bg-paper', 'bg-neutral-100', 'bg-neutral-200', 'bg-neutral-300']
const MAX_CHUNKS = 3000

export function Bitstream({ text, freq, shown, fwCodes, bits, complete, hoverChar, onHover }: Props) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])

  const syms = symbols(text)
  if (syms.length === 0) {
    return <p className="border-t border-ink py-6 text-center text-sm italic text-rule">The bitstream is empty.</p>
  }
  const shade = new Map([...freq.keys()].map((ch, i) => [ch, SHADES[i % SHADES.length]]))
  const stream = syms.map((ch) => shown.get(ch) ?? fwCodes.get(ch) ?? '').join('')

  const copy = () => {
    navigator.clipboard?.writeText(stream).then(() => setCopied(true), () => undefined)
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="tabular-nums">
          <b className="text-base">{bits}</b> bits
          {!complete && <span className="italic text-rule"> — grey chunks still at fixed width</span>}
        </span>
        <button
          type="button"
          onClick={copy}
          className="small-caps border border-ink px-2 py-0.5 font-semibold transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {copied ? 'copied' : 'copy bits'}
        </button>
      </div>
      <p
        className="max-h-64 overflow-y-auto border-y border-ink py-2 font-mono text-[13px] leading-6 break-all"
        onMouseLeave={() => onHover(null)}
        aria-label="Encoded bitstream"
      >
        {syms.slice(0, MAX_CHUNKS).map((ch, i) => {
          const code = shown.get(ch)
          const hot = hoverChar === ch
          return (
            <span
              key={i}
              title={glyph(ch)}
              onMouseEnter={() => onHover(ch)}
              className={`mr-px inline-block px-px transition-colors ${
                hot ? 'bg-ink text-paper' : code ? shade.get(ch) : 'text-rule underline decoration-dotted'
              }`}
            >
              {code ?? fwCodes.get(ch)}
            </span>
          )
        })}
        {syms.length > MAX_CHUNKS && (
          <span className="italic text-rule"> … first {MAX_CHUNKS} of {syms.length} characters shown</span>
        )}
      </p>
    </div>
  )
}
