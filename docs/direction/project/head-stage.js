(function () {
  let _p = null;
  const three = () => (_p || (_p = import('https://esm.sh/three@0.160.0')));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Proxy head volume. A real scan mesh drops in here; this is a parametric stand-in.
  function surface(u, v) {
    const sv = Math.sin(v), cv = Math.cos(v);
    let r = 1;
    if (cv < 0) r *= 1 - 0.42 * Math.pow(-cv, 1.7);
    if (cv > 0.75) r *= 1 - 0.12 * (cv - 0.75);
    const y = cv * 1.24;
    let x = sv * Math.cos(u) * 0.90 * r;
    let z = sv * Math.sin(u) * 1.00 * r;
    let au = u - Math.PI / 2;
    while (au > Math.PI) au -= 2 * Math.PI;
    while (au < -Math.PI) au += 2 * Math.PI;
    z += 0.22 * Math.exp(-(au * au) / 0.10) * Math.exp(-((y - 0.02) * (y - 0.02)) / 0.02);
    z += 0.14 * Math.exp(-(au * au) / 0.60) * Math.exp(-((y + 0.72) * (y + 0.72)) / 0.05);
    z += 0.05 * Math.exp(-(au * au) / 0.35) * Math.exp(-((y - 0.42) * (y - 0.42)) / 0.02);
    return [x, y, z];
  }

  class HeadStage extends HTMLElement {
    static get observedAttributes() { return ['phase', 'treatment', 'fg', 'accent']; }
    constructor() {
      super();
      this._phase = 0; this._p = 0; this._t = 0; this._vis = true; this._ready = false;
    }
    set phase(v) { this._phase = Number(v) || 0; }
    get phase() { return this._phase; }
    attributeChangedCallback(n, o, v) { if (n === 'phase') this._phase = Number(v) || 0; }

    connectedCallback() {
      if (Object.prototype.hasOwnProperty.call(this, 'phase')) {
        const v = this.phase; delete this.phase; this.phase = v;
      }
      if (this._boot) return; this._boot = true;
      this.style.display = 'block';
      const cv = this._canvas = document.createElement('canvas');
      cv.style.cssText = 'width:100%;height:100%;display:block';
      this.appendChild(cv);
      this._io = new IntersectionObserver((e) => { this._vis = e[0].isIntersecting; }, { threshold: 0 });
      this._io.observe(this);
      three().then((T) => this.init(T)).catch((e) => console.error('head-stage', e));
    }
    disconnectedCallback() { this._dead = true; if (this._io) this._io.disconnect(); }

    init(THREE) {
      const treatment = this.getAttribute('treatment') || 'points';
      const fg = new THREE.Color(this.getAttribute('fg') || '#ffffff');
      const accent = new THREE.Color(this.getAttribute('accent') || '#ffffff');
      const renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      cam.position.set(0, treatment === 'facets' ? -0.15 : 0.05, treatment === 'facets' ? 8.4 : treatment === 'contour' ? 8.9 : 7.3);
      const root = new THREE.Group(); scene.add(root);
      root.position.x = parseFloat(this.getAttribute('offset-x') || '0.55');
      this._three = { THREE, renderer, scene, cam, root };

      if (treatment === 'contour') this.buildContour(THREE, root, fg, accent);
      if (treatment === 'points') this.buildPoints(THREE, root, fg, accent);
      if (treatment === 'facets') this.buildFacets(THREE, scene, root, fg, accent);

      const resize = () => {
        const w = this.clientWidth || 400, h = this.clientHeight || 400;
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix();
      };
      resize();
      new ResizeObserver(resize).observe(this);
      this._ready = true;
      const loop = () => {
        if (this._dead) return;
        requestAnimationFrame(loop);
        if (!this._vis) return;
        this._t += 0.016;
        this._p = lerp(this._p, this._phase, 0.055);
        this.tick(treatment);
        renderer.render(scene, cam);
      };
      loop();
    }

    // ---- contour: horizontal cross-sections only
    buildContour(THREE, root, fg, accent) {
      const N = 96, S = 74;
      const lines = [];
      for (let i = 0; i < S; i++) {
        const yy = -1.16 + (2.42 * i) / (S - 1);
        const v = Math.acos(Math.max(-1, Math.min(1, yy / 1.24)));
        const pos = new Float32Array((N + 1) * 3);
        for (let j = 0; j <= N; j++) {
          const p = surface((j / N) * Math.PI * 2, v);
          pos[j * 3] = p[0]; pos[j * 3 + 1] = p[1]; pos[j * 3 + 2] = p[2];
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const key = i % 12 === 0;
        const m = new THREE.LineBasicMaterial({
          color: key ? accent : fg, transparent: true, opacity: key ? 0.95 : 0.42
        });
        const l = new THREE.Line(g, m);
        l.userData = { y0: yy, i, key };
        root.add(l); lines.push(l);
      }
      this._lines = lines;
    }

    // ---- points: volumetric scatter
    buildPoints(THREE, root, fg, accent) {
      const small = innerWidth < 760 || matchMedia('(prefers-reduced-motion: reduce)').matches;
      const N = small ? 3500 : 26000;
      const base = new Float32Array(N * 3), col = new Float32Array(N * 3), rnd = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.acos(1 - 2 * Math.random());
        const p = surface(u, v);
        const shrink = 1 - Math.random() * Math.random() * 0.22;
        base[i * 3] = p[0] * shrink; base[i * 3 + 1] = p[1] * shrink; base[i * 3 + 2] = p[2] * shrink;
        const c = Math.random() < 0.12 ? accent : fg;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        rnd[i * 3] = Math.random() * 2 - 1; rnd[i * 3 + 1] = Math.random(); rnd[i * 3 + 2] = Math.random() * 2 - 1;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({
        size: small ? 0.026 : 0.016, sizeAttenuation: true, vertexColors: true,
        transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
      });
      this._pts = new THREE.Points(g, m);
      this._base = base; this._rnd = rnd; this._N = N;
      root.add(this._pts);
    }

    // ---- facets: flat-shaded cast with a hard raking light
    buildFacets(THREE, scene, root, fg, accent) {
      const g = new THREE.IcosahedronGeometry(1, 24);
      const pos = g.attributes.position;
      const v3 = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i).normalize();
        const u = Math.atan2(v3.z, v3.x);
        const vv = Math.acos(Math.max(-1, Math.min(1, v3.y)));
        const p = surface(u < 0 ? u + Math.PI * 2 : u, vv);
        pos.setXYZ(i, p[0], p[1], p[2]);
      }
      const flat = g.toNonIndexed(); flat.computeVertexNormals();
      const mesh = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({
        color: fg, roughness: 0.98, metalness: 0.0, flatShading: true
      }));
      mesh.castShadow = true; root.add(mesh);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.72, 0.5, 48),
        new THREE.MeshStandardMaterial({ color: fg, roughness: 1, flatShading: true })
      );
      plinth.position.y = -1.5; plinth.castShadow = true; root.add(plinth);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.ShadowMaterial({ opacity: 0.42 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -1.75; floor.receiveShadow = true; scene.add(floor);

      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(-4, 2.6, 2.4); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -4; key.shadow.camera.right = 4;
      key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
      scene.add(key);
      const fill = new THREE.HemisphereLight(accent.getHex(), 0x2b2620, 0.7);
      scene.add(fill);
      this._renderShadow = true;
      this._three.renderer.shadowMap.enabled = true;
      this._three.renderer.shadowMap.type = 2;
      this._key = key; this._fill = fill; this._mesh = mesh;
    }

    tick(treatment) {
      const { root } = this._three;
      const p = this._p, t = this._t;
      const yaw = (a) => { root.rotation.y = a; };

      if (treatment === 'contour') {
        const sep = 1 + Math.min(p, 1) * 0.55;
        const shear = Math.max(0, Math.min(p - 1, 1));
        const collapse = Math.max(0, Math.min(p - 2, 1));
        yaw(lerp(Math.sin(t * 0.18) * 0.5, -Math.PI / 2, Math.max(0, Math.min(p - 1, 1)) * (1 - collapse) + collapse * 0));
        root.rotation.y = lerp(Math.sin(t * 0.18) * 0.5, -Math.PI / 2, Math.max(0, Math.min(p - 1, 1)));
        for (const l of this._lines) {
          const y0 = l.userData.y0;
          l.position.y = y0 * (sep - 1) * (1 - collapse) - y0 * collapse * 1.0;
          l.position.x = shear * 0.30 * Math.sin(y0 * 2.1 + 0.6) * (1 - collapse);
          l.scale.setScalar(1 - collapse * 0.02);
          l.material.opacity = (l.userData.key ? 0.95 : 0.42) * (1 - collapse * 0.55);
        }
      }

      if (treatment === 'points') {
        const g = this._pts.geometry.attributes.position;
        const arr = g.array, base = this._base, rnd = this._rnd, N = this._N;
        const scatter = Math.max(0, 1 - Math.abs(p - 1));
        const decay = Math.max(0, Math.min(p - 2, 1));
        root.rotation.y = lerp(Math.sin(t * 0.16) * 0.55, -Math.PI / 2, Math.max(0, Math.min(p - 1.0, 1)) * (1 - decay));
        for (let i = 0; i < N; i++) {
          const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
          const br = 1 + 0.012 * Math.sin(t * 1.6 + i * 0.0007);
          let x = bx * br, y = by * br, z = bz * br;
          if (scatter > 0.001) {
            const wx = bx * 2.6 + rnd[i * 3] * 0.5;
            const wy = Math.sin(wx * 2.2 + t * 1.4) * 0.34 * (0.4 + rnd[i * 3 + 1]);
            const wz = bz * 0.25;
            x = lerp(x, wx, scatter); y = lerp(y, wy, scatter); z = lerp(z, wz, scatter);
          }
          if (decay > 0.001) {
            y += decay * (0.9 + rnd[i * 3 + 1] * 2.4);
            x += decay * rnd[i * 3] * 1.6;
            z += decay * rnd[i * 3 + 2] * 0.9;
          }
          arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
        }
        g.needsUpdate = true;
        this._pts.material.opacity = 0.85 * (1 - decay * 0.72);
        this._pts.material.size = (this._N < 5000 ? 0.026 : 0.016) * (1 - decay * 0.35);
      }

      if (treatment === 'facets') {
        const sweep = Math.max(0, Math.min(p, 1));
        const profile = Math.max(0, Math.min(p - 1, 1));
        const cut = Math.max(0, Math.min(p - 2, 1));
        root.rotation.y = lerp(-0.55 + Math.sin(t * 0.14) * 0.12, -Math.PI / 2, profile);
        const ang = lerp(-1.0, 0.9, sweep);
        const hgt = lerp(2.6, 1.0, profile);
        this._key.position.set(Math.sin(ang) * 4.4, hgt, Math.cos(ang) * 3.2);
        this._key.intensity = lerp(2.6, 0.12, cut);
        this._fill.intensity = lerp(0.7, 0.32, cut);
      }
    }
  }
  if (!customElements.get('head-stage')) customElements.define('head-stage', HeadStage);
})();
