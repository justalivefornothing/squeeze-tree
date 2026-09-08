/** Printable stand-in for whitespace so it survives in a table cell. */
export function glyph(ch: string): string {
  if (ch === ' ') return '␣'
  if (ch === '\n') return '↵'
  if (ch === '\t') return '⇥'
  return ch
}

export function pct(part: number, whole: number, digits = 1): string {
  return whole === 0 ? '—' : `${((100 * part) / whole).toFixed(digits)}%`
}

/** Sort rows by count descending, ties by first-seen order (stable). */
export function byFrequency(freq: Map<string, number>): { ch: string; count: number }[] {
  return [...freq]
    .map(([ch, count], order) => ({ ch, count, order }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map(({ ch, count }) => ({ ch, count }))
}
