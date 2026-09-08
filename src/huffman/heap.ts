export type Compare<T> = (a: T, b: T) => number

/**
 * Array-backed binary min-heap. The element with the smallest `compare`
 * result sits at index 0; children of `i` live at `2i + 1` and `2i + 2`.
 */
export class MinHeap<T> {
  private readonly items: T[] = []
  private readonly compare: Compare<T>

  constructor(compare: Compare<T>) {
    this.compare = compare
  }

  get size(): number {
    return this.items.length
  }

  peek(): T | undefined {
    return this.items[0]
  }

  push(item: T): void {
    this.items.push(item)
    this.siftUp(this.items.length - 1)
  }

  pop(): T | undefined {
    const items = this.items
    if (items.length === 0) return undefined
    const top = items[0]
    const last = items.pop() as T
    if (items.length > 0) {
      items[0] = last
      this.siftDown(0)
    }
    return top
  }

  /** Snapshot of the backing array in heap order (not sorted). */
  toArray(): T[] {
    return this.items.slice()
  }

  private siftUp(i: number): void {
    const items = this.items
    const item = items[i]
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(items[parent], item) <= 0) break
      items[i] = items[parent]
      i = parent
    }
    items[i] = item
  }

  private siftDown(i: number): void {
    const items = this.items
    const n = items.length
    const item = items[i]
    for (;;) {
      const left = 2 * i + 1
      const right = left + 1
      let smallest = i
      let smallestItem = item
      if (left < n && this.compare(items[left], smallestItem) < 0) {
        smallest = left
        smallestItem = items[left]
      }
      if (right < n && this.compare(items[right], smallestItem) < 0) {
        smallest = right
        smallestItem = items[right]
      }
      if (smallest === i) break
      items[i] = smallestItem
      i = smallest
    }
    items[i] = item
  }
}
