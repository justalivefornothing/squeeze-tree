interface Props {
  /** Number of symbols in the text. */
  n: number
  alphabet: number
  fw: number
  /** Huffman bit count, ticking down while codes are assigned. */
  currentBits: number
  fwBits: number
  asciiBits: number
  complete: boolean
}

function Row({ label, note, bits, max }: { label: string; note: string; bits: number; max: number }) {
  const width = max === 0 ? 0 : (100 * bits) / max
  return (
    <div className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 text-sm">
      <span className="small-caps font-semibold leading-tight">
        {label}
        <span className="block font-serif text-[11px] font-normal normal-case tracking-normal text-rule">{note}</span>
      </span>
      <span className="h-3 w-full bg-neutral-100" role="presentation">
        <span
          className="block h-full bg-ink transition-[width] duration-300 ease-out"
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="text-right font-mono text-sm tabular-nums">{bits}</span>
    </div>
  )
}

export function Comparison({ n, alphabet, fw, currentBits, fwBits, asciiBits, complete }: Props) {
  if (n === 0) {
    return <p className="border-t border-ink py-6 text-center text-sm italic text-rule">Nothing to compare yet.</p>
  }
  const ratio = currentBits / asciiBits
  const vsFixed = fwBits === 0 ? 0 : 1 - currentBits / fwBits

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-faint pb-3">
        <div>
          <p className="font-display text-5xl font-black tracking-tighter tabular-nums sm:text-6xl">
            {(100 * ratio).toFixed(1)}
            <span className="text-3xl font-bold">%</span>
          </p>
          <p className="text-xs">
            of the 8-bit ASCII size{!complete && <span className="italic text-rule"> — still assigning codes</span>}
          </p>
        </div>
        <div className="text-right text-xs leading-relaxed">
          <p>
            <b className="font-mono text-sm tabular-nums">{currentBits}</b> / <span className="font-mono">{asciiBits}</span>{' '}
            bits
          </p>
          <p className="tabular-nums">
            {vsFixed >= 0 ? `${(100 * vsFixed).toFixed(1)}% smaller` : `${(-100 * vsFixed).toFixed(1)}% larger`} than
            fixed width
          </p>
        </div>
      </div>
      <Row label="8-bit ASCII" note={`${n} × 8`} bits={asciiBits} max={asciiBits} />
      <Row label="Fixed width" note={`${n} × ⌈log₂ ${alphabet}⌉ = ${n} × ${fw}`} bits={fwBits} max={asciiBits} />
      <Row label="Huffman" note="Σ count × code length" bits={currentBits} max={asciiBits} />
    </div>
  )
}
