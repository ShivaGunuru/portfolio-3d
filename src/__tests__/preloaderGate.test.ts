import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForGate } from '../preloader/gate'

/** A promise whose settling the test controls by hand. */
function deferred() {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const timing = { minMs: 1200, maxMs: 6000 }

describe('waitForGate', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits out the minimum when every task finishes early', async () => {
    const outcome = vi.fn()
    waitForGate([Promise.resolve()], timing).then(outcome)

    await vi.advanceTimersByTimeAsync(1199)
    expect(outcome).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(outcome).toHaveBeenCalledWith('ready')
  })

  it('waits for a task that outlasts the minimum, then opens at once', async () => {
    const slow = deferred()
    const outcome = vi.fn()
    waitForGate([slow.promise], timing).then(outcome)

    await vi.advanceTimersByTimeAsync(3000)
    expect(outcome).not.toHaveBeenCalled()
    slow.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(outcome).toHaveBeenCalledWith('ready')
  })

  it('gives up at the maximum so a stuck asset cannot trap the visitor', async () => {
    const outcome = vi.fn()
    waitForGate([new Promise(() => {})], timing).then(outcome)

    await vi.advanceTimersByTimeAsync(5999)
    expect(outcome).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(outcome).toHaveBeenCalledWith('timeout')
  })

  it('counts a failed task as settled: it gates the reveal, it does not validate assets', async () => {
    const failing = deferred()
    const outcome = vi.fn()
    waitForGate([failing.promise], timing).then(outcome)

    failing.reject(new Error('sprite 404'))
    await vi.advanceTimersByTimeAsync(1200)
    expect(outcome).toHaveBeenCalledWith('ready')
  })

  it('reports progress as the fraction of tasks settled', async () => {
    const a = deferred()
    const b = deferred()
    const progress: number[] = []
    waitForGate([a.promise, b.promise], { ...timing, onProgress: (p) => progress.push(p) })

    a.resolve()
    await vi.advanceTimersByTimeAsync(0)
    b.reject(new Error('x'))
    await vi.advanceTimersByTimeAsync(0)
    expect(progress).toEqual([0, 0.5, 1])
  })

  it('opens at the minimum when there is nothing to wait for', async () => {
    const outcome = vi.fn()
    waitForGate([], timing).then(outcome)

    await vi.advanceTimersByTimeAsync(1200)
    expect(outcome).toHaveBeenCalledWith('ready')
  })
})
