import * as THREE from 'three';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = t => t * t * (3 - 2 * t);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 760px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);

/* ---------- UI (works without WebGL) ---------- */
const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
burger.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
  burger.textContent = open ? 'Close' : 'Menu';
});
links.addEventListener('click', e => {
  if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); burger.textContent = 'Menu'; }
});
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 24), { passive: true });

const CAMPUSES = [
  { n: 'Bhubaneswar',    lat: 20.16, lon: 85.70, d: 'The flagship campus at Ramachandrapur, Jatni.' },
  { n: 'Paralakhemundi', lat: 18.78, lon: 84.09, d: 'The original home of CUTM, in Gajapati district, Odisha.' },
  { n: 'Rayagada',       lat: 19.17, lon: 83.42, d: 'Skill-based higher education in southern Odisha.' },
  { n: 'Balangir',       lat: 20.71, lon: 83.49, d: 'Industry-linked programmes for western Odisha.' },
  { n: 'Balasore',       lat: 21.49, lon: 86.93, d: 'Coastal northern Odisha, technology and management.' },
  { n: 'Vizianagaram',   lat: 18.11, lon: 83.40, d: 'The campus in north coastal Andhra Pradesh.' },
  { n: 'Visakhapatnam',  lat: 17.69, lon: 83.22, d: 'A coastal campus in the port city of Andhra Pradesh.' }
];
let focus = 0;
const rows = $$('.campus');
rows.forEach(r => r.addEventListener('click', () => {
  focus = +r.dataset.i;
  rows.forEach(c => c.classList.toggle('active', c === r));
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  // low warm key light rakes across the carving; a weak cool fill keeps the shadow side readable
  scene.add(new THREE.HemisphereLight(0xffe7cc, 0x3a2118, 1.5));
  const key = new THREE.DirectionalLight(0xffe0b8, 4.2); key.position.set(-5, 4, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x6a7a9a, 0.5); fill.position.set(5, -2, 2); scene.add(fill);

  const stone = new THREE.MeshStandardMaterial({ color: 0xd9904f, roughness: 0.8, metalness: 0 });
  const stoneLight = new THREE.MeshStandardMaterial({ color: 0xf5c283, roughness: 0.75, metalness: 0 });
  const stoneDeep = new THREE.MeshStandardMaterial({ color: 0xa8612f, roughness: 0.9, metalness: 0 });

  /* --- Konark-style wheel --- */
  const wheel = new THREE.Group();
  const wheelSpin = new THREE.Group(); wheel.add(wheelSpin);
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); wheelSpin.add(m); return m; };

  add(new THREE.TorusGeometry(2.0, 0.17, 24, 128), stone);                  // outer rim
  add(new THREE.TorusGeometry(1.74, 0.055, 16, 128), stoneLight, 0, 0, 0.06); // inner groove ring
  const beadGeo = new THREE.SphereGeometry(0.055, 14, 14);
  for (let i = 0; i < 64; i++) {                                              // bead band on the rim
    const a = (i / 64) * Math.PI * 2;
    add(beadGeo, stoneLight, Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0.15);
  }
  const hubGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 48); hubGeo.rotateX(Math.PI / 2);
  add(hubGeo, stoneDeep);
  add(new THREE.TorusGeometry(0.46, 0.07, 16, 64), stoneLight, 0, 0, 0.17);
  add(new THREE.SphereGeometry(0.2, 24, 24), stone, 0, 0, 0.2);

  const thick = new THREE.BoxGeometry(1.5, 0.2, 0.22), thin = new THREE.BoxGeometry(0.95, 0.075, 0.14);
  const disc = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 28); disc.rotateX(Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const sp = add(thick, stone, c * 1.17, s * 1.17, 0); sp.rotation.z = a;     // eight carved spokes
    for (const r of [0.85, 1.2, 1.55]) add(disc, stoneLight, c * r, s * r, 0.13); // medallions on each spoke
    const b = a + Math.PI / 8;
    const tp = add(thin, stoneDeep, Math.cos(b) * 1.45, Math.sin(b) * 1.45, 0); tp.rotation.z = b; // eight thin spokes between
  }
  wheel.rotation.set(0.12, -0.5, 0);
  scene.add(wheel);

  /* --- clay globe (campuses) --- */
  const R = 2;
  const globe = new THREE.Group(); scene.add(globe);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ color: 0xb8623a, roughness: 0.92, metalness: 0 })));

  const toVec = (lat, lon, r = R) => {
    const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  };
  const gp = [], rr = R * 1.002;
  for (let lat = -75; lat <= 75; lat += 15) for (let lon = 0; lon < 360; lon += 3) gp.push(toVec(lat, lon, rr), toVec(lat, lon + 3, rr));
  for (let lon = 0; lon < 360; lon += 15) for (let lat = -87; lat < 87; lat += 3) gp.push(toVec(lat, lon, rr), toVec(lat + 3, lon, rr));
  globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp), new THREE.LineBasicMaterial({ color: 0x5a2410, transparent: true, opacity: 0.45 })));

  const patch = new THREE.Mesh(new THREE.SphereGeometry(R * 1.003, 64, 16, 0, Math.PI * 2, 0, 0.17), new THREE.MeshStandardMaterial({ color: 0xf0b972, roughness: 0.95, metalness: 0 }));
  patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toVec(19.4, 84.6, 1).normalize());
  globe.add(patch);

  const hub = toVec(CAMPUSES[0].lat, CAMPUSES[0].lon);
  const markers = [];
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xfff4de, roughness: 0.4, metalness: 0.1 });
  CAMPUSES.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 20), pinMat);
    m.position.copy(toVec(c.lat, c.lon, R * 1.012)); globe.add(m); markers.push(m);
    if (i > 0) {
      const b = toVec(c.lat, c.lon);
      const mid = hub.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.06 + hub.distanceTo(b) * 0.05));
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(hub.clone(), mid, b).getPoints(40)),
        new THREE.LineBasicMaterial({ color: 0xfff4de, transparent: true, opacity: 0.75 })));
    }
  });
  const focusRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.07, 48), new THREE.MeshBasicMaterial({ color: 0x130b09, side: THREE.DoubleSide }));
  globe.add(focusRing);

  /* --- scroll keyframes, one per section --- */
  // w: wheel scale, s: globe scale, ox/oy: where the object sits on screen (fraction of viewport from centre), mix: globe locked on campus, dim: canvas opacity
  const KF = [
    { z: 9.5, ox: 0.25, oy: 0,     w: 1.25, s: 0,   mix: 0, dim: 1 },
    { z: 9.5, ox: 0.25, oy: 0,     w: 0.8,  s: 0,   mix: 0, dim: 0 },
    { z: 8.2, ox: 0.30, oy: 0,     w: 0,    s: 1.8, mix: 1, dim: 1 },
    { z: 9.5, ox: 0.25, oy: 0,     w: 0,    s: 0,   mix: 0, dim: 0 },
    { z: 9.5, ox: 0.25, oy: 0,     w: 0,    s: 0,   mix: 0, dim: 0 }
  ];
  const mobileKF = [
    { z: 9.5, ox: 0,    oy: 0.37,  w: 0.52, s: 0,   mix: 0, dim: 1 },
    { z: 9.5, ox: 0,    oy: 0,     w: 0.5,  s: 0,   mix: 0, dim: 0 },
    { z: 8.2, ox: 0,    oy: -0.27, w: 0,    s: 1.6, mix: 1, dim: 1 },
    { z: 9.5, ox: 0,    oy: 0,     w: 0,    s: 0,   mix: 0, dim: 0 },
    { z: 9.5, ox: 0,    oy: 0,     w: 0,    s: 0,   mix: 0, dim: 0 }
  ];

  const sections = $$('.screen');
  let tops = [], vh = innerHeight;
  const measure = () => { tops = sections.map(s => s.offsetTop); vh = innerHeight; };
  const fIndex = () => {
    const y = scrollY + vh * 0.45;
    let i = 0; while (i < tops.length - 1 && y >= tops[i + 1]) i++;
    if (i >= tops.length - 1) return tops.length - 1;
    return i + clamp((y - tops[i]) / (tops[i + 1] - tops[i]));
  };

  const cur = { z: 9.5, ox: 0, oy: 0, w: 1, s: 0, mix: 0, dim: 1 };
  const alignTo = c => {
    const d = toVec(c.lat, c.lon, 1);
    return { y: Math.atan2(-d.x, d.z), x: Math.atan2(d.y, Math.sqrt(Math.max(1e-6, d.x * d.x + d.z * d.z))) };
  };
  const shortest = (target, current) => {
    let d = (target - current) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  let rotY = 0, spinBoost = 0, lastY = scrollY, wheelAngle = 0;
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    measure();
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();
  new ResizeObserver(measure).observe(document.body);

  let running = true;
  const clock = new THREE.Clock();
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  let ready = false;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    const dy = scrollY - lastY; lastY = scrollY;
    spinBoost = lerp(spinBoost, clamp(dy * 0.004, -0.15, 0.15), 0.2);
    const f = fIndex(), i0 = Math.floor(f), i1 = Math.min(i0 + 1, KF.length - 1), k = smooth(f - i0);
    const tbl = (innerWidth / innerHeight < 0.9 || innerWidth < 760) ? mobileKF : KF;
    const A = tbl[i0], B = tbl[i1];
    const e = (1 - Math.pow(0.001, dt)) * 1.6;
    for (const key in cur) cur[key] = lerp(cur[key], lerp(A[key], B[key], k), e);

    canvas.style.opacity = cur.dim.toFixed(3);
    if (cur.dim < 0.01) { if (!ready) { ready = true; hideLoader(); } return; }   // fully covered by a colour band: skip the draw

    // wheel: turns slowly on its own and with scroll
    wheelAngle += (reduced ? 0 : dt * 0.12) + spinBoost * 0.8;
    wheelSpin.rotation.z = wheelAngle;
    wheel.scale.setScalar(Math.max(0.0001, cur.w)); wheel.visible = cur.w > 0.01;
    wheel.rotation.y = -0.5 + mx * 0.35; wheel.rotation.x = 0.12 + my * 0.25;

    // globe: free spin <-> locked on the focused campus
    globe.visible = cur.s > 0.01;
    const lock = alignTo(CAMPUSES[focus]);
    rotY = (rotY + (reduced ? 0 : dt * 0.1) + spinBoost * 0.6) % (Math.PI * 2);
    const wantY = rotY + shortest(lock.y, rotY) * cur.mix, wantX = lerp(0.3, lock.x, cur.mix);
    const ease = 1 - Math.pow(0.002, dt);
    globe.rotation.y += shortest(wantY, globe.rotation.y) * ease;
    globe.rotation.x += (wantX - globe.rotation.x) * ease;
    globe.scale.setScalar(Math.max(0.0001, cur.s));
    const fp = markers[focus].position;
    focusRing.position.copy(fp).multiplyScalar(1.002);
    focusRing.lookAt(fp.clone().multiplyScalar(2));
    markers.forEach((m, i) => m.scale.setScalar(i === focus ? 1.5 : 1));

    mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05);
    camera.position.set(0, 0, cur.z);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(innerWidth, innerHeight, -cur.ox * innerWidth, -cur.oy * innerHeight, innerWidth, innerHeight);
    renderer.render(scene, camera);
    if (!ready) { ready = true; hideLoader(); }
  }
  loop();
  setTimeout(hideLoader, 4000);   // never trap the user behind the loader
}
