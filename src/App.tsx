import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Bitstream } from './components/Bitstream'
import { BuildControls } from './components/BuildControls'
import { CodeTable } from './components/CodeTable'
import { Comparison } from './components/Comparison'
import { DecodePanel } from './components/DecodePanel'
import { FrequencyTable } from './components/FrequencyTable'
import { Section } from './components/Section'
import { TreeView } from './components/TreeView'
import { encode, entropy, pathToRoot, symbols } from './huffman/huffman'
import { buildModel, viewAt } from './model'

const SAMPLE = 'she sells sea shells by the sea shore'
/** Tempo adapts so even a long paragraph finishes its build in about ten seconds. */
const mergeDelay = (merges: number): number => Math.max(240, Math.min(620, 7000 / Math.max(1, merges)))
const assignDelay = (leaves: number): number => Math.max(60, Math.min(200, 2400 / Math.max(1, leaves)))
const NO_PATH: ReadonlySet<number> = new Set()

export default function App() {
  const [text, setText] = useState(SAMPLE)
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [canonical, setCanonical] = useState(false)
  const [hoverChar, setHoverChar] = useState<string | null>(null)

  const model = useMemo(() => buildModel(text), [text])
  const view = useMemo(() => viewAt(model, pos, canonical), [model, pos, canonical])

  // "Playing" only means something while there are steps left; the flag itself can stay set.
  const atEnd = view.pos >= model.total
  const running = playing && !atEnd

  useEffect(() => {
    if (!running) return
    const delay = view.pos < model.merges ? mergeDelay(model.merges) : assignDelay(model.leaves)
    const timer = setTimeout(() => setPos(view.pos + 1), delay)
    return () => clearTimeout(timer)
  }, [running, view.pos, model.merges, model.leaves])

  const seek = (next: number) => {
    setPlaying(false)
    setPos(Math.max(0, Math.min(next, model.total)))
  }

  const togglePlay = () => {
    if (running) {
      setPlaying(false)
      return
    }
    if (atEnd) setPos(0)
    setPlaying(true)
  }

  /** Single keystrokes keep the finished result live; pastes replay the build. */
  const onText = (next: string) => {
    const bigChange = Math.abs(symbols(next).length - symbols(text).length) > 1
    setText(next)
    if (bigChange) {
      setPos(0)
      setPlaying(true)
    } else {
      setPos(Number.MAX_SAFE_INTEGER)
      setPlaying(false)
    }
  }

  const onTreeKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => seek(view.pos + 1),
      ArrowLeft: () => seek(view.pos - 1),
      Home: () => seek(0),
      End: () => seek(model.total),
      ' ': togglePlay,
    }
    const fn = keys[e.key]
    if (fn) {
      e.preventDefault()
      fn()
    }
  }

  const pathIds = useMemo(() => {
    const leaf = hoverChar ? view.leafByChar.get(hoverChar) : undefined
    return leaf ? new Set(pathToRoot(leaf).map((n) => n.id)) : NO_PATH
  }, [hoverChar, view.leafByChar])

  const count = symbols(text).length
  const encoded = useMemo(() => encode(text, view.codes), [text, view.codes])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
      <header className="text-center">
        <p className="small-caps flex justify-between border-b border-ink pb-1 text-[11px] sm:text-xs">
          <span>Vol. I, No. 1</span>
          <span className="hidden sm:inline">Huffman coding, set in type</span>
          <span>Free of charge</span>
        </p>
        <h1 className="font-display py-2 text-6xl font-black tracking-tighter sm:text-7xl">Squeezetree</h1>
        <p className="border-y-2 border-ink py-1.5 text-sm italic sm:text-base">
          Type any text and watch its Huffman tree assemble merge by merge, then see the encoded bitstream shrink
          against fixed-width encoding.
        </p>
      </header>

      <div className="grid gap-x-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Section
            n={1}
            title="Set the type"
            aside={
              <span className="tabular-nums">
                {count} character{count === 1 ? '' : 's'} · {model.leaves} distinct
              </span>
            }
          >
            <label htmlFor="source" className="sr-only">
              Text to encode
            </label>
            <textarea
              id="source"
              value={text}
              onChange={(e) => onText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="Paste a paragraph…"
              className="w-full resize-y border border-ink bg-paper p-3 font-serif text-base leading-relaxed placeholder:italic placeholder:text-rule focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            />
          </Section>

          <Section n={2} title="Frequency">
            <FrequencyTable freq={model.result.freq} hoverChar={hoverChar} onHover={setHoverChar} />
          </Section>
        </div>

        <div className="lg:col-span-5">
          <Section n={3} title="Comparison" aside={<span className="italic">Huffman against two fixed codes</span>}>
            <Comparison
              n={count}
              alphabet={model.leaves}
              fw={model.fw}
              currentBits={view.currentBits}
              fwBits={count * model.fw}
              asciiBits={count * 8}
              entropyPerSymbol={entropy(model.result.freq)}
              complete={view.complete}
            />
          </Section>
        </div>
      </div>

      <Section
        n={4}
        title="The build"
        aside={<span className="italic">Focus the drawing and use ← → to step, space to play.</span>}
      >
        <div
          tabIndex={0}
          onKeyDown={onTreeKey}
          aria-label="Tree construction. Arrow keys step, space plays."
          className="flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <BuildControls
            pos={view.pos}
            merges={model.merges}
            leaves={model.leaves}
            playing={running}
            heap={view.roots}
            active={view.active}
            onSeek={seek}
            onTogglePlay={togglePlay}
          />
          <TreeView
            roots={view.roots}
            leafOrder={view.leafOrder}
            height={model.height}
            active={view.active}
            pathIds={pathIds}
            onHover={setHoverChar}
          />
        </div>
      </Section>

      <div className="grid gap-x-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Section n={5} title="Codebook" aside={<span className="italic">Hover or focus a row to trace its path</span>}>
            <CodeTable
              freq={model.result.freq}
              shown={view.shown}
              codes={view.codes}
              fw={model.fw}
              totalBits={view.currentBits}
              canonical={canonical}
              onCanonical={setCanonical}
              hoverChar={hoverChar}
              onHover={setHoverChar}
            />
          </Section>
        </div>
        <div className="lg:col-span-6">
          <Section n={6} title="Bitstream" aside={<span className="italic">Shaded per character</span>}>
            <Bitstream
              text={text}
              freq={model.result.freq}
              shown={view.shown}
              fwCodes={model.fwCodes}
              bits={view.currentBits}
              complete={view.complete}
              hoverChar={hoverChar}
              onHover={setHoverChar}
            />
          </Section>
          <Section n={7} title="Decode" aside={<span className="italic">{canonical ? 'Canonical' : 'Huffman'} tree</span>}>
            <DecodePanel tree={view.root} encoded={encoded} />
          </Section>
        </div>
      </div>

      <footer className="small-caps mt-12 flex flex-wrap justify-between gap-2 border-t-2 border-ink pt-2 text-[11px]">
        <span>Squeezetree · Huffman coding from scratch</span>
        <span>MIT · 2026 Jafn</span>
      </footer>
    </div>
  )
}
