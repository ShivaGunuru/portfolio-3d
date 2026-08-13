import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  type Group,
  type Points,
  type ShaderMaterial,
} from 'three'

import { usePointer } from '../hooks/usePointer'
import { useScrollPhase } from '../hooks/useScrollPhase'
import { headFragmentShader, headVertexShader } from './headShaders'
import { sampleHeadPoints } from './headSurface'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface HeadPointsProps {
  baseColor: string
  accentColor: string
  glowColor: string
  /** Lighter scene: fewer points, larger, no pointer response. */
  compact: boolean
  /** Hold everything still and skip the pointer entirely. */
  still: boolean
}

export function HeadPoints({
  baseColor,
  accentColor,
  glowColor,
  compact,
  still,
}: HeadPointsProps) {
  const group = useRef<Group>(null)
  const points = useRef<Points>(null)
  const material = useRef<ShaderMaterial>(null)

  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)

  const interactive = !compact && !still
  const { pointer, target } = usePointer(interactive)
  const { sample } = useScrollPhase()

  // Smoothed values, so scroll and hover ease rather than snap.
  const smoothPhase = useRef(0)
  const smoothPointer = useRef({ x: 0, y: 0 })

  const data = useMemo(
    () => sampleHeadPoints(compact ? 4000 : 26000, baseColor, accentColor),
    [compact, baseColor, accentColor],
  )

  const uniforms = useMemo(() => {
    // Converted the same way the point colours are, so the glow tint and the
    // cloud share one colour space.
    const glow = new Color(glowColor)
    return {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uPointer: { value: [0, 0] as [number, number] },
      uPointerOn: { value: 0 },
      uAspect: { value: 1 },
      uSize: { value: compact ? 0.026 : 0.016 },
      uScale: { value: 400 },
      uRadius: { value: 0.32 },
      uPush: { value: 0.55 },
      uOpacity: { value: 0.85 },
      uGlowColor: { value: [glow.r, glow.g, glow.b] as [number, number, number] },
    }
    // Rebuilding uniforms would drop the current animation state, so this is
    // intentionally built once per compact/desktop mode only.
  }, [compact, glowColor])

  useFrame((state, delta) => {
    const mat = material.current
    if (!mat) return

    // Clamp: a backgrounded tab resumes with a huge delta, which would fling
    // the eased values past their targets in a single visible jump.
    const step = Math.min(delta, 1 / 30)

    if (still) {
      mat.uniforms.uTime.value = 0
      mat.uniforms.uPhase.value = 0
      mat.uniforms.uPointerOn.value = 0
      if (group.current) group.current.rotation.y = 0
      return
    }

    mat.uniforms.uTime.value = state.clock.elapsedTime

    // --- scroll phase -------------------------------------------------------
    const phase = sample()
    smoothPhase.current = lerp(smoothPhase.current, phase, 1 - Math.pow(0.001, step))
    const p = smoothPhase.current
    mat.uniforms.uPhase.value = p

    // Idle sway that turns into a deliberate quarter-turn to profile as the
    // reader moves into About, then holds while the cloud disperses.
    const decay = Math.min(Math.max(p - 2, 0), 1)
    const turn = Math.min(Math.max(p - 1, 0), 1) * (1 - decay)
    if (group.current) {
      group.current.rotation.y = lerp(
        Math.sin(state.clock.elapsedTime * 0.16) * 0.55,
        -Math.PI / 2,
        turn,
      )
    }

    mat.uniforms.uOpacity.value = 0.85 * (1 - decay * 0.72)

    // --- pointer ------------------------------------------------------------
    if (interactive) {
      const ease = 1 - Math.pow(0.0015, step)
      smoothPointer.current.x = lerp(smoothPointer.current.x, pointer.current.x, ease)
      smoothPointer.current.y = lerp(smoothPointer.current.y, pointer.current.y, ease)

      const uPointer = mat.uniforms.uPointer.value as [number, number]
      uPointer[0] = smoothPointer.current.x
      uPointer[1] = smoothPointer.current.y

      pointer.current.active = lerp(pointer.current.active, target.current, ease)
      mat.uniforms.uPointerOn.value = pointer.current.active
    }

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
        <bufferGeometry>
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
