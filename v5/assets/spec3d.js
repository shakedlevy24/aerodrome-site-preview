/* Aerodrome 3D specification viewer. Loaded only when a [data-s3d] block scrolls into view. */
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const LOOK = {
  fuselage: { color: 0xa3abb6, skin: true },  nose: { color: 0xa3abb6, skin: true },
  wings: { color: 0xa3abb6, skin: true },     winglets: { color: 0xa3abb6, skin: true },
  hatches: { color: 0x1d1f22, skin: true },   structure: { color: 0x5d6770 },
  payload: { color: 0x8a9097 },               avionics: { color: 0xff9a4d },
  tank: { color: 0x3f86c9 }
};
/* direction each section moves when the model is taken apart (model axes: x aft, y left, z up) */
const APART = {
  fuselage: [0, 0, .42], nose: [-.5, 0, 0], 'wings:l': [0, .4, 0], 'wings:r': [0, -.4, 0],
  'winglets:l': [.1, .65, 0], 'winglets:r': [.1, -.65, 0], hatches: [0, 0, .75],
  structure: [0, 0, 0], payload: [0, 0, -.42], avionics: [.2, 0, -.42], tank: [0, 0, -.2],
  warhead: [-.15, 0, -.7], engine: [.55, 0, 0], camera: [-.5, 0, -.25], gnss: [0, 0, .95], antennas: [0, 0, .95],
  'pitot:l': [0, .4, 0], 'pitot:r': [0, -.4, 0], 'elevons:l': [0, .4, 0], 'elevons:r': [0, -.4, 0]
};

export async function mount(box){
  const stage = box.querySelector('.s3d-stage'), base = box.dataset.s3d;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [man, bin] = await Promise.all([
    fetch(base + '.json').then(r => r.json()),
    fetch(base + '.bin').then(r => r.arrayBuffer())
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement; cv.className = 's3d-canvas';
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', box.dataset.label || '3D model');
  stage.appendChild(cv);

  const scene = new THREE.Scene();
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x20262e, .35));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, .55); fill.position.set(3, 2.5, -4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffb070, .5); rim.position.set(4, 1.5, -5); scene.add(rim);

  const cam = new THREE.PerspectiveCamera(28, 1, .05, 60);
  const size = man.scale, mid = man.min.map((m, i) => m + [man.scale, 2.6, .65][i] / 2);
  const model = new THREE.Group(); scene.add(model);
  /* model (x aft, y left, z up) -> scene (x, z, -y), centred */
  model.rotation.x = -Math.PI / 2; 
  const groups = {};
  man.groups.forEach(g => {
    const kind = g.id.split(':')[0], look = LOOK[kind] || LOOK.structure;
    const mat = new THREE.MeshStandardMaterial({ color: look.color, roughness: kind === 'avionics' ? .45 : (kind === 'hatches' ? .4 : .68), metalness: look.skin ? .05 : .2, side: THREE.DoubleSide, transparent: true, opacity: 1, polygonOffset: !look.skin, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
    const node = new THREE.Group(); node.userData = { kind, id: g.id, mat, skin: !!look.skin };
    g.chunks.forEach(c => {
      const q = new Uint16Array(bin, c.v[0], c.v[1] * 3), pos = new Float32Array(q.length);
      for (let i = 0; i < q.length; i += 3){
        pos[i] = q[i] / 65535 * size + man.min[0] - mid[0];
        pos[i + 1] = q[i + 1] / 65535 * size + man.min[1];
        pos[i + 2] = q[i + 2] / 65535 * size + man.min[2];
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array(bin, c.i[0], c.i[1]), 1));
      geo.computeVertexNormals();
      node.add(new THREE.Mesh(geo, mat));
    });
    model.add(node); groups[g.id] = node;
  });


  /* components modelled after the real parts (not in the airframe file) */
  const X = x => x - mid[0];
  const PI = Math.PI;
  const mk = (color, rough, metal, more) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, more || {}));
  const alu = mk(0xc4c8cc, .32, .9), steel = mk(0x9a9ea3, .4, .85), black = mk(0x18191b, .55, .3), rubber = mk(0x101112, .9, 0),
        grey = mk(0x8f949a, .6, .15), red = mk(0xc22a22, .45, .4), finHead = mk(0x1d1e20, .5, .5);
  const carbon = new THREE.MeshPhysicalMaterial({ color: 0x0c0d0f, roughness: .35, metalness: .2, clearcoat: 1, clearcoatRoughness: .15 });
  function part(kind, id){
    const node = new THREE.Group(); node.userData = { kind, id: id || kind };
    model.add(node); groups[id || kind] = node; return node;
  }
  function add(node, geo, mat, x, y, z, rx, ry, rz){
    const m = new THREE.Mesh(geo, mat); m.position.set(X(x), y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); node.add(m); return m;
  }
  const cyl = (r1, r2, h, seg) => new THREE.CylinderGeometry(r1, r2, h, seg || 24);
  const bx = (a, b, c) => new THREE.BoxGeometry(a, b, c);
  /* cylinder axes: default along model y; AX turns it along x, AZ along z */
  const AX = [0, 0, PI / 2], AZ = [PI / 2, 0, 0];

  /* airframe finish: yellow band behind the nose joint */
  if (groups.fuselage) add(groups.fuselage, new THREE.CylinderGeometry(.1768, .1768, .05, 48, 1, true), mk(0xe3cc1c, .6, .05, { side: THREE.DoubleSide }), .665, 0, 0, ...AX);

  /* engine */
  const jet = box.dataset.engine === 'jet';
  const eng = part('engine');
  const prop = new THREE.Group(); prop.position.set(X(3.452), 0, 0); eng.add(prop);
  if (jet){
    const shell = mk(0x9aa1a8, .45, .6), copper = mk(0x9a5a34, .4, .75), hot = mk(0x1a1210, .6, .3, { side: THREE.BackSide });
    [-1, 1].forEach(sd => {
      add(eng, cyl(.075, .085, .5, 32), shell, 3.2, sd * .09, -.02, ...AX);
      add(eng, new THREE.CylinderGeometry(.075, .058, .12, 32, 1, true), copper, 3.51, sd * .09, -.02, ...AX);
      add(eng, new THREE.CylinderGeometry(.072, .055, .118, 32, 1, true), hot, 3.51, sd * .09, -.02, ...AX);
      add(eng, new THREE.TorusGeometry(.08, .012, 12, 32), alu, 2.95, sd * .09, -.02, 0, PI / 2, 0);
    });
    add(eng, bx(.42, .2, .1), shell, 3.2, 0, -.02);
  } else {
    /* built after the real engine: scaled about the rear bulkhead */
    const E = new THREE.Group(), K = 1.14; E.scale.setScalar(K); E.position.set(X(3.1) * (1 - K), 0, .005 * (1 - K)); eng.add(E); E.add(prop);
    /* mounts and mount plate on the rear bulkhead */
    [-1, 1].forEach(a => [-1, 1].forEach(b => add(E, cyl(.024, .024, .06), rubber, 3.07, a * .075, b * .06 + .01, ...AX)));
    add(E, bx(.012, .2, .17), alu, 3.108, 0, .01);
    [-1, 1].forEach(a => add(E, bx(.05, .012, .03), alu, 3.135, a * .075, .01));
    /* crankcase with front and rear covers */
    add(E, bx(.23, .1, .12), alu, 3.25, 0, .005);
    add(E, cyl(.052, .052, .235, 32), alu, 3.25, 0, .005, ...AX);
    add(E, cyl(.062, .062, .012, 32), steel, 3.368, 0, .005, ...AX);
    /* four opposed cylinders: base, finned barrel, black finned head with strap, plug and lead, exhaust stub */
    const fin = bx(.094, .0028, .104), hfin = bx(.098, .004, .108);
    [3.195, 3.305].forEach(x => [-1, 1].forEach(sd => {
      add(E, bx(.08, .012, .09), alu, x, sd * .054, .005);
      add(E, cyl(.037, .037, .1, 24), alu, x, sd * .1, .005);
      for (let i = 0; i < 11; i++) add(E, fin, alu, x, sd * (.062 + i * .0088), .005);
      add(E, bx(.086, .036, .096), finHead, x, sd * .173, .005);
      for (let i = 0; i < 5; i++) add(E, hfin, finHead, x, sd * (.157 + i * .0085), .005);
      add(E, bx(.1, .003, .012), steel, x, sd * .194, -.02);
      add(E, cyl(.0075, .0075, .03, 12), steel, x, sd * .205, .012);
      add(E, cyl(.011, .011, .012, 6), steel, x, sd * .193, .012);
      const lead = new THREE.CatmullRomCurve3([[x, sd * .22, .012], [x + .012, sd * .235, -.03], [x + .02, sd * .2, -.075], [3.25, sd * .12, -.085]].map(q => new THREE.Vector3(X(q[0]), q[1], q[2])));
      E.add(new THREE.Mesh(new THREE.TubeGeometry(lead, 20, .0035, 8), steel));
      add(E, cyl(.017, .017, .13, 20), steel, x, sd * .135, -.11, ...AZ);
      add(E, cyl(.021, .021, .012, 20), steel, x, sd * .135, -.052, ...AZ);
    }));
    /* carburettors with tall air filters, throttle linkage, ignition boxes, fuel lines */
    [3.195, 3.305].forEach(x => {
      add(E, bx(.052, .058, .06), alu, x, 0, .1);
      add(E, cyl(.021, .021, .03, 16), alu, x, 0, .142, ...AZ);
      add(E, cyl(.027, .027, .01, 20), steel, x, 0, .158, ...AZ);
      add(E, cyl(.036, .036, .06, 32), rubber, x, 0, .192, ...AZ);
      add(E, cyl(.038, .035, .012, 32), black, x, 0, .227, ...AZ);
      add(E, bx(.075, .03, .036), black, x, .052, .086);
      add(E, bx(.008, .004, .03), steel, x + .02, -.034, .125);
    });
    add(E, cyl(.0025, .0025, .14, 8), steel, 3.27, -.036, .138, ...AX);
    [[[3.305, -.03, .12], [3.25, -.04, .135], [3.195, -.03, .12], [3.14, -.05, .118], [3.1, -.06, .1]],
     [[3.305, .0, .135], [3.33, .02, .15], [3.25, .03, .15], [3.195, .0, .135]]].forEach(pts => {
      const line = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(X(q[0]), q[1], q[2])));
      E.add(new THREE.Mesh(new THREE.TubeGeometry(line, 24, .0038, 8), mk(0xd8d23a, .3, 0, { transparent: true, opacity: .9 })));
    });
    /* toothed ring gear with lightening holes, starter pinion and motor */
    const gear = new THREE.Shape(), T = 72;
    for (let i = 0; i < T * 2; i++){ const a = i / (T * 2) * PI * 2, r = i % 2 ? .0975 : .091; i ? gear.lineTo(Math.cos(a) * r, Math.sin(a) * r) : gear.moveTo(r, 0); }
    gear.closePath();
    for (let i = 0; i < 8; i++){ const a = i / 8 * PI * 2, h = new THREE.Path(); h.absarc(Math.cos(a) * .062, Math.sin(a) * .062, .015, 0, PI * 2, true); gear.holes.push(h); }
    const gg = new THREE.ExtrudeGeometry(gear, { depth: .008, bevelEnabled: false, curveSegments: 20 }); gg.translate(0, 0, -.004);
    add(E, gg, alu, 3.392, 0, .005, 0, PI / 2, 0);
    add(E, cyl(.034, .034, .02, 28), alu, 3.392, 0, .005, ...AX);
    add(E, cyl(.02, .02, .012, 18), steel, 3.392, .0, -.112, ...AX);
    add(E, cyl(.024, .024, .1, 22), black, 3.33, 0, -.112, ...AX);
    /* propeller shaft, hub flange with bolts */
    add(E, cyl(.02, .02, .06, 20), steel, 3.425, 0, .005, ...AX);
    prop.position.set(X(3.458), 0, .005);
    prop.add(new THREE.Mesh(cyl(.044, .044, .012, 32), alu).rotateZ(PI / 2));
    const front = new THREE.Mesh(cyl(.04, .04, .008, 32), alu); front.rotation.z = PI / 2; front.position.x = .024; prop.add(front);
    for (let i = 0; i < 6; i++){ const a = i / 6 * PI * 2, bolt = new THREE.Mesh(cyl(.005, .005, .012, 6), steel); bolt.rotation.z = PI / 2; bolt.position.set(.032, Math.cos(a) * .028, Math.sin(a) * .028); prop.add(bolt); }
    /* two-blade carbon propeller, scimitar planform */
    const sh = new THREE.Shape();
    sh.moveTo(-.03, 0); sh.bezierCurveTo(-.06, .07, -.068, .17, -.05, .27); sh.bezierCurveTo(-.04, .33, -.02, .372, .0, .38);
    sh.bezierCurveTo(.014, .37, .016, .32, .014, .27); sh.bezierCurveTo(.02, .17, .034, .07, .03, 0); sh.closePath();
    const bg = new THREE.ExtrudeGeometry(sh, { depth: .012, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 3, curveSegments: 20 }); bg.translate(0, 0, -.006);
    [0, PI].forEach(r => { const g = new THREE.Group(); g.rotation.x = r; g.position.x = .012; const bl = new THREE.Mesh(bg, carbon); bl.rotation.y = PI / 2 + .3; g.add(bl); prop.add(g); });
  }

  /* camera: stabilised ball under the nose */
  const camn = part('camera');
  add(camn, new THREE.SphereGeometry(.052, 32, 20), grey, .15, 0, -.105);
  add(camn, cyl(.057, .057, .02, 32), grey, .15, 0, -.1, ...AZ);
  add(camn, cyl(.022, .022, .02, 24), mk(0x050506, .1, .8), .112, 0, -.125, 0, 0, PI / 2 - .5);

  /* warhead in the section behind the nose */
  const wh = part('warhead'), whm = mk(0xd9482b, .45, .3, { emissive: 0x3a0d05 });
  add(wh, cyl(.115, .115, .42, 36), whm, .98, 0, -.03, ...AX);
  add(wh, new THREE.SphereGeometry(.115, 36, 18, 0, PI * 2, 0, PI / 2), whm, .77, 0, -.03, ...AX);
  add(wh, cyl(.118, .118, .05, 36), mk(0xf2f2ef, .5, 0), .9, 0, -.03, ...AX);

  /* GNSS antennas: black two-step pucks */
  const gn = part('gnss');
  [[1.5, 0, .175], [2.965, .075, .13]].forEach(p => {
    add(gn, cyl(.04, .042, .02, 32), black, p[0], p[1], p[2] + .01, ...AZ);
    add(gn, cyl(.036, .036, .045, 32), black, p[0], p[1], p[2] + .042, ...AZ);
  });

  /* communication antennas: mast with crossbar behind the yellow band, small button antenna on the front hatch */
  const an = part('antennas');
  const UP = new THREE.Vector3(0, 1, 0);
  function rod(node, mat, r, p, q){
    const A = new THREE.Vector3(X(p[0]), p[1], p[2]), B = new THREE.Vector3(X(q[0]), q[1], q[2]), d = B.clone().sub(A);
    const m = new THREE.Mesh(cyl(r, r, d.length(), 14), mat); m.position.copy(A).add(B).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(UP, d.normalize()); node.add(m); return m;
  }
  add(an, bx(.07, .04, .005), grey, .705, 0, .177);
  rod(an, grey, .011, [.7, 0, .177], [.762, 0, .312]);
  add(an, new THREE.CapsuleGeometry(.011, .15, 6, 12), grey, .765, 0, .318);
  [-1, 1].forEach(sd => rod(an, grey, .007, [.722, 0, .222], [.665, sd * .05, .28]));
  add(an, cyl(.005, .005, .022, 12), alu, 1.12, 0, .186, ...AZ);
  add(an, new THREE.SphereGeometry(.02, 24, 12, 0, PI * 2, 0, PI / 2), alu, 1.12, 0, .195, ...AZ);

  /* airspeed sensor: one pitot tube, on the left wing */
  const pt = part('pitot', 'pitot:l');
  add(pt, cyl(.0055, .0055, .27, 14), alu, 1.585, .62, -.008, ...AX);
  add(pt, cyl(.0055, .002, .025, 14), alu, 1.4375, .62, -.008, ...AX);
  /* elevon servos, horns and pushrods */
  [['l', 1], ['r', -1]].forEach(s => {
    const el = part('elevons', 'elevons:' + s[0]);
    add(el, bx(.005, 1.02, .0025), black, 2.93, s[1] * .75, -.0165);
    add(el, bx(.004, .003, .012), black, 3.03, s[1] * .675, -.02);
    [.45, .9].forEach(y => {
      add(el, bx(.1, .1, .003), carbon, 2.74, s[1] * y, .004);
      add(el, bx(.014, .008, .034), red, 2.775, s[1] * y + .03, .02);
      add(el, cyl(.003, .003, .2, 8), steel, 2.875, s[1] * y + .03, .022, 0, .09, PI / 2);
      add(el, bx(.022, .007, .04), black, 2.975, s[1] * y + .03, -.002);
    });
  });

  /* numbered markers that follow the parts */
  const marks = [];
  const anchors = { camera: [.15, 0, -.1], gnss: [1.5, 0, .24], antennas: [.7, 0, .34], tank: [1.95, 0, -.05], warhead: [.95, 0, 0], engine: [3.3, 0, .27], pitot: [1.5, .62, 0], elevons: [2.85, .9, .03] };
  box.querySelectorAll('[data-mark]').forEach(el => {
    const kind = el.dataset.mark, node = Object.values(groups).find(n => n.userData.kind === kind), a = anchors[kind]; if (!node || !a) return;
    const o = new THREE.Object3D(); o.position.set(X(a[0]), a[1], a[2]); node.add(o);
    stage.appendChild(el); marks.push({ el, o, node });
  });
  const v3 = new THREE.Vector3();
  function placeMarks(){
    const w = stage.clientWidth, h = stage.clientHeight;
    marks.forEach(m => {
      m.o.getWorldPosition(v3).project(cam);
      const on = v3.z < 1;
      m.el.hidden = !on; m.el.classList.toggle('off', !m.node.visible);
      if (on){ m.el.style.left = ((v3.x * .5 + .5) * w).toFixed(1) + 'px'; m.el.style.top = ((-v3.y * .5 + .5) * h).toFixed(1) + 'px'; }
    });
  }

  const ctl = new OrbitControls(cam, cv);
  ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false;
  ctl.minDistance = 2.2; ctl.maxDistance = 11; ctl.enableZoom = false; ctl.autoRotate = !reduce; ctl.autoRotateSpeed = .7;
  const home = () => { cam.position.set(-2.6, 1.45, 3.05); ctl.target.set(0, -.02, 0); ctl.update(); };
  home();
  ctl.addEventListener('start', () => { ctl.autoRotate = false; box.classList.add('s3d-used'); });

  let visible = true, raf = 0;
  function fit(){
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < 1.15 ? 62 : (w / h < 1.5 ? 36 : 28); cam.updateProjectionMatrix();
  }
  function frame(){ raf = 0; ctl.update(); if (!reduce && !jet && eng.visible) prop.rotation.x += .12; renderer.render(scene, cam); placeMarks(); if (visible) raf = requestAnimationFrame(frame); }
  function wake(){ if (!raf && visible) raf = requestAnimationFrame(frame); }
  new ResizeObserver(() => { fit(); wake(); }).observe(stage);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(stage);
  fit(); wake();

  /* show / hide parts */
  function setPart(kind, on){ Object.values(groups).forEach(n => { if (n.userData.kind === kind) n.visible = on; }); }
  box.querySelectorAll('[data-part]').forEach(b => {
    setPart(b.dataset.part, b.getAttribute('aria-pressed') === 'true');
    b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); setPart(b.dataset.part, on); });
  });
  /* see-through skin */
  const xr = box.querySelector('[data-xray]');
  function setXray(on){ Object.values(groups).forEach(n => { if (n.userData.skin){ n.userData.mat.opacity = on ? (n.userData.kind === 'hatches' ? .3 : .2) : 1; n.userData.mat.depthWrite = !on; } }); }
  if (xr){ setXray(xr.getAttribute('aria-pressed') === 'true'); xr.addEventListener('click', () => { const on = xr.getAttribute('aria-pressed') !== 'true'; xr.setAttribute('aria-pressed', on ? 'true' : 'false'); setXray(on); }); }
  /* take apart */
  const ex = box.querySelector('[data-apart]');
  function setApart(k){ model.scale.setScalar(1 - .2 * k); Object.values(groups).forEach(n => { const d = APART[n.userData.id] || [0, 0, 0]; n.position.set(d[0] * k * .8, d[1] * k * .8, d[2] * k * .8); }); }
  if (ex){ setApart(ex.value / 100); ex.addEventListener('input', () => { ctl.autoRotate = false; setApart(ex.value / 100); }); }
  const rs = box.querySelector('[data-home]');
  if (rs) rs.addEventListener('click', () => { home(); if (ex){ ex.value = 0; setApart(0); } });

  /* real photo of a part, opened from its marker on the model */
  const fig = box.querySelector('.s3d-photo');
  if (fig){
    const im = fig.querySelector('img'), cap = fig.querySelector('figcaption');
    let from = null;
    const close = () => { fig.hidden = true; if (from) from.setAttribute('aria-expanded', 'false'); from = null; };
    box.querySelectorAll('.s3d-mark.has-pic').forEach(b => b.addEventListener('click', () => {
      if (from === b) return close();
      if (from) from.setAttribute('aria-expanded', 'false');
      from = b; im.src = b.dataset.pic; im.alt = b.dataset.alt || ''; cap.textContent = b.textContent.trim();
      b.setAttribute('aria-expanded', 'true'); fig.hidden = false; ctl.autoRotate = false;
    }));
    fig.querySelector('button').addEventListener('click', () => { const f = from; close(); if (f) f.focus(); });
    box.addEventListener('keydown', e => { if (e.key === 'Escape' && !fig.hidden){ const f = from; close(); if (f) f.focus(); } });
  }
  /* labels on the model: tap to read about a part and to show or hide it */
  const info = box.querySelector('.s3d-info');
  if (info){
    const nm = info.querySelector('b'), ds = info.querySelector('p'), tg = info.querySelector('[data-toggle]');
    let cur = null;
    const isOn = k => Object.values(groups).some(n => n.userData.kind === k && n.visible);
    const paint = () => { const on = isOn(cur.dataset.mark); tg.setAttribute('aria-pressed', on ? 'true' : 'false'); tg.textContent = on ? 'Shown' : 'Hidden'; };
    const close = () => { info.hidden = true; if (cur) cur.setAttribute('aria-pressed', 'false'); cur = null; };
    box.querySelectorAll('button.s3d-mark').forEach(b => b.addEventListener('click', () => {
      if (cur === b) return close();
      if (cur) cur.setAttribute('aria-pressed', 'false');
      cur = b; b.setAttribute('aria-pressed', 'true'); nm.textContent = b.dataset.name; ds.textContent = b.dataset.desc;
      paint(); info.hidden = false; ctl.autoRotate = false;
    }));
    tg.addEventListener('click', () => { if (!cur) return; setPart(cur.dataset.mark, !isOn(cur.dataset.mark)); paint(); });
    info.querySelector('.x').addEventListener('click', () => { const f = cur; close(); if (f) f.focus(); });
    box.addEventListener('keydown', e => { if (e.key === 'Escape' && !info.hidden){ const f = cur; close(); if (f) f.focus(); } });
  }
  box.s3d = { cam, ctl };
  box.classList.add('s3d-on');
}
