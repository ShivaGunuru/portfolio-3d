/**
 * Vertex shader for the Hero video-particle field.
 *
 * There is no per-point morph logic here, unlike the portrait or harmonic
 * shaders. Position is completely fixed per point; the only thing that
 * changes frame to frame is each point's tone (brightness, and through it,
 * size), read from a texture baked offline by `src/dev/bakeHeroVideo.ts`.
 *
 * The texture is laid out as `frameCount` stacked blocks of `rowsPerFrame`
 * rows each, `textureWidth` wide. Point `i` always reads column `i % width`,
 * row `floor(i / width)` within whichever frame block is being sampled — that
 * per-point (col, row) pair is fixed too, precomputed at bake time and passed
 * in as attributes, since it depends only on the point's index, never on the
 * frame. Two texture reads (the current and next frame) are mixed by the
 * fractional part of the scroll-driven frame position, which is what makes
 * scrolling interpolate smoothly between baked frames instead of jumping.
 *
 * Deliberately absent: any idle rotation or drift. Every other particle
 * system on this site turns or sways on its own; this one does not, because
 * the whole point of it is that the subject's motion is locked to the scroll
 * gesture. Adding independent motion on top would blur that, not enhance it.
 */
export const videoFieldVertexShader = /* glsl */ `
  uniform sampler2D uToneTex;
  uniform float uFrameCount;
  uniform float uRowsPerFrame;
  uniform float uTexWidth;
  uniform float uTexHeight;
  uniform float uProgress;   // 0..1, scroll-driven
  uniform float uTime;
  uniform vec2  uPointer;
  uniform float uPointerOn;
  uniform float uAspect;
  uniform float uSize;
  uniform float uScale;
  uniform float uRadius;
  uniform float uPush;

  attribute vec3  aColor;
  attribute vec3  aRandom;
  attribute float aToneCol;
  attribute float aToneRow;

  varying vec3  vColor;
  varying float vGlow;
  varying float vTone;

  void main() {
    // --- frame lookup, two adjacent frames blended by fractional progress ---
    float frameFloat = uProgress * (uFrameCount - 1.0);
    float frame0 = floor(frameFloat);
    float frame1 = min(frame0 + 1.0, uFrameCount - 1.0);
    float frac   = frameFloat - frame0;

    float texRow0 = frame0 * uRowsPerFrame + aToneRow;
    float texRow1 = frame1 * uRowsPerFrame + aToneRow;

    // +0.5 samples texel centres, not their edges.
    vec2 uv0 = vec2((aToneCol + 0.5) / uTexWidth, (texRow0 + 0.5) / uTexHeight);
    vec2 uv1 = vec2((aToneCol + 0.5) / uTexWidth, (texRow1 + 0.5) / uTexHeight);

    float tone0 = texture2D(uToneTex, uv0).r;
    float tone1 = texture2D(uToneTex, uv1).r;
    float tone  = mix(tone0, tone1, frac);

    // --- position: fixed, with only a per-point breathing pulse -----------
    float seed = aRandom.y * 6.2831853;
    vec3 pos = position * (1.0 + 0.010 * sin(uTime * 1.4 + seed));

    // --- pointer influence, in NDC, same as every other stage --------------
    vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
    vec4 clipPos = projectionMatrix * viewPos;
    float w = max(abs(clipPos.w), 0.0001);
    vec2 ndc = clipPos.xy / w;

    vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
    float dist = length(delta);
    float influence = smoothstep(uRadius, 0.0, dist) * uPointerOn;
    influence *= step(0.0, clipPos.w);

    if (influence > 0.001) {
      vec2 dir = dist > 0.0001 ? normalize(delta) : vec2(0.0, 1.0);
      viewPos.xy += dir * influence * uPush;
      viewPos.z  += influence * uPush * 0.35;
    }

    // Same floor-and-curve treatment the portrait needed: a hard floor keeps
    // background-classified points (tone 0) fully invisible, and midtones are
    // pushed up rather than let the shadow end fall away to nothing.
    vTone = tone > 0.001 ? 0.34 + 0.66 * pow(tone, 0.85) : 0.0;
    vGlow = influence;
    vColor = aColor;

    gl_Position = projectionMatrix * viewPos;

    float size = uSize * (0.7 + 0.55 * tone) * (1.0 + influence * 2.4);
    gl_PointSize = size * (uScale / max(-viewPos.z, 0.0001));
  }
`

/** Same treatment as every other particle stage: soft disc, additive glow. */
export const videoFieldFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform vec3  uGlowColor;

  varying vec3  vColor;
  varying float vGlow;
  varying float vTone;

  void main() {
    if (vTone <= 0.0) discard;

    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    float falloff = smoothstep(0.5, 0.0, dist);

    vec3 color = mix(vColor, uGlowColor, vGlow * 0.75);
    color *= 1.0 + vGlow * 2.0;

    gl_FragColor = vec4(color, falloff * uOpacity * vTone);

    #include <colorspace_fragment>
  }
`
