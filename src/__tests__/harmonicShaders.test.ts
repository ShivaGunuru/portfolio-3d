import { describe, expect, it } from 'vitest'

import {
  harmonicFragmentShader,
  harmonicVertexShader,
} from '../three/harmonicShaders'

/**
 * A varying that the fragment shader reads but the vertex shader never
 * declares is a link error. It produces a blank canvas at runtime and is
 * invisible to typecheck, so it is checked structurally here.
 */
function varyingsIn(source: string): string[] {
  return [...source.matchAll(/varying\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1])
}

describe('harmonic shaders', () => {
  it('declares every fragment varying in the vertex shader too', () => {
    const fragment = varyingsIn(harmonicFragmentShader)
    const vertex = varyingsIn(harmonicVertexShader)
    expect(fragment.length).toBeGreaterThan(0)
    for (const name of fragment) {
      expect(vertex).toContain(name)
    }
  })

  it('assigns every varying it declares in the vertex shader', () => {
    for (const name of varyingsIn(harmonicVertexShader)) {
      expect(harmonicVertexShader).toMatch(
        new RegExp(`${name}\\s*=`),
      )
    }
  })

  it('carries a depth varying, used to fade the far side of the form', () => {
    expect(varyingsIn(harmonicVertexShader)).toContain('vDepth')
    expect(varyingsIn(harmonicFragmentShader)).toContain('vDepth')
    expect(harmonicFragmentShader).toContain('mix(1.0, 0.2, vDepth)')
  })

  it('fades points sitting on the radius floor', () => {
    // harmonicRadius floors at 0.12. Every angle where all four terms cancel
    // lands there, piling a dark knot at the origin, so those points are
    // faded out rather than drawn.
    expect(harmonicVertexShader).toContain('smoothstep(0.13, 0.45, r)')
  })
})
