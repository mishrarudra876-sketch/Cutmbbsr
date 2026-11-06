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
  camera.position.set(0, 0, 9);

  // warm daylight, no coloured lights
  scene.add(new THREE.HemisphereLight(0xfff3e4, 0x7a5a48, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(-4, 3.5, 6); scene.add(sun);

  const R = 2;
  const globe = new THREE.Group(); scene.add(globe);

  // clay body
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 64),
    new THREE.MeshStandardMaterial({ color: 0xb8623a, roughness: 0.92, metalness: 0 })
  ));

  // engraved graticule every 15 degrees
  const toVec = (lat, lon, r = R) => {
    const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  };
  const gp = [], rr = R * 1.002;
  for (let lat = -75; lat <= 75; lat += 15) for (let lon = 0; lon < 360; lon += 3) { gp.push(toVec(lat, lon, rr), toVec(lat, lon + 3, rr)); }
  for (let lon = 0; lon < 360; lon += 15) for (let lat = -87; lat < 87; lat += 3) { gp.push(toVec(lat, lon, rr), toVec(lat + 3, lon, rr)); }
  globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp),
    new THREE.LineBasicMaterial({ color: 0x6e2f16, transparent: true, opacity: 0.4 })));

  // the region the campuses sit in, a lighter patch of clay
  const regionDir = toVec(19.4, 84.6, 1).normalize();
  const patch = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.003, 64, 16, 0, Math.PI * 2, 0, 0.17),
    new THREE.MeshStandardMaterial({ color: 0xe3a77f, roughness: 0.95, metalness: 0 })
  );
  patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), regionDir);
  globe.add(patch);

  // campus pins, arcs from the Bhubaneswar hub, and one focus ring
  const hub = toVec(CAMPUSES[0].lat, CAMPUSES[0].lon);
  const markers = [];
  CAMPUSES.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 20), new THREE.MeshStandardMaterial({ color: 0xfff4de, roughness: 0.4, metalness: 0.1 }));
    m.position.copy(toVec(c.lat, c.lon, R * 1.012)); globe.add(m); markers.push(m);
    if (i > 0) {
      const b = toVec(c.lat, c.lon);
      const mid = hub.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.06 + hub.distanceTo(b) * 0.05));
      const curve = new THREE.QuadraticBezierCurve3(hub.clone(), mid, b);
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
        new THREE.LineBasicMaterial({ color: 0xfff4de, transparent: true, opacity: 0.7 })));
    }
  });
  const focusRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.07, 48), new THREE.MeshBasicMaterial({ color: 0x1f1b16, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  globe.add(focusRing);

  /* --- scroll keyframes (one per section) --- */
  // z: camera distance, gx/gy: globe offset, mix: 0 free spin / 1 locked on focused campus, s: scale, dim: canvas opacity
  // ox/oy: where the globe sits on screen, as a fraction of the viewport from centre (off-axis projection, so perspective stays symmetrical)
  const KF = [
    { z: 9.5, ox: 0.27, oy: 0, mix: 0, s: 1.0, dim: 1 },
    { z: 9.5, ox: 0.27, oy: 0, mix: 0, s: 0.9, dim: 0.9 },
    { z: 8.2, ox: 0.30, oy: 0, mix: 1, s: 1.8, dim: 1 },
    { z: 9.5, ox: 0.27, oy: 0, mix: 0, s: 0.9, dim: 0.6 },
    { z: 9.5, ox: 0.27, oy: 0, mix: 0, s: 0.9, dim: 0.6 }
  ];
  const mobileKF = [
    { z: 9.5, ox: 0, oy: 0.31,  mix: 0, s: 0.56, dim: 1 },
    { z: 9.5, ox: 0, oy: 0,     mix: 0, s: 0.9,  dim: 0.08 },
    { z: 8.2, ox: 0, oy: -0.27, mix: 1, s: 1.6,  dim: 1 },
    { z: 9.5, ox: 0, oy: 0,     mix: 0, s: 0.9,  dim: 0.12 },
    { z: 9.5, ox: 0, oy: 0,     mix: 0, s: 0.9,  dim: 0.16 }
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

  const cur = { z: 9.5, ox: 0, oy: 0, mix: 0, s: 1, dim: 1 };
  const alignTo = c => {
    const d = toVec(c.lat, c.lon, 1);
    return { y: Math.atan2(-d.x, d.z), x: Math.atan2(d.y, Math.sqrt(Math.max(1e-6, d.x * d.x + d.z * d.z))) };
  };
  const shortest = (target, current) => {
    let d = (target - current) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  let rotY = 0, spinBoost = 0, lastY = scrollY;
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

    // free spin <-> locked on the focused campus
    const lock = alignTo(CAMPUSES[focus]);
    rotY = (rotY + (reduced ? 0 : dt * 0.1) + spinBoost * 0.6) % (Math.PI * 2);
    const wantY = rotY + shortest(lock.y, rotY) * cur.mix, wantX = lerp(0.3, lock.x, cur.mix);
    const ease = 1 - Math.pow(0.002, dt);
    globe.rotation.y += shortest(wantY, globe.rotation.y) * ease;
    globe.rotation.x += (wantX - globe.rotation.x) * ease;
    globe.scale.setScalar(cur.s);

    // focus ring sits on the selected campus
    const fp = markers[focus].position;
    focusRing.position.copy(fp).multiplyScalar(1.002);
    focusRing.lookAt(fp.clone().multiplyScalar(2));
    markers.forEach((m, i) => m.scale.setScalar(i === focus ? 1.5 : 1));

    mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05);
    camera.position.set(mx * 0.6, -my * 0.4, cur.z);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(innerWidth, innerHeight, -cur.ox * innerWidth, -cur.oy * innerHeight, innerWidth, innerHeight);

    canvas.style.opacity = cur.dim.toFixed(3);
    renderer.render(scene, camera);
    if (!ready) { ready = true; hideLoader(); }
  }
  loop();
  setTimeout(hideLoader, 4000);   // never trap the user behind the loader
}
