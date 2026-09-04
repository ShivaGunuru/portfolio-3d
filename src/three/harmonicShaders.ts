/**
 * Vertex shader for the About section's harmonic field.
 *
 * Nothing about the form is stored. Each point knows only its own angle on a
 * sphere and a random seed; its position is solved every frame from the
 * spherical-harmonic equation with the current morph, so the entire shape is
 * eight numbers being interpolated. Scroll drives that interpolation, which is
 * why it reads as a system reorganising itself rather than as playback.
 *
 * The pointer test works in normalised device coordinates, matching the
 * portrait shader: it survives the group's rotation and responds to what is
 * visually near the cursor rather than what is near in 3D.
 */
export const harmonicVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;      // 0..1, scroll driven
  uniform vec4  uHarmA0;     // m0..m3 of the first set
  uniform vec4  uHarmA1;     // m4..m7 of the first set
  uniform vec4  uHarmB0;
  uniform vec4  uHarmB1;
  uniform float uScaleWorld; // fits the form to the frame
  uniform vec2  uPointer;
  uniform float uPointerOn;
  uniform float uAspect;
  uniform float uSize;
  uniform float uScale;
  uniform float uRadius;
  uniform float uPush;

  attribute vec3 aSeed;   // theta, phi, random 0..1
  attribute vec3 aColor;
  attribute vec3 aRandom;

  varying vec3  vColor;
  varying float vGlow;
  varying float vTone;
  varying float vDepth;

  /**
   * Classic spherical harmonic radius.
   *
   * abs() guards the bases: a negative base with a fractional exponent is
   * undefined in GLSL and shows up as scattered dead points. The small floor
   * on the result keeps the surface from collapsing exactly onto the origin
   * where every term cancels.
   */
  float harmonicRadius(float theta, float phi, vec4 h0, vec4 h1) {
    float r = 0.0;
    r += pow(abs(sin(h0.x * phi)),   max(h0.y, 0.05));
    r += pow(abs(cos(h0.z * phi)),   max(h0.w, 0.05));
    r += pow(abs(sin(h1.x * theta)), max(h1.y, 0.05));
    r += pow(abs(cos(h1.z * theta)), max(h1.w, 0.05));
    return max(r, 0.12);
  }

  void main() {
    float theta = aSeed.x;
    float phi   = aSeed.y;

    // Ease the morph so the form settles rather than arriving at constant speed.
    float t = uMorph * uMorph * (3.0 - 2.0 * uMorph);
    vec4 h0 = mix(uHarmA0, uHarmB0, t);
    vec4 h1 = mix(uHarmA1, uHarmB1, t);

    // A slow drift through theta means the surface is never quite static even
    // when the page is not being scrolled.
    float drift = uTime * 0.055;
    float r = harmonicRadius(theta + drift, phi, h0, h1);

    vec3 pos = vec3(
      r * sin(phi) * cos(theta),
      r * cos(phi),
      r * sin(phi) * sin(theta)
    );

    // Per-point breathing along its own radius, offset by seed so the surface
    // shimmers instead of pulsing as one body.
    float breath = 1.0 + 0.035 * sin(uTime * 1.1 + aSeed.z * 6.2831853);
    pos *= uScaleWorld * breath;

    // --- pointer influence, in NDC ------------------------------------------
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
    //
    // The normalisation below runs 5.2 to 9.4, deliberately wider than the
    // 5.75-8.85 the form actually occupies, so neither end of the real range
    // saturates against the 0/1 clamp.
    vDepth = clamp((-viewPos.z - 5.2) / 4.2, 0.0, 1.0);

    gl_Position = projectionMatrix * viewPos;

    // The near-cursor size boost is small on purpose. At the 2.4 it carried
    // under additive blending, hovered points grew enough to overlap solidly,
    // and source-alpha blending turns overlap into flat coverage rather than
    // into brighter light: the highlight rendered as a hard-edged disc with no
    // visible points in it. Measured against the alternatives, 0.8 is the point
    // where the highlight still reads as an emphasised part of the cloud.
    float size = uSize * (0.7 + 0.6 * shade) * (1.0 + influence * 0.8);
    gl_PointSize = size * (uScale / max(-viewPos.z, 0.0001));
  }
`

/**
 * Fragment shader.
 *
 * A soft radial falloff so overlapping points accumulate into a cloud rather
 * than tiling into visible squares, with the colour pushed toward the glow
 * tint near the cursor.
 *
 * The falloff is the only part of this that survives unchanged from the
 * additive-blending era. See `HarmonicField.tsx` for why the material now
 * blends normally; the consequence here is that near-cursor emphasis has to be
 * carried by alpha rather than by over-driving the colour past 1.0, which used
 * to accumulate as light and now merely clips to white.
 */
export const harmonicFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform vec3  uGlowColor;

  varying vec3  vColor;
  varying float vGlow;
  varying float vTone;
  varying float vDepth;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    if (dist > 0.5) discard;

    float falloff = smoothstep(0.5, 0.0, dist);

    // Tint the whole way to the glow colour under the cursor, since tint is now
    // the only thing carrying the highlight's hue.
    vec3 color = mix(vColor, uGlowColor, vGlow * 0.9);

    // The far side fades toward the page. This is the single largest gain in
    // this pass: it is what turns a flat speckle field into a volume.
    //
    // The trailing (1.0 + vGlow * 0.35) carries near-cursor emphasis as more
    // presence (higher alpha), not more brightness: under source-alpha
    // blending an over-driven colour just clips to white instead of reading
    // as glow.
    float alpha = falloff * uOpacity * vTone * mix(1.0, 0.2, vDepth) * (1.0 + vGlow * 0.35);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));

    #include <colorspace_fragment>
  }
`
