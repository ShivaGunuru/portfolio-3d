import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The Hero portrait is composited as a true cut-out: transparent background,
 * drawn with normal blending over the giant back name.
 *
 * It used to rely on `mix-blend-mode: multiply` to make the frames' white
 * background disappear, and that darkened the subject wherever the pale name
 * sat behind it, in letter shapes the camera push then magnified across the
 * face. Worse, once the hi-res still swapped in it multiplied over the frame
 * canvas beneath it, squaring every colour value (a 160 skin tone came out
 * near 100): the "goes dark while zooming" bug. These checks keep both from
 * returning.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)))

/**
 * Whether a WebP file carries alpha: an extended (VP8X) WebP whose flags byte
 * (offset 20) has the alpha bit (0x10) set. Lossy WebP is safe here, unlike
 * for the old opaque frames, because the background is transparent: there is
 * no white left for compression to nudge off 255 into a visible box.
 */
function webpHasAlpha(path: string): boolean {
  const b = read(path)
  const tag = (start: number) => b.subarray(start, start + 4).toString('latin1')
  return tag(0) === 'RIFF' && tag(8) === 'WEBP' && tag(12) === 'VP8X' && (b[20] & 0x10) !== 0
}

describe('hero cutout assets', () => {
  it('ships the sprite sheet with an alpha channel', () => {
    expect(webpHasAlpha('../assets/hero-cutout.webp')).toBe(true)
  })

  it('ships the lens still with an alpha channel', () => {
    expect(webpHasAlpha('../assets/hero-lens-still.webp')).toBe(true)
  })

  it('composites the portrait without multiply anywhere', () => {
    for (const file of ['../components/HeroCutoutStage.tsx', '../components/HeroCutout.tsx']) {
      expect(read(file).toString('utf8')).not.toMatch(/mix-blend|multiply/)
    }
  })
})
