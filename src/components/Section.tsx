import type { ReactNode } from 'react'

interface Props {
  n: number
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ n, title, aside, children, className = '' }: Props) {
  return (
    <section className={`mt-8 ${className}`}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-ink pb-1">
        <h2 className="font-display text-xl font-bold tracking-tight">
          <span className="mr-2 font-serif text-sm font-normal text-rule">§{n}</span>
          {title}
        </h2>
        {aside && <div className="text-xs">{aside}</div>}
      </header>
      {children}
    </section>
  )
}
