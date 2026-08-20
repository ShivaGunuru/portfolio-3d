/**
 * Separates a subject from a studio backdrop in an RGBA pixel buffer.
 *
 * Extracted from the original portrait sampler so the same, hard-won
 * algorithm can be reused by the video bake tool without duplicating it. Two
 * earlier approaches failed before this one, and the reasons matter for
 * anyone tuning the constants below:
 *
 *  - Comparing every pixel to one averaged backdrop colour misreads the dark
 *    end of a vignette or lighting falloff as subject, because a real studio
 *    backdrop is a gradient, not a flat value, and its darkest corner can sit
 *    further from the average than the subject does.
 *
 *  - A flood fill with only local step continuity (compare each pixel to its
 *    already-filled neighbour) follows a gradient of any depth correctly, but
 *    once it crosses a soft edge anywhere it walks straight through the
 *    subject's interior, which is also smooth, and hollows it into an outline.
 *
 * This combines both checks: a pixel is only ever filled if it is both
 * locally continuous with its filled neighbour AND still plausibly
 * backdrop-coloured relative to a fixed reference sampled from a strip of the
 * image known to be backdrop. Local continuity handles the gradient; the
 * global bound is what stops the fill from leaking through a soft edge.
 */

export interface BackgroundSeparationOptions {
  /**
   * Per-step colour tolerance, 0..1, for the local-continuity test between a
   * filled pixel and its neighbour. Raise it if backdrop survives around the
   * subject; lower it if the fill leaks into the subject through a soft edge.
   */
  stepTolerance?: number
  /**
   * How far a pixel may sit from the backdrop reference and still be treated
   * as backdrop at all, 0..1. This is the bound that prevents the fill from
   * hollowing out the subject once it crosses a soft edge.
   */
  backdropBound?: number
  /** Height of the top strip averaged to build the backdrop reference colour. */
  referenceBand?: number
  /**
   * Which borders to seed the fill from. A head-and-shoulders crop should
   * exclude 'bottom': the subject's shoulders or chest usually run off that
   * edge, so seeding there lets the fill climb straight up into clothing.
   */
  seedEdges?: {
    top?: boolean
    bottom?: boolean
    left?: boolean
    right?: boolean
  }
  /**
   * Backdrop reference colour to compare against, overriding the per-image
   * top-strip average. Pass one shared reference across a whole video and
   * every frame is judged by the same yardstick, so an exposure drift between
   * frames can no longer move the classification boundary on its own. That
   * drift is a real flicker source: the subject is not changing, but the
   * threshold measuring it is.
   */
  reference?: BackdropReference
  /**
   * Enclosed-pocket recovery. A patch of backdrop that the subject's own
   * silhouette walls off from every seeded border (hair and a raised hand can
   * enclose one completely) is unreachable by a border-seeded fill at any
   * tolerance, because the barrier is topological, not chromatic. After the
   * border fill settles, any still-unfilled region that looks like backdrop
   * and is at least `pocketMinArea` pixels becomes a new seed, and the normal
   * fill runs again from there. 0 disables the pass.
   */
  pocketBound?: number
  pocketMinArea?: number
  /**
   * How far a pocket candidate's hue may sit from the reference's, in 0..255
   * channel-difference units, measured as R-B and R-G spreads.
   *
   * This gate, not `pocketBound`, is what makes pocket recovery safe, and the
   * reason is worth keeping: plain Euclidean RGB distance cannot tell lit
   * backdrop from skin. Measured on this project's source video against a
   * neutral backdrop reference of (117, 115, 103): every connected region
   * larger than 300px that fell within Euclidean distance 0.32 was skin, at
   * (149, 112, 86) and similar, so widening the bound far enough to reach the
   * real pocket would have dissolved the subject's face and hand. What
   * separates them is not distance but hue: the backdrop is neutral (R-B of
   * 14) while skin is strongly warm (R-B of 63). Gating on hue and leaving
   * brightness slack matches how a real backdrop actually varies, since
   * uneven lighting moves brightness while leaving hue alone. With this gate
   * every recovered region came back neutral (167, 164, 151 and similar) and
   * no skin region qualified at any tolerance tried.
   */
  pocketChromaTolerance?: number
}

export interface BackdropReference {
  r: number
  g: number
  b: number
}

/** Mean RGB (0..255 each) of the top strip of an RGBA buffer, `referenceBand`
 *  fraction of its height: the reference colour every pixel is compared
 *  against below. Exported so a caller processing many frames of one video
 *  can average these into a single shared reference (see the `reference`
 *  option) rather than letting each frame set its own. */
export function computeBackdropReference(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  referenceBand = 0.05,
): { r: number; g: number; b: number } {
  const topBand = Math.max(1, Math.round(height * referenceBand))
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = 0; y < topBand; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      n++
    }
  }
  return { r: r / n, g: g / n, b: b / n }
}

/** Euclidean RGB distance (0..~1.73) from pixel `index` to `ref`. */
function backdropColorDistance(
  data: Uint8ClampedArray | Uint8Array,
  index: number,
  ref: { r: number; g: number; b: number },
): number {
  const i = index * 4
  const dr = (data[i] - ref.r) / 255
  const dg = (data[i + 1] - ref.g) / 255
  const db = (data[i + 2] - ref.b) / 255
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Returns a `width * height` mask, 1 where a pixel is classified as backdrop,
 * 0 where it is subject. `data` is a flat RGBA buffer, e.g. from
 * `ImageData.data`.
 */
export function separateBackground(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  {
    stepTolerance = 0.055,
    backdropBound = 0.3,
    referenceBand = 0.05,
    seedEdges = { top: true, bottom: false, left: true, right: true },
    reference,
    pocketBound = 0,
    pocketMinArea = 0,
    pocketChromaTolerance = 18,
  }: BackgroundSeparationOptions = {},
): Uint8Array {
  const ref = reference ?? computeBackdropReference(data, width, height, referenceBand)

  const isBackground = new Uint8Array(width * height)
  const stack: number[] = []

  const plausiblyBackdrop = (idx: number) =>
    backdropColorDistance(data, idx, ref) < backdropBound

  const push = (x: number, y: number) => {
    const idx = y * width + x
    if (isBackground[idx]) return
    if (!plausiblyBackdrop(idx)) return
    isBackground[idx] = 1
    stack.push(idx)
  }

  /** Drains `stack`, growing the filled region by local step continuity. */
  const drain = () => {
    while (stack.length > 0) {
      const idx = stack.pop() as number
      const y = (idx / width) | 0
      const x = idx - y * width
      const i0 = idx * 4

      const visit = (nx: number, ny: number) => {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return
        const nIdx = ny * width + nx
        if (isBackground[nIdx]) return
        if (!plausiblyBackdrop(nIdx)) return
        const i1 = nIdx * 4
        const dr = (data[i0] - data[i1]) / 255
        const dg = (data[i0 + 1] - data[i1 + 1]) / 255
        const db = (data[i0 + 2] - data[i1 + 2]) / 255
        if (Math.sqrt(dr * dr + dg * dg + db * db) > stepTolerance) return
        isBackground[nIdx] = 1
        stack.push(nIdx)
      }

      visit(x - 1, y)
      visit(x + 1, y)
      visit(x, y - 1)
      visit(x, y + 1)
    }
  }

  if (seedEdges.top) for (let x = 0; x < width; x++) push(x, 0)
  if (seedEdges.bottom) for (let x = 0; x < width; x++) push(x, height - 1)
  for (let y = 0; y < height; y++) {
    if (seedEdges.left) push(0, y)
    if (seedEdges.right) push(width - 1, y)
  }
  drain()

  // --- enclosed-pocket recovery ------------------------------------------
  // Looped rather than run once: opening one pocket can expose another that
  // the first was itself walling off.
  if (pocketBound > 0 && pocketMinArea > 0) {
    const refRB = ref.r - ref.b
    const refRG = ref.r - ref.g

    /** Backdrop-like by hue first, distance second. See `pocketChromaTolerance`. */
    const pocketCandidate = (idx: number) => {
      const i = idx * 4
      const R = data[i]
      const G = data[i + 1]
      const B = data[i + 2]
      if (Math.abs(R - B - refRB) > pocketChromaTolerance) return false
      if (Math.abs(R - G - refRG) > pocketChromaTolerance) return false
      return backdropColorDistance(data, idx, ref) < pocketBound
    }

    const visited = new Uint8Array(width * height)
    const region: number[] = []

    for (let pass = 0; pass < 8; pass++) {
      let opened = false
      visited.fill(0)

      for (let start = 0; start < width * height; start++) {
        if (isBackground[start] || visited[start]) continue
        if (!pocketCandidate(start)) continue

        // Flood the connected run of confidently-backdrop-coloured pixels
        // this seed belongs to, then judge it by area as a whole.
        region.length = 0
        visited[start] = 1
        region.push(start)
        for (let head = 0; head < region.length; head++) {
          const idx = region[head]
          const y = (idx / width) | 0
          const x = idx - y * width
          const neighbours = [
            x > 0 ? idx - 1 : -1,
            x < width - 1 ? idx + 1 : -1,
            y > 0 ? idx - width : -1,
            y < height - 1 ? idx + width : -1,
          ]
          for (const n of neighbours) {
            if (n < 0 || visited[n] || isBackground[n]) continue
            if (!pocketCandidate(n)) continue
            visited[n] = 1
            region.push(n)
          }
        }

        if (region.length < pocketMinArea) continue
        for (const idx of region) {
          isBackground[idx] = 1
          stack.push(idx)
        }
        opened = true
      }

      if (!opened) break
      drain()
    }
  }

  return isBackground
}

/** Rec. 709 luma, 0..1. */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
