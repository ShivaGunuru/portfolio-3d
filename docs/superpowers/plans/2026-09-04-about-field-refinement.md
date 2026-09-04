# About Field Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the About section's harmonic point field from something that reads as a speckled splatter into a legible sculptural object, and remove the soft-cloud box behind it so it sits directly on the white page.

**Architecture:** Five changes to the existing WebGL point field, no new systems. The geometry module gets new harmonic parameter sets and loses its decorative accent-recolouring. The shaders gain a depth varying and a fade for degenerate points. The component gets a larger point size and a precomputed per-morph fit table so the form holds constant on-screen size while it reorganises. The About section drops one Tailwind class.

**Tech Stack:** React 19, TypeScript, React Three Fiber, three.js, GLSL, Tailwind CSS v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-04-about-field-refinement-design.md`. Every numeric value in this plan comes from that spec, where it was chosen by rendering and comparing rather than reasoning.

## Global Constraints

- No em dashes anywhere in code, comments, or copy. Enforced for site copy by `src/__tests__/content.test.ts`; apply the same rule to comments by hand.
- No new npm dependencies.
- `src/index.css` is the only file where a hex value or font name may appear. The exception already in the tree is `HeadStage.tsx`'s `getComputedStyle` fallbacks, which must stay in step with the tokens.
- `prefers-reduced-motion` behaviour must not regress. The field holds a single still frame at morph 0.5; verified by `src/__tests__/reducedMotion.test.ts` plus a manual check in Task 5.
- The field must not render at all below 768px. Unchanged by this plan, reconfirmed in Task 5.
- No layout shift. The stage box is reserved before the scene loads; this plan does not touch that.
- Point count stays 42,000. The spec measured 24,000 and 70,000 and rejected both.

---

### Task 1: New harmonic forms, and remove the accent speckle

**Files:**
- Modify: `src/three/harmonicGeometry.ts` (the `HARMONIC_A`/`HARMONIC_B` constants and `buildHarmonicField`)
- Modify: `src/three/HarmonicField.tsx` (the `accentColor` prop and the `buildHarmonicField` call)
- Modify: `src/three/HeadStage.tsx` (stop reading `--color-accent`, stop passing `accentColor`)
- Create: `src/__tests__/harmonicGeometry.test.ts`

**Interfaces:**
- Produces: `buildHarmonicField(count: number, baseColor: string): HarmonicPointData`. The `accentColor` and `accentRatio` parameters are gone. Task 3 adds further exports to this same module.
- Produces: `HARMONIC_A = [2,2,2,2,2,2,2,2]`, `HARMONIC_B = [2,4,3,4,2,4,3,4]`.

All three files change in one task because the signature change breaks its two callers immediately. Splitting them would leave the tree failing typecheck between tasks.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/harmonicGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  HARMONIC_A,
  HARMONIC_B,
  buildHarmonicField,
} from '../three/harmonicGeometry'

describe('harmonic parameter sets', () => {
  it('keeps every exponent in the range that produces a closed silhouette', () => {
    // The exponents are the odd indices. The previous sets used 6 almost
    // throughout, which carves lobes so hard that equal-area sphere sampling
    // stretches them into thin radiating sprays: a firework, not an object.
    for (const set of [HARMONIC_A, HARMONIC_B]) {
      for (const index of [1, 3, 5, 7]) {
        expect(set[index]).toBeLessThanOrEqual(4)
        expect(set[index]).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('has eight numbers in each set', () => {
    expect(HARMONIC_A).toHaveLength(8)
    expect(HARMONIC_B).toHaveLength(8)
  })
})

describe('buildHarmonicField', () => {
  it('gives every point the same colour', () => {
    // The field used to recolour 14% of points to the accent, which read as
    // sparkle on a near-black page and as dirt on a white one. A single
    // colour across the whole buffer is the guard against that returning.
    const { colors, count } = buildHarmonicField(2000, '#1a1a1a')
    const [r, g, b] = [colors[0], colors[1], colors[2]]
    for (let i = 0; i < count; i++) {
      expect(colors[i * 3]).toBe(r)
      expect(colors[i * 3 + 1]).toBe(g)
      expect(colors[i * 3 + 2]).toBe(b)
    }
  })

  it('fills every buffer to the requested count', () => {
    const data = buildHarmonicField(500, '#1a1a1a')
    expect(data.count).toBe(500)
    expect(data.seeds).toHaveLength(1500)
    expect(data.colors).toHaveLength(1500)
    expect(data.randoms).toHaveLength(1500)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/harmonicGeometry.test.ts`
Expected: FAIL. The exponent test fails because the current sets contain 6, and the colour test fails because roughly 14% of points carry the accent colour.

- [ ] **Step 3: Replace the harmonic parameter sets**

In `src/three/harmonicGeometry.ts`, replace:

```ts
export const HARMONIC_A = [2, 6, 3, 6, 5, 6, 2, 6] as const
export const HARMONIC_B = [8, 6, 2, 3, 4, 6, 1, 1] as const
```

with:

```ts
export const HARMONIC_A = [2, 2, 2, 2, 2, 2, 2, 2] as const
export const HARMONIC_B = [2, 4, 3, 4, 2, 4, 3, 4] as const
```

Then replace the doc comment above them, which currently argues for high exponents, with:

```ts
/**
 * The two spherical-harmonic parameter sets the field morphs between.
 *
 * Each is eight numbers driving the classic
 * `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`,
 * where the even indices are frequencies and the odd ones are exponents.
 *
 * A is a sphere and B is a four-pointed star, so scroll reads as a system
 * resolving out of an undifferentiated ball into structure. Rendered at morph
 * 0, 0.25, 0.5, 0.75 and 1, the sequence runs sphere, rounded cube,
 * four-petal, cross, star, and every step in it has a closed silhouette.
 *
 * The exponents are the load-bearing part, and they are deliberately low.
 * An earlier pair used 6 almost throughout on the theory that high exponents
 * carve distinct lobes, which they do. What that missed is what happens when
 * hard lobes meet equal-area sphere sampling: the lobes stretch into thin
 * radiating sprays of scattered points, and the result reads as a firework
 * rather than an object. That is most of why this field looked amateurish.
 * Values in the 2 to 4 range keep the surface closed and legible.
 */
```

- [ ] **Step 4: Remove the accent recolouring from `buildHarmonicField`**

Replace the whole function with:

```ts
export function buildHarmonicField(
  count: number,
  baseColor: string,
): HarmonicPointData {
  const seeds = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 3)

  // One colour for the whole field. An earlier revision scattered accent
  // points through the volume at a 14% ratio so the highlight would "read as
  // sparkle through the volume". That held while the page was near-black. On
  // white, randomly placed coloured specks read as dirt: scanner dust, or
  // compression artifacts. Emphasis is now entirely the cursor's job, which
  // is the difference between a highlight that means something and one that
  // is just noise.
  const base = new Color(baseColor)

  const golden = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    // Even in cos(phi) gives equal area per band.
    const y = 1 - (i / (count - 1)) * 2
    const phi = Math.acos(Math.min(1, Math.max(-1, y)))
    const theta = (golden * i) % (Math.PI * 2)

    seeds[i3] = theta
    seeds[i3 + 1] = phi
    seeds[i3 + 2] = Math.random()

    colors[i3] = base.r
    colors[i3 + 1] = base.g
    colors[i3 + 2] = base.b

    randoms[i3] = Math.random() * 2 - 1
    randoms[i3 + 1] = Math.random()
    randoms[i3 + 2] = Math.random() * 2 - 1
  }

  return { seeds, colors, randoms, count }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/harmonicGeometry.test.ts`
Expected: PASS, all four cases.

- [ ] **Step 6: Update `HarmonicField.tsx` to stop passing an accent colour**

In `src/three/HarmonicField.tsx`, remove the `accentColor` line from the props interface:

```ts
interface HarmonicFieldProps {
  baseColor: string
  glowColor: string
  /** 0..1 scroll-pin progress. Drives the morph between harmonic sets. */
  progress: RefObject<number>
  /** Hold everything still: no drift, no breathing, no pointer response. */
  still: boolean
  containerRef: RefObject<HTMLElement | null>
}
```

Remove `accentColor` from the destructured parameters so the signature reads:

```ts
export function HarmonicField({
  baseColor,
  glowColor,
  progress,
  still,
  containerRef,
}: HarmonicFieldProps) {
```

And change the data memo:

```ts
  const data = useMemo(
    () => buildHarmonicField(POINT_COUNT, baseColor),
    [baseColor],
  )
```

- [ ] **Step 7: Update `HeadStage.tsx` to stop reading the accent token**

In `src/three/HeadStage.tsx`, change the token state to drop the accent entry:

```ts
  const [tokens] = useState(() => ({
    base: readToken('--color-head-fg', '#1a1a1a'),
    glow: readToken('--color-head-glow', '#d98a2e'),
  }))
```

And remove the `accentColor` prop from the render:

```tsx
        <HarmonicField
          baseColor={tokens.base}
          glowColor={tokens.glow}
          progress={progress}
          still={reducedMotion}
          containerRef={container}
        />
```

- [ ] **Step 8: Typecheck and run the full suite**

Run: `npm run typecheck && npm test`
Expected: both PASS. Typecheck is what confirms no other caller of `buildHarmonicField` or `accentColor` was missed.

- [ ] **Step 9: Commit**

```bash
git add src/three/harmonicGeometry.ts src/three/HarmonicField.tsx src/three/HeadStage.tsx src/__tests__/harmonicGeometry.test.ts
git commit -m "refactor: give the About field closed harmonic forms and one colour"
```

---

### Task 2: Depth cueing, degenerate-point fade, and point size

**Files:**
- Modify: `src/three/harmonicShaders.ts` (both shader strings)
- Modify: `src/three/HarmonicField.tsx` (the `uSize` uniform)
- Create: `src/__tests__/harmonicShaders.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 beyond the module compiling.
- Produces: a `vDepth` varying declared in both stages. No TypeScript surface changes.

A varying declared in one stage but not the other is a link error that shows up as a blank canvas at runtime and as nothing at all in typecheck, which is why it gets a structural test rather than trusting review.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/harmonicShaders.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/harmonicShaders.test.ts`
Expected: FAIL on the depth and floor-fade cases. The first two cases pass already, and should keep passing.

- [ ] **Step 3: Add the depth varying and the floor fade to the vertex shader**

In `src/three/harmonicShaders.ts`, in `harmonicVertexShader`, add the varying declaration alongside the others:

```glsl
  varying vec3  vColor;
  varying float vGlow;
  varying float vTone;
  varying float vDepth;
```

Then replace this block:

```glsl
    // Radius doubles as tone: the reaching parts of the form read brighter
    // than the folds, which is what gives a single-colour cloud its depth.
    float shade = clamp((r - 0.4) / 2.2, 0.0, 1.0);
    vTone  = 0.30 + 0.70 * shade;
    vGlow  = influence;
    vColor = aColor;
```

with:

```glsl
    // Radius doubles as tone: the reaching parts of the form read brighter
    // than the folds, which is what gives a single-colour cloud its depth.
    //
    // The smoothstep is a separate job: harmonicRadius floors at 0.12, so
    // every angle where all four terms happen to cancel lands on that floor
    // and those points pile into a dark knot at the origin. They carry no
    // shape information, so they are faded out instead of drawn.
    float shade = clamp((r - 0.4) / 2.2, 0.0, 1.0);
    vTone  = (0.30 + 0.70 * shade) * smoothstep(0.13, 0.45, r);
    vGlow  = influence;
    vColor = aColor;

    // Distance from the camera, normalised across the range the fitted form
    // actually occupies: the camera sits at z 7.3 and the form is fitted to a
    // radius of 1.55, so view depth runs about 5.75 to 8.85. The fragment
    // stage fades the far side with this. Perspective already shrinks distant
    // points, but over that shallow a range the effect is roughly 25% and
    // reads as nothing, which is why 42,000 points looked like a flat speckle
    // field rather than a volume.
    vDepth = clamp((-viewPos.z - 5.2) / 4.2, 0.0, 1.0);
```

- [ ] **Step 4: Consume the depth varying in the fragment shader**

In `harmonicFragmentShader`, add the declaration:

```glsl
  varying vec3  vColor;
  varying float vGlow;
  varying float vTone;
  varying float vDepth;
```

And replace:

```glsl
    float alpha = falloff * uOpacity * vTone * (1.0 + vGlow * 0.35);
```

with:

```glsl
    // The far side fades toward the page. This is the single largest gain in
    // this pass: it is what turns a flat speckle field into a volume.
    float alpha = falloff * uOpacity * vTone * mix(1.0, 0.2, vDepth) * (1.0 + vGlow * 0.35);
```

- [ ] **Step 5: Raise the point size**

In `src/three/HarmonicField.tsx`, replace the `uSize` uniform and its comment:

```ts
      // Sized against the 1px floor, the same trap the portrait hit: below
      // roughly 0.03 at this scale every point clamps and the field goes flat.
      // 0.07 rather than 0.05 because fine dark specks on white read as grit:
      // measured against the alternatives, 24,000 points at 0.08 goes chunky
      // and 70,000 at 0.042 is lighter for 66% more points, so size alone is
      // the win here.
      uSize: { value: 0.07 },
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/harmonicShaders.test.ts`
Expected: PASS, all four cases.

- [ ] **Step 7: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 8: Commit**

```bash
git add src/three/harmonicShaders.ts src/three/HarmonicField.tsx src/__tests__/harmonicShaders.test.ts
git commit -m "feat: give the About field depth cueing and drop its origin knot"
```

---

### Task 3: Hold the form at constant size through the morph

**Files:**
- Modify: `src/three/harmonicGeometry.ts` (add three exports below `harmonicFitScale`)
- Modify: `src/three/HarmonicField.tsx` (build the table, drive `uScaleWorld` per frame)
- Modify: `src/__tests__/harmonicGeometry.test.ts` (add a describe block)

**Interfaces:**
- Consumes: `HARMONIC_A`, `HARMONIC_B` and `harmonicRadius` from Task 1's module.
- Produces:
  - `harmonicFitScaleAt(a: readonly number[], b: readonly number[], morph: number, target?: number): number`
  - `MORPH_FIT_STEPS: number` (16, so the table has 17 entries)
  - `buildMorphFitTable(a: readonly number[], b: readonly number[], target?: number): Float32Array`
  - `sampleMorphFit(table: Float32Array, morph: number): number`

`harmonicFitScale` stays exported and unchanged; nothing calls it after this task, but it is the general two-set fit and removing it is not this plan's business.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/harmonicGeometry.test.ts`. Add the new names to the existing import at the top of the file:

```ts
import {
  HARMONIC_A,
  HARMONIC_B,
  MORPH_FIT_STEPS,
  buildHarmonicField,
  buildMorphFitTable,
  harmonicFitScaleAt,
  harmonicRadius,
  sampleMorphFit,
} from '../three/harmonicGeometry'
```

Then append this block:

```ts
/** The widest radius of a single parameter set, on the same grid the fit uses. */
function maxRadius(m: readonly number[]): number {
  let largest = 0
  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 64; j++) {
      const r = harmonicRadius((i / 64) * Math.PI * 2, (j / 64) * Math.PI, m)
      if (r > largest) largest = r
    }
  }
  return largest
}

describe('per-morph fit', () => {
  it('scales a shape so its widest radius lands on the target', () => {
    const scale = harmonicFitScaleAt(HARMONIC_A, HARMONIC_B, 0, 1.55)
    expect(maxRadius(HARMONIC_A) * scale).toBeCloseTo(1.55, 5)
  })

  it('fits the far endpoint too', () => {
    const scale = harmonicFitScaleAt(HARMONIC_A, HARMONIC_B, 1, 1.55)
    expect(maxRadius(HARMONIC_B) * scale).toBeCloseTo(1.55, 5)
  })

  it('renders both endpoints at the same on-screen size', () => {
    // This is the whole point of the table. With one fit spanning the morph,
    // the sphere end came out at roughly half the linear size of the star end
    // and the object visibly swelled as the page scrolled.
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    const first = maxRadius(HARMONIC_A) * table[0]
    const last = maxRadius(HARMONIC_B) * table[MORPH_FIT_STEPS]
    expect(first).toBeCloseTo(last, 5)
  })

  it('builds a table of positive, finite scales', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    expect(table).toHaveLength(MORPH_FIT_STEPS + 1)
    for (const value of table) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThan(0)
    }
  })

  it('samples the table exactly at its endpoints', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    expect(sampleMorphFit(table, 0)).toBeCloseTo(table[0], 6)
    expect(sampleMorphFit(table, 1)).toBeCloseTo(table[MORPH_FIT_STEPS], 6)
  })

  it('clamps out-of-range morph values instead of reading past the table', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    expect(sampleMorphFit(table, -0.5)).toBeCloseTo(table[0], 6)
    expect(sampleMorphFit(table, 1.5)).toBeCloseTo(table[MORPH_FIT_STEPS], 6)
  })

  it('never samples outside the range the table covers', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    const low = Math.min(...table)
    const high = Math.max(...table)
    for (let i = 0; i <= 100; i++) {
      const value = sampleMorphFit(table, i / 100)
      expect(value).toBeGreaterThanOrEqual(low - 1e-6)
      expect(value).toBeLessThanOrEqual(high + 1e-6)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/harmonicGeometry.test.ts`
Expected: FAIL to even collect, with an import error naming `harmonicFitScaleAt`, `buildMorphFitTable`, `sampleMorphFit` and `MORPH_FIT_STEPS`.

- [ ] **Step 3: Add the per-morph fit helpers**

In `src/three/harmonicGeometry.ts`, immediately after the existing `harmonicFitScale` function, add:

```ts
/**
 * Fits the single shape the morph is showing at `morph`, rather than the whole
 * range between two sets.
 *
 * `harmonicFitScale` exists for the two-set case and walks five steps between
 * them. Handed the same set twice, which is what a per-morph fit would have to
 * do, all five steps evaluate identical parameters and it performs six
 * redundant scans of the same shape. This does the interpolation once and
 * scans once, at the same 64x64 angular resolution, so it is roughly six times
 * cheaper with no loss of accuracy.
 */
export function harmonicFitScaleAt(
  a: readonly number[],
  b: readonly number[],
  morph: number,
  target = 1.55,
): number {
  // The same easing the vertex shader applies, so the fit describes the shape
  // that is actually on screen rather than one the shader never draws.
  const eased = morph * morph * (3 - 2 * morph)
  const m = a.map((value, i) => value + (b[i] - value) * eased)

  let largest = 0
  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 64; j++) {
      const r = harmonicRadius((i / 64) * Math.PI * 2, (j / 64) * Math.PI, m)
      if (r > largest) largest = r
    }
  }
  return target / largest
}

/** Table resolution. 16 steps means 17 entries, morph 0 through 1 inclusive. */
export const MORPH_FIT_STEPS = 16

/**
 * Precomputes the fit scale across the morph.
 *
 * A single scale spanning the whole morph makes an endpoint with a smaller
 * radius render smaller, so the form swells as it reorganises instead of
 * simply changing shape. Fitting per frame is not an option either: one fit
 * measured 2.37ms, against a 16.7ms frame budget. Building the table costs
 * about 7ms once, on a chunk that is already deferred until the browser is
 * idle, and each frame then interpolates between two numbers.
 */
export function buildMorphFitTable(
  a: readonly number[],
  b: readonly number[],
  target = 1.55,
): Float32Array {
  const table = new Float32Array(MORPH_FIT_STEPS + 1)
  for (let i = 0; i <= MORPH_FIT_STEPS; i++) {
    table[i] = harmonicFitScaleAt(a, b, i / MORPH_FIT_STEPS, target)
  }
  return table
}

/** Reads a table from `buildMorphFitTable`, interpolating between entries. */
export function sampleMorphFit(table: Float32Array, morph: number): number {
  const clamped = Math.min(1, Math.max(0, morph))
  const position = clamped * MORPH_FIT_STEPS
  const index = Math.min(MORPH_FIT_STEPS - 1, Math.floor(position))
  const fraction = position - index
  return table[index] + (table[index + 1] - table[index]) * fraction
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/harmonicGeometry.test.ts`
Expected: PASS, all cases including the earlier Task 1 block.

- [ ] **Step 5: Build the table in the component**

In `src/three/HarmonicField.tsx`, change the import from `./harmonicGeometry` to:

```ts
import {
  HARMONIC_A,
  HARMONIC_B,
  buildHarmonicField,
  buildMorphFitTable,
  sampleMorphFit,
} from './harmonicGeometry'
```

Add the table memo immediately after the existing `data` memo:

```ts
  // Built once. See buildMorphFitTable: this is what keeps the form at a
  // constant on-screen size while its shape reorganises.
  const fitTable = useMemo(() => buildMorphFitTable(HARMONIC_A, HARMONIC_B), [])
```

And replace the `uScaleWorld` uniform:

```ts
      // Re-read from the fit table every frame, so the form changes shape
      // without changing size.
      uScaleWorld: { value: sampleMorphFit(fitTable, 0) },
```

- [ ] **Step 6: Drive the scale per frame**

Still in `src/three/HarmonicField.tsx`, in the `useFrame` callback's `still` branch, add the scale write next to the morph write so the reduced-motion frame is fitted too:

```ts
    if (still) {
      // A single representative frame: half morphed, so the form is legible
      // rather than sitting at either extreme.
      mat.uniforms.uTime.value = 0
      mat.uniforms.uMorph.value = 0.5
      mat.uniforms.uScaleWorld.value = sampleMorphFit(fitTable, 0.5)
      mat.uniforms.uPointerOn.value = 0
      if (group.current) group.current.rotation.y = 0.5
      return
    }
```

And in the animated branch, immediately after `mat.uniforms.uMorph.value = smoothMorph.current`:

```ts
    mat.uniforms.uMorph.value = smoothMorph.current
    mat.uniforms.uScaleWorld.value = sampleMorphFit(fitTable, smoothMorph.current)
```

- [ ] **Step 7: Check the memo dependencies by hand**

There is no lint script in this project, so this is a read rather than a command.

`useFrame`'s callback is not dependency-tracked, so the per-frame writes need nothing. The `uniforms` memo is: it reads `fitTable` in its initialiser while listing only `[glowColor]` as its dependency. That is correct as written, because `fitTable` comes from a `useMemo` with an empty dependency array and is therefore stable for the life of the component, but confirm both of those are true before moving on. If you would rather be explicit, adding `fitTable` to the `uniforms` dependency array changes nothing at runtime and is also correct.

- [ ] **Step 8: Typecheck, full suite, and build**

Run: `npm run typecheck && npm test && npm run build`
Expected: all three succeed.

- [ ] **Step 9: Commit**

```bash
git add src/three/harmonicGeometry.ts src/three/HarmonicField.tsx src/__tests__/harmonicGeometry.test.ts
git commit -m "fix: hold the About field at constant size through its morph"
```

---

### Task 4: Remove the background box

**Files:**
- Modify: `src/components/sections/About.tsx:68-71`

**Interfaces:**
- Consumes: nothing. This removes one Tailwind class.

- [ ] **Step 1: Drop the class**

In `src/components/sections/About.tsx`, replace:

```tsx
        <Stage
          progress={progress}
          className="aspect-square w-full max-w-xl justify-self-center bg-bg-soft"
        />
```

with:

```tsx
        {/* No bg-bg-soft. The field is points on a page, not a photograph on a
            backdrop: a soft-cloud rectangle put a hard edge around it and drew
            a box where the design wants none. The Hero cutout dropped the same
            class for a different reason, and this section now matches it. */}
        <Stage
          progress={progress}
          className="aspect-square w-full max-w-xl justify-self-center"
        />
```

- [ ] **Step 2: Confirm the token has no component consumers left**

Run: `grep -rn "bg-bg-soft" src/`
Expected: one hit only, the explanatory comment in `src/components/sections/Hero.tsx`. No `className` should still apply the class. `src/dev/bake.html` also mentions it in prose and is left alone deliberately: it documents how to restore a staged backdrop if future footage needs keying.

- [ ] **Step 3: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/About.tsx
git commit -m "style: drop the soft-cloud box behind the About field"
```

---

### Task 5: Visual verification and documentation

**Files:**
- Modify: `CLAUDE.md` (the "The About field" section)
- None other. This task is verification plus the record of it. Fix forward if a check fails.

**Interfaces:**
- Consumes: everything from Tasks 1 to 4.

- [ ] **Step 1: Start the dev server**

If you are running inside a harness with a preview tool, start the server through it using the `portfolio-dev` configuration in `.claude/launch.json` rather than launching it from a shell. Otherwise run `npm run dev`.

Open `http://localhost:5173` at a viewport of at least 1024px wide and scroll to About. The field does not render below 768px, so a narrow window will show you nothing and that is correct behaviour, not a failure.

- [ ] **Step 2: Confirm no frame contact across the morph**

The per-morph fit keeps full 64x64 angular resolution, so it should be at least as tight as the single fit it replaces. The failure mode if it is not is the form touching the canvas edge.

Scroll slowly through the whole About pin and confirm the point cloud never touches the top, bottom, left or right edge of its canvas at any scroll position. Pay attention to the middle of the scroll, not just the ends: the midpoint of a morph can be wider than either endpoint, which is the reason the original fit sampled across the range at all.

- [ ] **Step 3: Confirm the four rendering faults are gone**

At rest, check each:

- No coloured specks anywhere in the field. It is one ink colour plus the cursor highlight.
- The far side of the form is visibly lighter than the near side, so it reads as a volume rather than a flat speckle.
- No dark knot at the centre of the form at any scroll position.
- The dots read as a surface rather than as grit.

- [ ] **Step 4: Confirm the form holds its size**

Scroll from the start of the About pin to the end and confirm the object changes shape without noticeably growing or shrinking. This is what Task 3 exists for, and it is the check that a subtly wrong table would fail.

- [ ] **Step 5: Confirm the background is gone**

The field must sit on the page's white with no visible rectangle behind it. In the browser console:

```js
getComputedStyle(document.querySelector('#about canvas').parentElement).backgroundColor
```

Expected: `rgba(0, 0, 0, 0)`.

- [ ] **Step 6: Confirm the hover glow still works**

Move the cursor across the field and confirm a warm highlight follows it, with the individual points still visible through it, and no hole or hard-edged disc.

- [ ] **Step 7: Confirm reduced motion and the mobile hide**

With the OS "reduce motion" setting on, reload and scroll to About: the field renders one still frame, correctly fitted, with no rotation, breathing or morphing.

Then resize below 768px and confirm in the console:

```js
document.querySelectorAll('#about canvas').length
```

Expected: `0`.

- [ ] **Step 8: Run the full suite, typecheck and production build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass, including the two new test files.

- [ ] **Step 9: Update CLAUDE.md**

In `CLAUDE.md`, in the "The About field" section, replace this paragraph:

```
**The harmonic form is solved per frame, never stored.** Each point knows only its angle on a Fibonacci-lattice sphere; position comes from `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`, and scroll interpolates the eight exponents between two sets. **Exponents near 1 make it a fuzzy ball** (the first attempt filled the entire frame as noise); high exponents are what carve distinct lobes. `harmonicFitScale()` samples across the morph rather than just the endpoints, because the midpoint can be wider than either end. Verified: zero frame-edge contact at morph 0, 0.5 and 1.
```

with:

```
**The harmonic form is solved per frame, never stored.** Each point knows only its angle on a Fibonacci-lattice sphere; position comes from `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`, and scroll interpolates the eight numbers between two sets. A is a sphere, B is a four-pointed star, so the scroll reads as a system resolving out of a ball into structure.

**Exponents are the load-bearing part, and there is a window.** Near 1 the four terms sum into a fuzzy ball that fills the frame as noise. At 6, which an earlier revision used almost throughout, the lobes are carved so hard that equal-area sphere sampling stretches them into thin radiating sprays: the field read as a firework, and that was most of why it looked amateurish. 2 to 4 keeps the surface closed and legible. **If this field ever looks like a splatter again, look at the exponents before anything else.**

**Scale is fitted per morph, from a precomputed table.** `buildMorphFitTable` builds 17 fit scales at mount and `sampleMorphFit` interpolates between them each frame. One scale spanning the whole morph renders the smaller-radius endpoint smaller, so the form swells as it reorganises rather than just changing shape. Fitting per frame is not available: one fit costs 2.37ms against a 16.7ms budget. Use `harmonicFitScaleAt`, not `harmonicFitScale`, for a single shape: the latter walks five morph steps and, handed one set twice, scans the same shape six times. Verified: zero frame-edge contact across the morph, and both endpoints fit to the same on-screen size.

**Every point is one colour, and that is deliberate.** An earlier revision recoloured 14% of points to the accent so the highlight would "read as sparkle through the volume". That worked on a near-black page. On white, randomly placed coloured specks read as dirt, and this is the single change that most made the field look unfinished. Emphasis is the cursor's job. `src/__tests__/harmonicGeometry.test.ts` guards it.

**Depth is cued by alpha, not by perspective.** The camera sits at z 7.3 and the form is fitted to radius 1.55, so perspective varies point size by roughly 25% across the depth range, which reads as nothing. A `vDepth` varying fades the far side toward the page instead, and it is the difference between 42,000 dots as a flat speckle field and as a volume.

**Points on the radius floor are faded out.** `harmonicRadius` floors at 0.12, and every angle where all four terms cancel lands there, piling a dark knot at the origin. `smoothstep(0.13, 0.45, r)` on `vTone` removes it. They carry no shape information, so nothing is lost.

**The field sits on the page, with no backdrop.** `About.tsx` deliberately carries no `bg-bg-soft`: a soft-cloud rectangle puts a hard edge around a form that is supposed to be points in space. `--color-bg-soft` currently has no consumer in `src/` at all.
```

- [ ] **Step 10: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record why the About field's harmonic values are what they are"
```

---

## Notes for the implementer

- Every number in this plan was chosen by rendering the real modules offscreen and comparing candidates, not by reasoning about what should look good. If you change one, change it the same way: render it and look.
- The shader edits are string edits to template literals. There is no compiler between you and a runtime link error, which is why Task 2 has structural tests. Run them.
- Tasks 1 through 4 each leave the tree typechecking and testing green. If a task leaves it red, something in that task was missed rather than deferred to the next one.
