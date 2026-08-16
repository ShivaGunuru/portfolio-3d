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
import {
  HARMONIC_A,
  HARMONIC_B,
  buildHarmonicField,
  harmonicFitScale,
} from './harmonicGeometry'
import { harmonicFragmentShader, harmonicVertexShader } from './harmonicShaders'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const POINT_COUNT = 42000

interface HarmonicFieldProps {
  baseColor: string
  accentColor: string
  glowColor: string
  /** 0..1 scroll-pin progress. Drives the morph between harmonic sets. */
  progress: RefObject<number>
  /** Hold everything still: no drift, no breathing, no pointer response. */
  still: boolean
  containerRef: RefObject<HTMLElement | null>
}

/**
 * A generative counterpart to the portrait: same shader discipline, entirely
 * different subject.
 *
 * Where the Hero cloud is a sampled likeness, this is solved from an equation,
 * so it has no source image and no fixed shape. Scroll interpolates the eight
 * harmonic exponents, and the surface reorganises itself continuously between
 * two forms rather than replaying keyframes.
 */
export function HarmonicField({
  baseColor,
  accentColor,
  glowColor,
  progress,
  still,
  containerRef,
}: HarmonicFieldProps) {
  const group = useRef<Group>(null)
  const points = useRef<Points>(null)
  const material = useRef<ShaderMaterial>(null)

  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const invalidate = useThree((state) => state.invalidate)

  const { pointer, target } = usePointer(!still, containerRef)
  const smoothPointer = useRef({ x: 0, y: 0 })
  const smoothMorph = useRef(0)

  const data = useMemo(
    () => buildHarmonicField(POINT_COUNT, baseColor, accentColor),
    [baseColor, accentColor],
  )

  const uniforms = useMemo(() => {
    const glow = new Color(glowColor)
    return {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uHarmA0: { value: HARMONIC_A.slice(0, 4) as unknown as number[] },
      uHarmA1: { value: HARMONIC_A.slice(4, 8) as unknown as number[] },
      uHarmB0: { value: HARMONIC_B.slice(0, 4) as unknown as number[] },
      uHarmB1: { value: HARMONIC_B.slice(4, 8) as unknown as number[] },
      // Fitted rather than guessed, and sampled across the morph so the
      // midpoint cannot overflow the frame even if it is wider than either end.
      uScaleWorld: { value: harmonicFitScale(HARMONIC_A, HARMONIC_B) },
      uPointer: { value: [0, 0] as [number, number] },
      uPointerOn: { value: 0 },
      uAspect: { value: 1 },
      // Sized against the 1px floor, the same trap the portrait hit: below
      // roughly 0.03 at this scale every point clamps and the field goes flat.
      uSize: { value: 0.05 },
      uScale: { value: 400 },
      uRadius: { value: 0.34 },
      uPush: { value: 0.6 },
      uOpacity: { value: 1 },
      uGlowColor: { value: [glow.r, glow.g, glow.b] as [number, number, number] },
    }
  }, [glowColor])

  useEffect(() => {
    invalidate()
  }, [data, invalidate])

  useFrame((state, delta) => {
    const mat = material.current
    if (!mat) return

    const p = progress.current

    if (still) {
      // A single representative frame: half morphed, so the form is legible
      // rather than sitting at either extreme.
      mat.uniforms.uTime.value = 0
      mat.uniforms.uMorph.value = 0.5
      mat.uniforms.uPointerOn.value = 0
      if (group.current) group.current.rotation.y = 0.5
      return
    }

    const step = Math.min(delta, 1 / 30)

    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Ease toward the scroll value so flicking the wheel does not snap the
    // form between states.
    smoothMorph.current = lerp(
      smoothMorph.current,
      p,
      1 - Math.pow(0.001, step),
    )
    mat.uniforms.uMorph.value = smoothMorph.current

    if (group.current) {
      // Constant slow yaw plus a scroll-linked sweep, so the form turns as it
      // reorganises and never presents the same silhouette twice.
      group.current.rotation.y =
        state.clock.elapsedTime * 0.07 + smoothMorph.current * Math.PI * 0.55
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.13) * 0.12
    }

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
    <group ref={group}>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry key={data.count}>
          {/* `position` is required by three for bounds even though every
              position is solved in the shader from aSeed. */}
          <bufferAttribute attach="attributes-position" args={[data.seeds, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
          <bufferAttribute attach="attributes-aRandom" args={[data.randoms, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={harmonicVertexShader}
          fragmentShader={harmonicFragmentShader}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}
