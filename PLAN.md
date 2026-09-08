# Squeezetree — plan

**Goal.** Type any text and watch its Huffman tree assemble merge by merge, then see
the encoded bitstream shrink against fixed-width encoding. A small, polished
algorithm visualiser in the style of a printed newspaper: white paper, black ink,
one red for the node being merged.

## Features (all required)

1. Character frequency table with live bar lengths as you type (rows re-sort in place).
2. Step-through tree construction: hand-written min-heap pops the two lightest nodes,
   merges, pushes back; each merge animated with play / pause / step controls.
3. Code table with prefix-free codes, bit lengths and per-character share of total bits.
4. Encoded bitstream shaded per character; hover maps a chunk back to its tree path.
5. Decode panel: paste bits, walk the tree, recover the text; errors on invalid streams.
6. Comparison: Huffman bits vs fixed-width `ceil(log2(alphabet))` bits vs 8-bit ASCII.
7. Canonical Huffman toggle: code lengths alone rebuild the codebook.

## Architecture

```
src/
  huffman/
    heap.ts          binary min-heap, comparator (weight, then first-seen order)
    huffman.ts       frequencies -> merge steps -> tree -> codes -> encode/decode,
                     fixed-width + ratio helpers, canonical codes, tree-from-codes
    huffman.test.ts  spec assertions + edge cases
  components/
    FrequencyTable   sorted rows with animated bars
    BuildControls    transport buttons + heap strip
    TreeView         SVG forest, leaves pinned on a baseline, orthogonal connectors
    CodeTable        codes / lengths / contribution, canonical toggle
    Bitstream        per-character chunks, hover -> tree path
    DecodePanel      bits in, text out, error reporting
    Comparison       three bit counts and the ratio, ticking during assignment
  App.tsx            state: text, timeline position, hover char, canonical flag
```

The timeline has `M` merge steps followed by `L` code-assignment ticks (one per leaf in
DFS order). Before a char's code is assigned it is shown at fixed width, so the bit
counter visibly ticks down as codes land.

## Milestones

- [ ] plan + license
- [ ] scaffold (vite react-ts, tailwind 4, vitest, fontsource)
- [ ] core: heap, huffman, tests green
- [ ] frequency table + tree build + controls
- [ ] code table, bitstream, comparison, canonical toggle
- [ ] decode panel, polish, smoke test
- [ ] readme, publish (private)
