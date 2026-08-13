import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

interface PlaceholderShapeProps {
  color: string
  accent: string
  /** Fewer subdivisions on mobile, the deliberate lighter experience. */
  detail: number
  /** When true the shape is posed and still rather than animated. */
  still: boolean
}

/**
 * Temporary. Exists only to prove WebGL renders and that colours resolve from
 * the design tokens. Replaced by the head visualisation from
 * docs/direction/project/head-stage.js.
 */
export function PlaceholderShape({
  color,
  accent,
  detail,
  still,
}: PlaceholderShapeProps) {
  const mesh = useRef<Mesh>(null)

  useFrame((_state, delta) => {
    if (still || !mesh.current) return
    mesh.current.rotation.x += delta * 0.15
    mesh.current.rotation.y += delta * 0.22
  })

  return (
    <group>
      <mesh ref={mesh} rotation={[0.4, 0.6, 0]}>
        <icosahedronGeometry args={[1.35, detail]} />
        <meshStandardMaterial
          color={color}
          emissive={accent}
          emissiveIntensity={0.12}
          roughness={0.45}
          metalness={0.1}
          wireframe
        />
      </mesh>

      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color={accent} />
    </group>
  )
}
