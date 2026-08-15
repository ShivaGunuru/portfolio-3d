/**
 * Vertex shader for a section-scoped head point cloud.
 *
 * All per-point motion happens here rather than in a per-frame JavaScript
 * loop, so it stays cheap regardless of point count:
 *
 *   - breathing        a slow per-point radial pulse
 *   - scatter          uScatter interpolates between the formed head (0) and
 *                       a dissolved wave field (1); the caller decides what
 *                       that means for a given section
 *   - pointer response points near the cursor push outward and brighten
 *
 * The pointer test is done in normalised device coordinates rather than world
 * space. That means it keeps working regardless of how the group is rotated
 * (the "turn to profile" stage rotates the whole group), and it matches what
 * the user actually sees on screen: the cursor affects points that look close
 * to it, not points that happen to be near it in 3D but on the far side of
 * the head.
 */
export const headVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScatter;    // 0 = formed head, 1 = fully scattered wave field
  uniform vec2  uPointer;    // cursor in NDC, -1..1
  uniform float uPointerOn;  // 0 when there is no cursor (touch, or left window)
  uniform float uAspect;
  uniform float uSize;
  uniform float uScale;      // drawing buffer height * 0.5, for size attenuation
  uniform float uRadius;     // pointer influence radius, in NDC units
  uniform float uPush;       // how far affected points travel, in view units

  attribute vec3  aRandom;
  attribute vec3  aColor;
  attribute float aLuma;   // 0..1 tone, normalised across the subject

  varying vec3  vColor;
  varying float vGlow;
  varying float vTone;

  void main() {
    // --- morph -------------------------------------------------------------
    float seed = aRandom.y * 6.2831853;
    vec3 pos = position * (1.0 + 0.012 * sin(uTime * 1.6 + seed));

    if (uScatter > 0.001) {
      float wx = position.x * 2.6 + aRandom.x * 0.5;
      float wy = sin(wx * 2.2 + uTime * 1.4) * 0.34 * (0.4 + aRandom.y);
      float wz = position.z * 0.25;
      pos = mix(pos, vec3(wx, wy, wz), uScatter);
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

    // Tone drives both size and opacity, which is what lets a sampled
    // photograph read as a face. With every point the same size and weight the
    // cloud is an evenly lit blob no matter how accurate its outline is.
    //
    // The floor is high and the curve is gentler than linear: shadows still
    // need to carry the form rather than drop out, and a photograph's midtones
    // are where most of a face lives, so pushing them up is what actually
    // brightens it. Contrast comes from the range above the floor, not from
    // letting the darks fall to nothing.
    vTone = 0.38 + 0.62 * pow(aLuma, 0.80);

    gl_Position = projectionMatrix * viewPos;

    // Matches three's own point size attenuation, with a swell near the cursor.
    float size = uSize * (0.78 + 0.55 * aLuma) * (1.0 + influence * 2.4);
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
  varying float vTone;

  void main() {
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
