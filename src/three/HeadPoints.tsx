import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  type Group,
  type Points,
  type ShaderMaterial,
} from 'three'

import { usePointer } from '../hooks/usePointer'
import { headFragmentShader, headVertexShader } from './headShaders'
import { sampleHeadPoints } from './headSurface'
import type { PortraitPointData } from './portraitSampler'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export type HeadMode = 'assemble' | 'turn'

/**
 * How far the parametric head rotates in `turn` mode. Short of a full 90
 * degrees on purpose: a true profile points the head edge-on to the fixed
 * front camera, which reads as empty space rather than a turned head.
 */
const TURN_ANGLE = -Math.PI * 0.32

/**
 * The portrait turns considerably less.
 *
 * A photograph sampled into points is a bas-relief, not a closed volume: it
 * has a front and nothing behind it. Rotating it as far as the parametric head
 * would swing the flat side toward the camera and give the illusion away.
 * A shallow angle instead reads as parallax on a solid form.
 */
const PORTRAIT_TURN_ANGLE = -Math.PI * 0.11

/** Idle sway amplitude, same reasoning as the turn angles above. */
const IDLE_SWAY = 0.35
const PORTRAIT_IDLE_SWAY = 0.12

const POINT_COUNT = 18000

interface HeadPointsProps {
  baseColor: string
  accentColor: string
  glowColor: string
  /** 0..1, driven externally by the section's scroll-pin progress. */
  progress: RefObject<number>
  /** 'assemble': 0 = scattered wave field, 1 = formed head.
   *  'turn': head stays formed throughout, rotating from front to profile. */
  mode: HeadMode
  /** Hold everything still: no idle motion, no pointer response. */
  still: boolean
  /** The stage's own DOM container, so pointer NDC is computed relative to
   *  this canvas's box rather than the whole window. */
  containerRef: RefObject<HTMLElement | null>
  /**
   * Sampled portrait photo. When absent the parametric head is used instead,
   * so the stage still renders if the photo is missing or fails to decode.
   */
  portrait?: PortraitPointData | null
}

export function HeadPoints({
  baseColor,
  accentColor,
  glowColor,
  progress,
  mode,
  still,
  containerRef,
  portrait,
}: HeadPointsProps) {
  const group = useRef<Group>(null)
  const points = useRef<Points>(null)
  const material = useRef<ShaderMaterial>(null)

  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const invalidate = useThree((state) => state.invalidate)

  const { pointer, target } = usePointer(!still, containerRef)
  const smoothPointer = useRef({ x: 0, y: 0 })

  const fallback = useMemo(
    () => sampleHeadPoints(POINT_COUNT, baseColor, accentColor),
    [baseColor, accentColor],
  )

  const data = portrait ?? fallback
  const isPortrait = Boolean(portrait)

  const turnAngle = isPortrait ? PORTRAIT_TURN_ANGLE : TURN_ANGLE
  const idleSway = isPortrait ? PORTRAIT_IDLE_SWAY : IDLE_SWAY

  const uniforms = useMemo(() => {
    // Converted the same way the point colours are, so the glow tint and the
    // cloud share one colour space.
    const glow = new Color(glowColor)
    return {
      uTime: { value: 0 },
      uScatter: { value: 0 },
      uPointer: { value: [0, 0] as [number, number] },
      uPointerOn: { value: 0 },
      uAspect: { value: 1 },
      uSize: { value: 0.016 },
      uScale: { value: 400 },
      uRadius: { value: 0.32 },
      uPush: { value: 0.55 },
      uOpacity: { value: 0.85 },
      uGlowColor: { value: [glow.r, glow.g, glow.b] as [number, number, number] },
    }
    // Rebuilding uniforms would drop the current animation state, so this is
    // intentionally built once per colour set only.
  }, [glowColor])

  // The portrait samples on a denser, flatter grid than the parametric head,
  // so its points want to be smaller to avoid reading as a solid sheet.
  useEffect(() => {
    const mat = material.current
    if (!mat) return
    mat.uniforms.uSize.value = isPortrait ? 0.011 : 0.016
    // Under reduced motion or off-screen the frame loop is on demand, so a
    // newly loaded cloud would otherwise never be drawn.
    invalidate()
  }, [isPortrait, data, invalidate])

  useFrame((state, delta) => {
    const mat = material.current
    if (!mat) return

    const p = progress.current

    if (still) {
      mat.uniforms.uTime.value = 0
      mat.uniforms.uScatter.value = mode === 'assemble' ? 1 - p : 0
      mat.uniforms.uPointerOn.value = 0
      if (group.current) {
        group.current.rotation.y = mode === 'turn' ? turnAngle * p : 0
      }
      return
    }

    // Clamp: a backgrounded tab resumes with a huge delta, which would fling
    // the eased pointer position past its target in a single visible jump.
    const step = Math.min(delta, 1 / 30)

    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uScatter.value = mode === 'assemble' ? 1 - p : 0

    if (group.current) {
      group.current.rotation.y =
        mode === 'turn'
          ? lerp(0, turnAngle, p)
          : Math.sin(state.clock.elapsedTime * 0.16) * idleSway
    }

    // --- pointer ------------------------------------------------------------
    const ease = 1 - Math.pow(0.0015, step)
    smoothPointer.current.x = lerp(smoothPointer.current.x, pointer.current.x, ease)
    smoothPointer.current.y = lerp(smoothPointer.current.y, pointer.current.y, ease)

    const uPointer = mat.uniforms.uPointer.value as [number, number]
    uPointer[0] = smoothPointer.current.x
    uPointer[1] = smoothPointer.current.y

    pointer.current.active = lerp(pointer.current.active, target.current, ease)
    mat.uniforms.uPointerOn.value = pointer.current.active

    // --- viewport -----------------------------------------------------------
    mat.uniforms.uAspect.value = size.width / size.height
    mat.uniforms.uScale.value = (size.height * dpr) / 2
  })

  return (
    <group ref={group}>
      <points
        ref={points}
        // The morph throws points far outside their original bounds, so the
        // culler's cached bounding sphere would wrongly cull the whole cloud.
        frustumCulled={false}
      >
        {/* Keyed on the point count: when the portrait finishes loading it
            replaces a differently sized cloud, and reusing the existing
            geometry would leave attributes and draw range mismatched. */}
        <bufferGeometry key={data.count}>
          <bufferAttribute
            attach="attributes-position"
            args={[data.positions, 3]}
          />
          <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
          <bufferAttribute attach="attributes-aRandom" args={[data.randoms, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={headVertexShader}
          fragmentShader={headFragmentShader}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}
