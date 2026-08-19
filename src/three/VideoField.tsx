import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DataTexture,
  NearestFilter,
  RedFormat,
  UnsignedByteType,
  type Points,
  type ShaderMaterial,
} from 'three'

import type { HeroFieldData } from '../hooks/useHeroField'
import { usePointer } from '../hooks/usePointer'
import { videoFieldFragmentShader, videoFieldVertexShader } from './videoFieldShaders'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface VideoFieldProps {
  data: HeroFieldData
  glowColor: string
  /** 0..1, driven by the section's scroll-pin progress. Maps directly to a
   *  baked frame position: nothing here reinterprets it. */
  progress: RefObject<number>
  /** Hold on one representative frame, no pointer response, no breathing. */
  still: boolean
  containerRef: RefObject<HTMLElement | null>
}

/**
 * Renders the baked Hero video field.
 *
 * Unlike `HarmonicField`, this component computes nothing about the form
 * itself: every position arrived pre-baked, and the only per-frame work here
 * is telling the shader which two baked frames to blend between. See
 * `videoFieldShaders.ts` for why there is no idle rotation.
 */
export function VideoField({
  data,
  glowColor,
  progress,
  still,
  containerRef,
}: VideoFieldProps) {
  const points = useRef<Points>(null)
  const material = useRef<ShaderMaterial>(null)

  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)

  const { pointer, target } = usePointer(!still, containerRef)
  const smoothPointer = useRef({ x: 0, y: 0 })
  const smoothProgress = useRef(0)

  // Per-point (column, row-within-frame) coordinates into the tone texture.
  // Depends only on point index and the texture's fixed width, so it is
  // computed once and never touched again.
  const toneCoords = useMemo(() => {
    const col = new Float32Array(data.count)
    const row = new Float32Array(data.count)
    for (let i = 0; i < data.count; i++) {
      col[i] = i % data.textureWidth
      row[i] = Math.floor(i / data.textureWidth)
    }
    return { col, row }
  }, [data])

  const toneTexture = useMemo(() => {
    const tex = new DataTexture(
      data.toneTexture,
      data.textureWidth,
      data.textureHeight,
      RedFormat,
      UnsignedByteType,
    )
    // Nearest, not linear: the shader already does its own explicit blend
    // between two frames. Letting the GPU also interpolate between adjacent
    // texels would blend one point's tone into its neighbour's, which is
    // meaningless since neighbouring texels are different points, not
    // adjacent samples of the same signal.
    tex.minFilter = NearestFilter
    tex.magFilter = NearestFilter
    tex.generateMipmaps = false
    tex.needsUpdate = true
    return tex
  }, [data])

  const uniforms = useMemo(() => {
    const glow = new Color(glowColor)
    return {
      uToneTex: { value: toneTexture },
      uFrameCount: { value: data.frameCount },
      uRowsPerFrame: { value: data.rowsPerFrame },
      uTexWidth: { value: data.textureWidth },
      uTexHeight: { value: data.textureHeight },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uPointer: { value: [0, 0] as [number, number] },
      uPointerOn: { value: 0 },
      uAspect: { value: 1 },
      // Larger than the portrait's 0.055: this field's point density is
      // lower even after the bounding-box and worldHeight fixes (a
      // multi-frame union is inherently more spread than one static crop),
      // so it needs bigger points to reach the same additive-blend
      // brightness. Verified at the real stage scale: 0.105 lands face
      // brightness at 97-110 across the whole scroll range, matching the
      // portrait's proven 94-120 band. Documented at length in CLAUDE.md; do
      // not "fix" dimness here by adding points before checking the actual
      // rendered pixel size.
      uSize: { value: 0.105 },
      uScale: { value: 420 },
      // uPush is 0, not the portrait's 0.55: pointer-push is a constant-
      // direction radial displacement scaled by a distance falloff, which
      // always forms a shell (points near the cursor get shoved nearly the
      // full uPush distance, points at uRadius barely move), and at this
      // field's larger uSize that shell rendered as a hard, ugly ring rather
      // than a glow. Zero push keeps the brightening/enlarging/recolour
      // terms (still driven by `influence`) but leaves points in place, so
      // hovering reads as a soft diffuse bloom instead of a punched hole.
      // Verified visually before locking this in.
      uRadius: { value: 0.36 },
      uPush: { value: 0.0 },
      uOpacity: { value: 1 },
      uGlowColor: { value: [glow.r, glow.g, glow.b] as [number, number, number] },
    }
    // Uniforms are rebuilt only if the underlying data or texture identity
    // changes, matching the pattern in every other particle component: this
    // is a mount-time setup, not something touched every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, toneTexture, glowColor])

  useFrame((state, delta) => {
    const mat = material.current
    if (!mat) return

    if (still) {
      mat.uniforms.uTime.value = 0
      // A frame partway through the clip, not either end: legible as "the
      // subject", not a near-empty first or last frame of the bake.
      mat.uniforms.uProgress.value = 0.5
      mat.uniforms.uPointerOn.value = 0
      return
    }

    const step = Math.min(delta, 1 / 30)

    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Eased toward the scroll-driven value, same reasoning as every other
    // stage: a raw scroll value snaps; easing lets a flicked wheel settle.
    smoothProgress.current = lerp(
      smoothProgress.current,
      progress.current,
      1 - Math.pow(0.001, step),
    )
    mat.uniforms.uProgress.value = smoothProgress.current

    const ease = 1 - Math.pow(0.0015, step)
    smoothPointer.current.x = lerp(smoothPointer.current.x, pointer.current.x, ease)
    smoothPointer.current.y = lerp(smoothPointer.current.y, pointer.current.y, ease)

    const uPointer = mat.uniforms.uPointer.value as [number, number]
    uPointer[0] = smoothPointer.current.x
    uPointer[1] = smoothPointer.current.y

    pointer.current.active = lerp(pointer.current.active, target.current, ease)
    mat.uniforms.uPointerOn.value = pointer.current.active

    mat.uniforms.uAspect.value = size.width / size.height
    mat.uniforms.uScale.value = (size.height * dpr) / 2
  })

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[data.randoms, 3]} />
        <bufferAttribute attach="attributes-aToneCol" args={[toneCoords.col, 1]} />
        <bufferAttribute attach="attributes-aToneRow" args={[toneCoords.row, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={videoFieldVertexShader}
        fragmentShader={videoFieldFragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
