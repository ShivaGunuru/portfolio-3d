import {
  computeBackdropReference,
  separateBackground,
} from '../three/backgroundSeparation'

/**
 * Bakes a sequence of video frames into a background-removed sprite sheet
 * the Hero section steps through as the user scrolls.
 *
 * This replaces the earlier particle-field bake (`bakeHeroVideo.ts`, now
 * deleted). That approach converted the subject into a point cloud; this one
 * keeps the real pixels; "clean, background removed, subject as it is, no
 * effects" was an explicit request against the particle look. Runtime is a
 * plain 2D canvas stepping between frames, not WebGL: there is no shader
 * effect left to justify the GPU pipeline.
 *
 * Motion is scroll-scrubbed by stepping directly to the nearest baked frame,
 * never crossfading between two. Crossfading two independently-masked
 * frames overlays two full poses at partial opacity mid-transition, which
 * reads as a ghosting double-exposure wherever the pose changed between
 * frames, exactly the kind of "effect" this pass was asked to remove.
 * Stepping is also what real scroll-scrubbed video sites do: decode and
 * show the one frame nearest the scroll position, nothing blended.
 */

export interface CutoutBakeConfig {
  /** Frame image URLs, in playback order. */
  frameUrls: string[]
  /** Grid resolution frames are sampled at before cropping to the subject. */
  sampleWidth?: number
  /** Feather radius in source pixels for the alpha edge. */
  featherPx?: number
  /** Erosion depth in source pixels, stripped before feathering. */
  erodePx?: number
  /** Per-step tolerance for the background flood fill. */
  backgroundTolerance?: number
  /** Global bound on how far a filled pixel may sit from the backdrop reference. */
  backdropBound?: number
  /** Colour bound for promoting an enclosed backdrop pocket to a fill seed. */
  pocketBound?: number
  /** Minimum pocket size to promote, as a fraction of total frame area. */
  pocketMinAreaFraction?: number
  onProgress?: (frameIndex: number, total: number) => void
}

export interface BakedCutout {
  /** The packed sprite sheet: `columns * rows` frames, one per grid cell. */
  spriteCanvas: HTMLCanvasElement
  frameCount: number
  columns: number
  rows: number
  frameWidth: number
  frameHeight: number
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`bakeHeroCutout: failed to load ${url}`))
    img.src = url
  })
}

/**
 * Keeps only the largest 4-connected component of subject pixels (mask 0),
 * reclassifying everything else as background.
 *
 * The border-seeded flood fill in `separateBackground` cannot reach a
 * backdrop region the subject's own silhouette topologically encloses (hair
 * and a raised hand can wall off a pocket of backdrop from ever touching a
 * seed), which leaves it stranded as "subject" no matter how the colour
 * tolerances are tuned -- it's a connectivity gap, not a threshold one. A
 * real subject is one connected blob, so anything else classified as
 * subject, whether a large enclosed pocket like that or a handful of stray
 * pixels from a corner vignette, is discarded here in one pass rather than
 * chased with separate fixes for each.
 */
function keepLargestComponent(mask: Uint8Array, w: number, h: number): Uint8Array {
  const visited = new Uint8Array(w * h)
  let bestStart = -1
  let bestSize = 0
  const stack: number[] = []

  for (let start = 0; start < w * h; start++) {
    if (mask[start] || visited[start]) continue
    let size = 0
    stack.length = 0
    stack.push(start)
    visited[start] = 1
    while (stack.length > 0) {
      const idx = stack.pop() as number
      size++
      const x = idx % w
      const y = (idx / w) | 0
      if (x > 0 && !mask[idx - 1] && !visited[idx - 1]) {
        visited[idx - 1] = 1
        stack.push(idx - 1)
      }
      if (x < w - 1 && !mask[idx + 1] && !visited[idx + 1]) {
        visited[idx + 1] = 1
        stack.push(idx + 1)
      }
      if (y > 0 && !mask[idx - w] && !visited[idx - w]) {
        visited[idx - w] = 1
        stack.push(idx - w)
      }
      if (y < h - 1 && !mask[idx + w] && !visited[idx + w]) {
        visited[idx + w] = 1
        stack.push(idx + w)
      }
    }
    if (size > bestSize) {
      bestSize = size
      bestStart = start
    }
  }

  if (bestStart === -1) return mask

  // Re-walk the winning component to build the output mask, rather than
  // remembering every visited region from above.
  const out = new Uint8Array(w * h).fill(1)
  visited.fill(0)
  stack.length = 0
  stack.push(bestStart)
  visited[bestStart] = 1
  out[bestStart] = 0
  while (stack.length > 0) {
    const idx = stack.pop() as number
    const x = idx % w
    const y = (idx / w) | 0
    const neighbours = [
      x > 0 ? idx - 1 : -1,
      x < w - 1 ? idx + 1 : -1,
      y > 0 ? idx - w : -1,
      y < h - 1 ? idx + w : -1,
    ]
    for (const n of neighbours) {
      if (n < 0 || mask[n] || visited[n]) continue
      visited[n] = 1
      out[n] = 0
      stack.push(n)
    }
  }
  return out
}

/** 4-neighbourhood erosion, `iterations` deep: a subject pixel within
 *  `iterations` steps of any background pixel becomes background too. Strips
 *  the ring of mixed subject/backdrop colour the source video's own encoding
 *  leaves right at the silhouette edge, which would otherwise show through
 *  once feathered into a soft alpha, at whatever brightness the backdrop
 *  happens to be: a muted colour reads as a faint fringe, but a white
 *  backdrop reads as a stark, obviously wrong outline against this site's
 *  dark background. One iteration was enough for the former; not the
 *  latter, hence this taking a depth instead of being fixed at one step. */
function erode(mask: Uint8Array, w: number, h: number, iterations = 1): Uint8Array {
  let current = mask
  for (let step = 0; step < iterations; step++) {
    const out = new Uint8Array(current)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (current[i]) continue // already background
        const bg =
          (x > 0 && current[i - 1]) ||
          (x < w - 1 && current[i + 1]) ||
          (y > 0 && current[i - w]) ||
          (y < h - 1 && current[i + w])
        if (bg) out[i] = 1
      }
    }
    current = out
  }
  return current
}

/** Separable box blur over a 0/1 subject field, producing a smooth 0..1
 *  alpha. Two passes approximate a soft gaussian-like falloff without an
 *  actual gaussian kernel. */
function featherMask(mask: Uint8Array, w: number, h: number, radius: number): Float32Array {
  let src = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) src[i] = mask[i] ? 0 : 1

  for (let pass = 0; pass < 2; pass++) {
    const horiz = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0
        let n = 0
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          sum += src[y * w + xx]
          n++
        }
        horiz[y * w + x] = sum / n
      }
    }
    const vert = new Float32Array(w * h)
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0
        let n = 0
        for (let dy = -radius; dy <= radius; dy++) {
          const yy = y + dy
          if (yy < 0 || yy >= h) continue
          sum += horiz[yy * w + x]
          n++
        }
        vert[y * w + x] = sum / n
      }
    }
    src = vert
  }
  return src
}

export async function bakeHeroCutout({
  frameUrls,
  sampleWidth = 560,
  featherPx = 2,
  // 1 was enough against the first source video's muted gray backdrop, where
  // leftover contaminated-edge pixels read as a faint colour fringe. Against
  // a white backdrop the same leftover ring reads as a stark white outline,
  // since white is about as far from this subject's actual colours (skin,
  // dark hair, black jacket) as a colour gets, so it needed more depth to
  // fully disappear. If a future source video reintroduces edge fringing,
  // raise this before reaching for anything else.
  erodePx = 3,
  backgroundTolerance = 0.055,
  // An earlier revision raised this to 0.4 purely to muscle the flood fill
  // into backdrop pockets the subject's silhouette had walled off from the
  // seeded borders. `pocketBound` below now handles those directly, so this
  // is back to a value chosen for what it actually governs: how far a pixel
  // may sit from the backdrop reference before it stops being credible as
  // backdrop at all. Keeping it tight is what protects hair and beard edges.
  backdropBound = 0.32,
  // Enclosed-pocket recovery, see `separateBackground`. The hue gate there,
  // not this bound, is what keeps the pass off the subject, so this can stay
  // loose enough to cover a uniformly-lit-but-dim corner of the backdrop.
  // Measured on this clip: the real pockets sit 0.20 to 0.32 from the shared
  // reference, so a tighter bound simply never fires.
  pocketBound = 0.38,
  // 0.1% of frame area, about 176px at this sample size. The pockets that
  // matter measured 4398 and 2253 px, clearing this by an order of magnitude.
  //
  // Do not lower it to chase the last few specks. The hue gate in
  // `separateBackground` rejects skin outright, but hair *highlights* are
  // neutral grey, which is the same signature the backdrop has, so they are
  // held out by area alone. Dropping this floor to 0.0005 (88px) was tried:
  // it cleared the leftover 149 to 160 px specks and then went on to bite
  // visible chunks out of the hairline, because lit hair forms neutral
  // regions in that same size range. Specks are a far smaller problem than
  // holes in the hair. If specks ever need attacking, do it with something
  // that can tell a highlight from a gap, not by relaxing this.
  pocketMinAreaFraction = 0.001,
  onProgress,
}: CutoutBakeConfig): Promise<BakedCutout> {
  if (frameUrls.length === 0) throw new Error('bakeHeroCutout: no frames given')

  const first = await loadImage(frameUrls[0])
  const aspect = first.naturalWidth / first.naturalHeight
  const w = Math.max(2, Math.round(sampleWidth))
  const h = Math.max(2, Math.round(w / aspect))

  const workCanvas = document.createElement('canvas')
  workCanvas.width = w
  workCanvas.height = h
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true })
  if (!workCtx) throw new Error('bakeHeroCutout: 2D context unavailable')

  const frameCount = frameUrls.length
  const frameData: ImageData[] = new Array(frameCount)
  const frameMasks: Uint8Array[] = new Array(frameCount)

  // Pass 1: decode every frame, and average their individual backdrop
  // references into one shared reference.
  //
  // This is the main defence against flicker. Letting each frame derive its
  // own reference means an exposure or white-balance drift between frames
  // moves the classification threshold itself, so the silhouette breathes
  // frame to frame even where the subject is perfectly still: the thing being
  // measured did not change, the ruler did. One reference for the whole clip
  // makes every frame's mask answer the same question.
  let refR = 0
  let refG = 0
  let refB = 0
  for (let f = 0; f < frameCount; f++) {
    const img = f === 0 ? first : await loadImage(frameUrls[f])
    workCtx.clearRect(0, 0, w, h)
    workCtx.drawImage(img, 0, 0, w, h)
    const data = workCtx.getImageData(0, 0, w, h)
    frameData[f] = data

    const ref = computeBackdropReference(data.data, w, h)
    refR += ref.r
    refG += ref.g
    refB += ref.b
    onProgress?.(f + 1, frameCount * 2)
  }
  const sharedReference = {
    r: refR / frameCount,
    g: refG / frameCount,
    b: refB / frameCount,
  }

  // Pass 2: separate every frame against that one shared reference.
  const pocketMinArea = Math.max(1, Math.round(w * h * pocketMinAreaFraction))
  for (let f = 0; f < frameCount; f++) {
    const rawMask = separateBackground(frameData[f].data, w, h, {
      stepTolerance: backgroundTolerance,
      backdropBound,
      reference: sharedReference,
      pocketBound,
      pocketMinArea,
      // Same reasoning as the particle bake: shoulders/chest run off the
      // bottom of every frame in this clip.
      seedEdges: { top: true, bottom: false, left: true, right: true },
    })

    frameMasks[f] = keepLargestComponent(rawMask, w, h)
    onProgress?.(frameCount + f + 1, frameCount * 2)
  }

  // --- union bounding box across every frame's subject pixels -------------
  // A single fixed crop window, not a per-frame one: frames must line up
  // pixel-for-pixel when stepped through, or the subject would jump on every
  // frame change instead of just moving as it does in the source video.
  //
  // Trimmed by mass, not raw min/max. A single frame's stray misclassified
  // pixel (a corner vignette darker than the backdrop bound, in a frame the
  // clip's own exposure had drifted for, see bakeHeroCutout doc comment)
  // otherwise dictates the crop for all 36 frames on its own: two pixels out
  // of millions. Walking each axis's per-column/row subject-pixel count
  // until it accumulates past a small fraction of the total mass finds the
  // real edge and ignores that kind of speck the same way a percentile
  // ignores a handful of extreme outliers.
  const colCounts = new Uint32Array(w)
  const rowCounts = new Uint32Array(h)
  let totalSubjectObservations = 0
  for (let f = 0; f < frameCount; f++) {
    const mask = frameMasks[f]
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x]) continue // background
        colCounts[x]++
        rowCounts[y]++
        totalSubjectObservations++
      }
    }
  }

  const trimBound = (counts: Uint32Array, fromStart: boolean, trimFraction: number): number => {
    const threshold = totalSubjectObservations * trimFraction
    let running = 0
    if (fromStart) {
      for (let i = 0; i < counts.length; i++) {
        running += counts[i]
        if (running > threshold) return i
      }
      return counts.length - 1
    }
    for (let i = counts.length - 1; i >= 0; i--) {
      running += counts[i]
      if (running > threshold) return i
    }
    return 0
  }

  // 0.03%: comfortably above a handful of stray pixels, comfortably below
  // the real boundary's gradient region, which measured in the hundreds of
  // pixels per column even at the edge of the subject's actual silhouette.
  const trimFraction = 0.0003
  const minX = trimBound(colCounts, true, trimFraction)
  const maxX = trimBound(colCounts, false, trimFraction)
  const minY = trimBound(rowCounts, true, trimFraction)
  const maxY = trimBound(rowCounts, false, trimFraction)
  const marginX = Math.round((maxX - minX) * 0.06)
  const marginY = Math.round((maxY - minY) * 0.06)
  const cropX0 = Math.max(0, minX - marginX)
  const cropX1 = Math.min(w - 1, maxX + marginX)
  const cropY0 = Math.max(0, minY - marginY)
  const cropY1 = Math.min(h - 1, maxY + marginY)
  const frameWidth = cropX1 - cropX0 + 1
  const frameHeight = cropY1 - cropY0 + 1

  // --- sprite sheet, one grid cell per frame -------------------------------
  const columns = Math.ceil(Math.sqrt(frameCount))
  const rows = Math.ceil(frameCount / columns)
  const spriteCanvas = document.createElement('canvas')
  spriteCanvas.width = columns * frameWidth
  spriteCanvas.height = rows * frameHeight
  const spriteCtx = spriteCanvas.getContext('2d')
  if (!spriteCtx) throw new Error('bakeHeroCutout: 2D context unavailable')

  const cellCanvas = document.createElement('canvas')
  cellCanvas.width = frameWidth
  cellCanvas.height = frameHeight
  const cellCtx = cellCanvas.getContext('2d')
  if (!cellCtx) throw new Error('bakeHeroCutout: 2D context unavailable')

  for (let f = 0; f < frameCount; f++) {
    const src = frameData[f]
    const mask = erode(frameMasks[f], w, h, erodePx)
    const alpha = featherMask(mask, w, h, featherPx)

    const cell = cellCtx.createImageData(frameWidth, frameHeight)
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const sx = cropX0 + x
        const sy = cropY0 + y
        const si = (sy * w + sx) * 4
        const di = (y * frameWidth + x) * 4
        cell.data[di] = src.data[si]
        cell.data[di + 1] = src.data[si + 1]
        cell.data[di + 2] = src.data[si + 2]
        cell.data[di + 3] = Math.round(alpha[sy * w + sx] * 255)
      }
    }
    cellCtx.putImageData(cell, 0, 0)

    const col = f % columns
    const row = Math.floor(f / columns)
    spriteCtx.clearRect(col * frameWidth, row * frameHeight, frameWidth, frameHeight)
    spriteCtx.drawImage(cellCanvas, col * frameWidth, row * frameHeight)
  }

  return { spriteCanvas, frameCount, columns, rows, frameWidth, frameHeight }
}
