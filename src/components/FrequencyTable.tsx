import { byFrequency, glyph, pct } from './format'

interface Props {
  freq: Map<string, number>
  hoverChar: string | null
  onHover: (ch: string | null) => void
}

const ROW = 30

export function FrequencyTable({ freq, hoverChar, onHover }: Props) {
  const rows = byFrequency(freq)
  const max = rows[0]?.count ?? 1
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  const indexOf = new Map(rows.map((r, i) => [r.ch, i]))

  if (rows.length === 0) {
    return <p className="border-t border-ink py-6 text-center text-sm italic text-rule">No characters yet.</p>
  }

  return (
    <div onMouseLeave={() => onHover(null)}>
      <div className="small-caps grid grid-cols-[2.25rem_3rem_1fr_3.5rem] border-y border-ink py-1 text-xs font-semibold">
        <span>char</span>
        <span className="text-right">count</span>
        <span className="pl-3">frequency</span>
        <span className="text-right">share</span>
      </div>
      <div className="relative" style={{ height: rows.length * ROW }}>
        {[...freq].map(([ch, count]) => {
          const i = indexOf.get(ch) ?? 0
          const hot = hoverChar === ch
          return (
            <div
              key={ch}
              className={`absolute inset-x-0 grid grid-cols-[2.25rem_3rem_1fr_3.5rem] items-center border-b border-faint text-sm transition-transform duration-500 ease-out ${hot ? 'bg-neutral-100 font-semibold' : ''}`}
              style={{ transform: `translateY(${i * ROW}px)`, height: ROW }}
              onMouseEnter={() => onHover(ch)}
            >
              <span className="font-mono text-base">{glyph(ch)}</span>
              <span className="text-right tabular-nums">{count}</span>
              <span className="flex items-center pl-3 pr-2">
                <span
                  className="h-2.5 bg-ink transition-[width] duration-300 ease-out"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-xs">{pct(count, total)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
