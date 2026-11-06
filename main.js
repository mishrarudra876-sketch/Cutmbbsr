import * as THREE from 'three';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = t => t * t * (3 - 2 * t);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 760px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);

/* ---------- UI (works even without WebGL) ---------- */
const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
burger.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
links.addEventListener('click', e => { if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });

addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 24), { passive: true });
const screens = $$('.screen');
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) {
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    $$('[data-text]', e.target).forEach(el => el.textContent = el.dataset.text);
  }
}), { threshold: 0.25 });
screens.forEach(s => io.observe(s));

function countUp(el) {
  if (el.dataset.done) return; el.dataset.done = 1;
  const end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
  const step = t => {
    const p = clamp((t - t0) / 1400);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + (p === 1 ? suf : '');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 3D tilt on cards (touch + mouse)
$$('.tilt').forEach(c => {
  const move = e => {
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(6px)`;
  };
  c.addEventListener('pointermove', move);
  ['pointerleave', 'pointerup', 'pointercancel'].forEach(ev => c.addEventListener(ev, () => c.style.transform = ''));
});

const CAMPUSES = [
  { n: 'Bhubaneswar',    lat: 20.16, lon: 85.70, d: 'The flagship campus at Ramachandrapur, Jatni — the heart of CUTM.' },
  { n: 'Paralakhemundi', lat: 18.78, lon: 84.09, d: 'The original home of CUTM in Gajapati district, Odisha.' },
  { n: 'Rayagada',       lat: 19.17, lon: 83.42, d: 'Bringing skill-based higher education to southern Odisha.' },
  { n: 'Balangir',       lat: 20.71, lon: 83.49, d: 'Serving western Odisha with industry-linked programmes.' },
  { n: 'Balasore',       lat: 21.49, lon: 86.93, d: 'Coastal northern Odisha campus for technology and management.' },
  { n: 'Vizianagaram',   lat: 18.11, lon: 83.40, d: 'CUTM’s campus in north coastal Andhra Pradesh.' },
  { n: 'Visakhapatnam',  lat: 17.69, lon: 83.22, d: 'A coastal campus in the port city of Andhra Pradesh.' }
];
let focus = 0;
const chips = $$('.chip');
chips.forEach(ch => ch.addEventListener('click', () => {
  focus = +ch.dataset.i;
  chips.forEach(c => c.classList.toggle('active', c === ch));
  $('#cName').textContent = CAMPUSES[focus].n;
  $('#cDesc').textContent = CAMPUSES[focus].d;
}));

const loader = $('#loader');
const hideLoader = () => loader.classList.add('done');

/* ---------- WebGL ---------- */
function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
if (!hasWebGL()) { hideLoader(); } else { try { initScene(); } catch (e) { console.error(e); hideLoader(); } }

function initScene() {
  const canvas = $('#bg');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
  const maxDpr = isMobile ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxDpr));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050b1f, 0.045);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  scene.add(new THREE.AmbientLight(0x6f8cff, 0.7));
  const key = new THREE.DirectionalLight(0xffa24a, 2.2); key.position.set(4, 3, 5); scene.add(key);
  const rim = new THREE.PointLight(0x3fd0ff, 30, 30); rim.position.set(-5, -2, 4); scene.add(rim);

  /* --- globe --- */
  const R = 2;
  const globe = new THREE.Group();
  scene.add(globe);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a1a52, roughness: 0.55, metalness: 0.3, transparent: true, opacity: 0.92 })
  );
  globe.add(core);

  // dotted shell (fibonacci sphere)
  const N = isMobile ? 2600 : 5200;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
    pos.set([Math.cos(th) * r * R * 1.003, y * R * 1.003, Math.sin(th) * r * R * 1.003], i * 3);
    seed[i] = Math.random();
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dotGeo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dotMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float seed; uniform float uTime; uniform float uPx; varying float vA; varying float vS;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.);
        float tw = .55 + .45*sin(uTime*1.6 + seed*40.);
        vS = seed; vA = tw;
        gl_PointSize = (2.2 + seed*1.6) * uPx * (9. / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA; varying float vS;
      void main(){
        float d = length(gl_PointCoord-.5); if(d>.5) discard;
        vec3 c = mix(vec3(.25,.8,1.), vec3(1.,.55,.15), step(.9,vS));
        gl_FragColor = vec4(c, (1.-d*2.)*vA*.9);
      }`
  });
  globe.add(new THREE.Points(dotGeo, dotMat));

  // lat/long wire + atmosphere
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.005, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x3f7bff, wireframe: true, transparent: true, opacity: 0.12 })
  ));
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.18, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec3 vN; void main(){ float i = pow(.72 - dot(vN, vec3(0.,0.,1.)), 3.); gl_FragColor = vec4(.25,.55,1.,1.)*i*1.4; }`
    })
  );
  scene.add(atmo);

  /* --- campuses: markers, pulses, arcs --- */
  const toVec = (lat, lon, r = R) => {
    const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  };
  const markers = [], pulses = [], travellers = [];
  const hub = toVec(CAMPUSES[0].lat, CAMPUSES[0].lon);
  CAMPUSES.forEach((c, i) => {
    const p = toVec(c.lat, c.lon, R * 1.01);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffa03a : 0x7fe3ff }));
    m.position.copy(p); globe.add(m); markers.push(m);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.075, 40), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xff8a1f : 0x3fd0ff, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(p); ring.lookAt(p.clone().multiplyScalar(2)); globe.add(ring); pulses.push({ ring, off: i * 0.37 });

    if (i > 0) {
      const a = hub.clone(), b = toVec(c.lat, c.lon);
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.12 + a.distanceTo(b) * 0.09));
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
        new THREE.LineBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0.55 }));
      globe.add(line);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      globe.add(dot); travellers.push({ dot, curve, off: i * 0.19 });
    }
  });

  /* --- orbiting discipline shapes --- */
  const ring = new THREE.Group(); scene.add(ring);
  const geos = [
    new THREE.TorusKnotGeometry(0.28, 0.09, 80, 12),
    new THREE.OctahedronGeometry(0.4),
    new THREE.IcosahedronGeometry(0.38, 0),
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.ConeGeometry(0.34, 0.65, 5),
    new THREE.DodecahedronGeometry(0.38)
  ];
  const cols = [0x2f6bff, 0xff8a1f, 0x3fd0ff, 0x7a5cff, 0xff6a3d, 0x3fe0a8];
  const shapes = geos.map((g, i) => {
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.25, metalness: 0.6, emissive: cols[i], emissiveIntensity: 0.25, flatShading: true }));
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    mesh.add(wire);
    const a = (i / geos.length) * Math.PI * 2;
    mesh.userData = { a, r: 3.7 + (i % 2) * 0.5, y: Math.sin(i * 1.7) * 0.9, s: 0.7 + Math.random() * 0.3 };
    ring.add(mesh); return mesh;
  });

  /* --- stars --- */
  const SN = isMobile ? 700 : 1600;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    const r = 12 + Math.random() * 30, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1);
    sp.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.07, color: 0xbcd0ff, transparent: true, opacity: 0.8, sizeAttenuation: true, depthWrite: false }));
  scene.add(stars);

  /* --- scroll keyframes (one per section) --- */
  // z: camera distance, gx/gy: globe offset (desktop), mix: 0 = free spin, 1 = locked on campus, ring: shapes scale, s: globe scale
  const KF = [
    { z: 9.2, gx: 3.3, gy: 0,    mix: 0, ring: 0.0, s: 1.0, dim: 1 },
    { z: 10,  gx: 0,   gy: 0,    mix: 0, ring: 1.0, s: 0.9, dim: 0.4 },
    { z: 5.6, gx: 1.6, gy: 0,    mix: 1, ring: 0.0, s: 1.0, dim: 1 },
    { z: 9,   gx: 0,   gy: 0,    mix: 0, ring: 0.5, s: 0.8, dim: 0.35 },
    { z: 8,   gx: 0,   gy: 0.0,  mix: 0, ring: 0.0, s: 1.0, dim: 0.6 }
  ];
  const mobileKF = KF.map((k, i) => ({
    ...k,
    gx: 0,
    gy: [-3.5, 0, 1.5, 0, 0][i],        // hero: globe under the copy; campuses: globe above it
    z: [9.5, 12.5, 7.5, 12, 10][i],
    s: [0.75, 0.9, 0.75, 0.8, 1][i]
  }));

  const sections = $$('.screen');
  let tops = [], vh = innerHeight;
  const measure = () => { tops = sections.map(s => s.offsetTop); vh = innerHeight; };
  const fIndex = () => {
    const y = scrollY + vh * 0.45;
    let i = 0; while (i < tops.length - 1 && y >= tops[i + 1]) i++;
    if (i >= tops.length - 1) return tops.length - 1;
    return i + clamp((y - tops[i]) / (tops[i + 1] - tops[i]));
  };

  const cur = { z: 8.4, gx: 0, gy: 0, mix: 0, ring: 0, s: 1, dim: 1 };
  const alignTo = (c) => {
    const d = toVec(c.lat, c.lon, 1);
    const a = Math.atan2(-d.x, d.z);
    const b = Math.atan2(d.y, Math.sqrt(Math.max(1e-6, d.x * d.x + d.z * d.z)));
    return { y: a, x: b };
  };
  let rotY = 0, rotX = 0, spinBoost = 0, lastY = scrollY;
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    measure();
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();
  // sections change height as fonts/reveals settle
  new ResizeObserver(measure).observe(document.body);

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  const clock = new THREE.Clock();
  let ready = false;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

    // scroll state
    const dy = scrollY - lastY; lastY = scrollY;
    spinBoost = lerp(spinBoost, clamp(dy * 0.004, -0.15, 0.15), 0.2);
    const f = fIndex(), i0 = Math.floor(f), i1 = Math.min(i0 + 1, KF.length - 1), k = smooth(f - i0);
    const tbl = (innerWidth / innerHeight < 0.9 || innerWidth < 760) ? mobileKF : KF;
    const A = tbl[i0], B = tbl[i1];
    const tgt = {}; for (const key in cur) tgt[key] = lerp(A[key], B[key], k);
    const e = 1 - Math.pow(0.001, dt);                     // frame-rate independent easing
    for (const key in cur) cur[key] = lerp(cur[key], tgt[key], e * 1.6);

    // globe orientation: free spin <-> locked on focused campus
    const lock = alignTo(CAMPUSES[focus]);
    rotY += (reduced ? 0 : dt * 0.12) + spinBoost * 0.6;
    rotY %= Math.PI * 2;
    const wantY = rotY + shortest(lock.y, rotY) * cur.mix, wantX = lerp(0.25, lock.x, cur.mix);
    globe.rotation.order = 'XYZ';
    globe.rotation.y += (shortest(wantY, globe.rotation.y)) * (1 - Math.pow(0.002, dt));
    globe.rotation.x += (wantX - globe.rotation.x) * (1 - Math.pow(0.002, dt));
    globe.position.set(cur.gx, cur.gy, 0);
    globe.scale.setScalar(cur.s);
    atmo.position.copy(globe.position); atmo.scale.setScalar(cur.s);

    // parallax
    mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05);
    camera.position.set(mx * 0.8, -my * 0.6, cur.z);
    camera.lookAt(0, 0, 0);

    // pulses + travellers
    pulses.forEach(({ ring, off }, i) => {
      const p = (t * 0.6 + off) % 1, boost = (i === focus && cur.mix > .5) ? 1.8 : 1;
      ring.scale.setScalar((1 + p * 3) * boost);
      ring.material.opacity = (1 - p) * 0.9;
    });
    travellers.forEach(({ dot, curve, off }) => dot.position.copy(curve.getPoint((t * 0.25 + off) % 1)));
    markers.forEach((m, i) => m.scale.setScalar(i === focus && cur.mix > .5 ? 1.8 + Math.sin(t * 4) * .2 : 1));

    // orbiting shapes
    ring.position.copy(globe.position);
    ring.scale.setScalar(Math.max(0.001, cur.ring));
    ring.visible = cur.ring > 0.02;
    ring.rotation.y = t * 0.15;
    shapes.forEach(m => {
      const u = m.userData;
      m.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 0.8 + u.a * 3) * 0.12, Math.sin(u.a) * u.r);
      m.rotation.x += dt * 0.6 * u.s; m.rotation.y += dt * 0.8 * u.s;
    });

    canvas.style.opacity = cur.dim.toFixed(3);
    stars.rotation.y =t * 0.01 + scrollY * 0.00015;
    dotMat.uniforms.uTime.value = t;
    renderer.render(scene, camera);

    if (!ready) { ready = true; hideLoader(); }
  }
  // wrap-around-safe angle difference
  function shortest(target, current) {
    let d = (target - current) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  if (reduced) { /* still render, motion is damped above */ }
  loop();
  setTimeout(hideLoader, 4000);   // never trap the user behind the loader
}
