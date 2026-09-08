import { byFrequency, glyph, pct } from './format'

interface Props {
  freq: Map<string, number>
  /** Code per symbol, or `null` while it is still waiting to be assigned. */
  shown: Map<string, string | null>
  /** The complete active codebook (used for the canonical explainer). */
  codes: Map<string, string>
  fw: number
  totalBits: number
  canonical: boolean
  onCanonical: (on: boolean) => void
  hoverChar: string | null
  onHover: (ch: string | null) => void
}

const cols = 'grid-cols-[2.25rem_3rem_1fr_3rem_3.5rem_3.5rem]'

export function CodeTable({ freq, shown, codes, fw, totalBits, canonical, onCanonical, hoverChar, onHover }: Props) {
  const rows = byFrequency(freq)

  return (
    <div>
      <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm select-none">
        <input
          type="checkbox"
          checked={canonical}
          onChange={(e) => onCanonical(e.target.checked)}
          className="h-4 w-4 accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
        <span>
          Canonical Huffman <span className="text-rule">— same lengths, codes rebuilt from the lengths alone</span>
        </span>
      </label>

      {rows.length === 0 ? (
        <p className="border-t border-ink py-6 text-center text-sm italic text-rule">No codes yet.</p>
      ) : (
        <div onMouseLeave={() => onHover(null)}>
          <div className={`small-caps grid ${cols} border-y border-ink py-1 text-xs font-semibold`}>
            <span>char</span>
            <span className="text-right">count</span>
            <span className="pl-3">code</span>
            <span className="text-right">bits</span>
            <span className="text-right">total</span>
            <span className="text-right">share</span>
          </div>
          {rows.map(({ ch, count }) => {
            const code = shown.get(ch) ?? null
            const len = code ? code.length : fw
            const hot = hoverChar === ch
            return (
              <div
                key={ch}
                tabIndex={0}
                onMouseEnter={() => onHover(ch)}
                onFocus={() => onHover(ch)}
                onBlur={() => onHover(null)}
                className={`grid ${cols} items-center border-b border-faint py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${hot ? 'bg-neutral-100 font-semibold' : ''}`}
              >
                <span className="font-mono text-base">{glyph(ch)}</span>
                <span className="text-right tabular-nums">{count}</span>
                <span className="pl-3 font-mono tracking-wide">
                  {code ?? <span className="text-faint">{'·'.repeat(fw)}</span>}
                </span>
                <span className={`text-right tabular-nums ${code ? '' : 'italic text-rule'}`}>{len}</span>
                <span className={`text-right tabular-nums ${code ? '' : 'italic text-rule'}`}>{count * len}</span>
                <span className="text-right tabular-nums text-xs">{pct(count * len, totalBits)}</span>
              </div>
            )
          })}
          <div className={`grid ${cols} border-b border-ink py-1 text-sm font-semibold`}>
            <span className="col-span-4 small-caps">total</span>
            <span className="text-right tabular-nums">{totalBits}</span>
            <span className="text-right text-xs tabular-nums">100%</span>
          </div>
          {canonical && <CanonicalNote codes={codes} />}
        </div>
      )}
    </div>
  )
}

function CanonicalNote({ codes }: { codes: Map<string, string> }) {
  const sorted = [...codes].sort(([a, ca], [b, cb]) => ca.length - cb.length || (a < b ? -1 : a > b ? 1 : 0))
  return (
    <aside className="mt-3 border-l-2 border-ink pl-3 text-sm leading-relaxed">
      <p>
        <b>Only the lengths are stored:</b>{' '}
        <span className="font-mono text-xs">
          {sorted.map(([ch, code], i) => (
            <span key={ch}>
              {i > 0 && ' '}
              {glyph(ch)}
              <sub>{code.length}</sub>
            </span>
          ))}
        </span>
      </p>
      <p className="mt-1">
        Sort by (length, symbol), start at <span className="font-mono">0</span>, add one per symbol and shift left
        whenever the length grows:
      </p>
      <p className="mt-1 font-mono text-xs leading-6 break-words">
        {sorted.map(([ch, code], i) => (
          <span key={ch}>
            {i > 0 && <span className="text-rule"> → </span>}
            {code}
            <span className="text-rule">({glyph(ch)})</span>
          </span>
        ))}
      </p>
    </aside>
  )
}
