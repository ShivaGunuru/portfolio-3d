export type GateOutcome = 'ready' | 'timeout'

export interface GateOptions {
  /** Never open sooner than this, so a cached load reads as deliberate rather than a flicker. */
  minMs: number
  /** Always open by this point, so one stuck asset cannot hold the page hostage. */
  maxMs: number
  /** Fraction of tasks settled, 0 to 1. Drives the overlay's progress line. */
  onProgress?: (fraction: number) => void
}

/**
 * Decides when the preloader may lift. Pure: no DOM, only timers and
 * promises, so the timing rules are tested with fake timers rather than by
 * watching a browser (see preloaderGate.test.ts).
 *
 * A task that rejects counts as settled. The overlay gates the reveal; it is
 * not the place to validate assets, and every task here already degrades on
 * failure (a missing Hero sprite renders nothing, a missing font falls back).
 */
export function waitForGate(
  tasks: readonly Promise<unknown>[],
  { minMs, maxMs, onProgress }: GateOptions,
): Promise<GateOutcome> {
  return new Promise((resolve) => {
    const total = tasks.length
    let settled = 0
    let minElapsed = false
    let done = false

    const finish = (outcome: GateOutcome) => {
      if (done) return
      done = true
      clearTimeout(maxTimer)
      resolve(outcome)
    }

    const maxTimer = setTimeout(() => finish('timeout'), maxMs)

    // Two events can open the gate early (the minimum elapsing, the last task
    // settling) and whichever comes second must be the one that does it, so
    // both check the same condition.
    const openIfReady = () => {
      if (minElapsed && settled === total) finish('ready')
    }

    setTimeout(() => {
      minElapsed = true
      openIfReady()
    }, minMs)

    // Zero tasks reports complete up front rather than dividing by zero.
    onProgress?.(total === 0 ? 1 : 0)

    // Same handler for both outcomes: a rejection settles a task too.
    const onSettle = () => {
      settled++
      onProgress?.(settled / total)
      openIfReady()
    }
    for (const task of tasks) task.then(onSettle, onSettle)
  })
}
