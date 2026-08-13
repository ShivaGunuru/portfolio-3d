/**
 * Vertex shader for the head point cloud.
 *
 * Everything the reference implementation did in a per-frame JavaScript loop
 * over 26,000 points happens here instead, once per point, in parallel:
 *
 *   - breathing        a slow per-point radial pulse
 *   - scatter          near phase 1, the head dissolves into a wave field
 *   - decay            from phase 2 on, points rise and drift apart
 *   - pointer response points near the cursor push outward and brighten
 *
 * The pointer test is done in normalised device coordinates rather than world
 * space. That means it keeps working regardless of how the group is rotated by
 * the scroll phase, and it matches what the user actually sees on screen: the
 * cursor affects points that look close to it, not points that happen to be
 * near it in 3D but are on the far side of the head.
 */
export const headVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform vec2  uPointer;    // cursor in NDC, -1..1
  uniform float uPointerOn;  // 0 when there is no cursor (touch, or left window)
  uniform float uAspect;
  uniform float uSize;
  uniform float uScale;      // drawing buffer height * 0.5, for size attenuation
  uniform float uRadius;     // pointer influence radius, in NDC units
  uniform float uPush;       // how far affected points travel, in view units

  attribute vec3 aRandom;
  attribute vec3 aColor;

  varying vec3  vColor;
  varying float vGlow;

  void main() {
    float phase   = uPhase;
    float scatter = max(0.0, 1.0 - abs(phase - 1.0));
    float decay   = clamp(phase - 2.0, 0.0, 1.0);

    // --- morph -------------------------------------------------------------
    float seed = aRandom.y * 6.2831853;
    vec3 pos = position * (1.0 + 0.012 * sin(uTime * 1.6 + seed));

    if (scatter > 0.001) {
      float wx = position.x * 2.6 + aRandom.x * 0.5;
      float wy = sin(wx * 2.2 + uTime * 1.4) * 0.34 * (0.4 + aRandom.y);
      float wz = position.z * 0.25;
      pos = mix(pos, vec3(wx, wy, wz), scatter);
    }

    if (decay > 0.001) {
      pos.x += decay * aRandom.x * 1.6;
      pos.y += decay * (0.9 + aRandom.y * 2.4);
      pos.z += decay * aRandom.z * 0.9;
    }

    // --- pointer influence --------------------------------------------------
    vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
    vec4 clipPos = projectionMatrix * viewPos;

    // Guard the perspective divide: points behind the eye have w <= 0.
    float w = max(abs(clipPos.w), 0.0001);
    vec2 ndc = clipPos.xy / w;

    // Correct for aspect so the influence region is a circle on screen, not an
    // ellipse stretched by the viewport.
    vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
    float dist = length(delta);

    float influence = smoothstep(uRadius, 0.0, dist) * uPointerOn;
    // Points behind the camera must never react.
    influence *= step(0.0, clipPos.w);

    if (influence > 0.001) {
      vec2 dir = dist > 0.0001 ? normalize(delta) : vec2(0.0, 1.0);
      viewPos.xy += dir * influence * uPush;
      viewPos.z  += influence * uPush * 0.35; // lift toward the camera
    }

    vGlow  = influence;
    vColor = aColor;

    gl_Position = projectionMatrix * viewPos;

    // Matches three's own point size attenuation, with a swell near the cursor.
    float size = uSize * (1.0 + influence * 2.4) * (1.0 - decay * 0.35);
    gl_PointSize = size * (uScale / max(-viewPos.z, 0.0001));
  }
`

/**
 * Fragment shader.
 *
 * Each point is drawn as a soft radial falloff rather than a hard square, which
 * is what makes an additively blended cloud read as glowing: overlapping points
 * accumulate brightness in the middle and fade at the edges. Near the cursor the
 * colour is pushed toward the glow tint and over-driven past 1.0, so additive
 * blending blows it out into a highlight without a separate bloom pass.
 */
export const headFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform vec3  uGlowColor;

  varying vec3  vColor;
  varying float vGlow;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    float falloff = smoothstep(0.5, 0.0, dist);

    vec3 color = mix(vColor, uGlowColor, vGlow * 0.75);
    color *= 1.0 + vGlow * 2.0;

    gl_FragColor = vec4(color, falloff * uOpacity);

    #include <colorspace_fragment>
  }
`
