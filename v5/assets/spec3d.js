/* Aerodrome 3D specification viewer. Loaded only when a [data-s3d] block scrolls into view. */
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const LOOK = {
  fuselage: { color: 0xc9ced3, skin: true },  nose: { color: 0xd6dade, skin: true },
  wings: { color: 0xc3c8cd, skin: true },     winglets: { color: 0xd6dade, skin: true },
  hatches: { color: 0xaeb4ba, skin: true },   structure: { color: 0x5d6770 },
  payload: { color: 0xf28c28 },               avionics: { color: 0xff9a4d },
  tank: { color: 0x3f86c9 }
};
/* direction each section moves when the model is taken apart (model axes: x aft, y left, z up) */
const APART = {
  fuselage: [0, 0, .42], nose: [-.5, 0, 0], 'wings:l': [0, .4, 0], 'wings:r': [0, -.4, 0],
  'winglets:l': [.1, .65, 0], 'winglets:r': [.1, -.65, 0], hatches: [0, 0, .75],
  structure: [0, 0, 0], payload: [0, 0, -.42], avionics: [.2, 0, -.42], tank: [0, 0, -.2],
  warhead: [-.15, 0, -.7], engine: [.55, 0, 0], camera: [-.75, 0, 0], gnss: [0, 0, .95], antennas: [0, 0, .95]
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
  scene.add(new THREE.HemisphereLight(0xffffff, 0x20262e, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb070, .7); rim.position.set(4, 1.5, -5); scene.add(rim);

  const cam = new THREE.PerspectiveCamera(28, 1, .05, 60);
  const size = man.scale, mid = man.min.map((m, i) => m + [man.scale, 2.6, .65][i] / 2);
  const model = new THREE.Group(); scene.add(model);
  /* model (x aft, y left, z up) -> scene (x, z, -y), centred */
  model.rotation.x = -Math.PI / 2; 
  const groups = {};
  man.groups.forEach(g => {
    const kind = g.id.split(':')[0], look = LOOK[kind] || LOOK.structure;
    const mat = new THREE.MeshStandardMaterial({ color: look.color, roughness: kind === 'avionics' ? .45 : .62, metalness: look.skin ? .08 : .2, side: THREE.DoubleSide, transparent: true, opacity: 1, polygonOffset: !look.skin, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
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


  /* components drawn as simple illustrative shapes (not in the airframe file) */
  const X = x => x - mid[0];
  function part(kind, color, opts){
    const mat = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .5, metalness: .35, transparent: true, opacity: 1 }, opts || {}));
    const node = new THREE.Group(); node.userData = { kind, id: kind, mat };
    model.add(node); groups[kind] = node; return node;
  }
  function add(node, geo, x, y, z, mat){ const m = new THREE.Mesh(geo, mat || node.userData.mat); m.position.set(X(x), y, z); node.add(m); return m; }
  const red = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: .5, metalness: .3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: .35, metalness: .5 });
  /* engine: piston engine with pusher propeller, or the jet module (data-engine="jet") */
  const jet = box.dataset.engine === 'jet';
  const eng = part('engine', jet ? 0x9aa1a8 : 0x4a5057);
  const prop = new THREE.Group(); prop.position.set(X(3.45), 0, 0); eng.add(prop);
  if (jet){
    const copper = new THREE.MeshStandardMaterial({ color: 0x9a5a34, roughness: .4, metalness: .7 });
    const hot = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: .6, metalness: .3, side: THREE.BackSide });
    [-1, 1].forEach(sd => {
      add(eng, new THREE.CylinderGeometry(.075, .085, .5, 28), 3.2, sd * .09, -.02).rotation.z = Math.PI / 2;
      add(eng, new THREE.CylinderGeometry(.075, .058, .12, 28, 1, true), 3.51, sd * .09, -.02, copper).rotation.z = Math.PI / 2;
      add(eng, new THREE.CylinderGeometry(.072, .055, .118, 28, 1, true), 3.51, sd * .09, -.02, hot).rotation.z = Math.PI / 2;
      add(eng, new THREE.TorusGeometry(.08, .012, 10, 28), 2.95, sd * .09, -.02).rotation.y = Math.PI / 2;
    });
    add(eng, new THREE.BoxGeometry(.42, .2, .1), 3.2, 0, -.02);
  } else {
    add(eng, new THREE.BoxGeometry(.2, .15, .15), 3.25, 0, 0);
    [3.2, 3.3].forEach(x => [-1, 1].forEach(sd => {
      add(eng, new THREE.CylinderGeometry(.045, .045, .11, 20), x, sd * .13, 0, red);
      add(eng, new THREE.CylinderGeometry(.052, .052, .02, 20), x, sd * .195, 0);
    }));
    add(eng, new THREE.CylinderGeometry(.035, .035, .1, 20), 3.4, 0, 0).rotation.z = Math.PI / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.014, .76, .07), dark); blade.rotation.y = .25; prop.add(blade);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.04, .09, 20), eng.userData.mat); cone.rotation.z = -Math.PI / 2; cone.position.x = .05; prop.add(cone);
  }
  /* camera in the nose */
  const camn = part('camera', 0x15181b, { roughness: .2, metalness: .6 });
  const ring = add(camn, new THREE.CylinderGeometry(.05, .05, .03, 24), .012, 0, -.03, new THREE.MeshStandardMaterial({ color: 0xf28c28, roughness: .5 })); ring.rotation.z = Math.PI / 2;
  const lens = add(camn, new THREE.SphereGeometry(.038, 24, 16), -.002, 0, -.03);
  /* warhead in the payload bay */
  const wh = part('warhead', 0xd9482b, { roughness: .45, metalness: .3, emissive: 0x3a0d05 });
  add(wh, new THREE.CylinderGeometry(.115, .115, .42, 32), .98, 0, -.03).rotation.z = Math.PI / 2;
  add(wh, new THREE.SphereGeometry(.115, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), .77, 0, -.03).rotation.z = Math.PI / 2;
  add(wh, new THREE.CylinderGeometry(.118, .118, .05, 32), .9, 0, -.03, new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: .5 })).rotation.z = Math.PI / 2;
  /* two GNSS antennas on the back */
  const gn = part('gnss', 0xf28c28);
  [1.55, 2.25].forEach(x => { add(gn, new THREE.CylinderGeometry(.045, .05, .022, 24), x, 0, .188).rotation.x = Math.PI / 2; });
  /* blade antennas on the back */
  const an = part('antennas', 0xf28c28);
  const bl = new THREE.Shape(); bl.moveTo(0, 0); bl.lineTo(.11, 0); bl.lineTo(.085, .1); bl.lineTo(.05, .1); bl.closePath();
  const blGeo = new THREE.ExtrudeGeometry(bl, { depth: .012, bevelEnabled: false }); blGeo.translate(0, 0, -.006);
  [[1.9, .18, 1], [2.9, .17, 1]].forEach(a => { const m = add(an, blGeo, a[0], 0, a[1]); m.rotation.x = Math.PI / 2 * a[2]; });

  /* numbered markers that follow the parts */
  const marks = [];
  const anchors = { camera: [-.02, 0, -.03], gnss: [1.55, 0, .2], antennas: [1.95, 0, .3], tank: [1.95, 0, -.05], warhead: [.95, 0, .0], engine: [3.28, 0, .12] };
  box.querySelectorAll('[data-mark]').forEach(el => {
    const kind = el.dataset.mark, node = groups[kind], a = anchors[kind]; if (!node || !a) return;
    const o = new THREE.Object3D(); o.position.set(X(a[0]), a[1], a[2]); node.add(o);
    stage.appendChild(el); marks.push({ el, o, node });
  });
  const v3 = new THREE.Vector3();
  function placeMarks(){
    const w = stage.clientWidth, h = stage.clientHeight;
    marks.forEach(m => {
      m.o.getWorldPosition(v3).project(cam);
      const on = m.node.visible && v3.z < 1;
      m.el.hidden = !on;
      if (on){ m.el.style.left = ((v3.x * .5 + .5) * w).toFixed(1) + 'px'; m.el.style.top = ((-v3.y * .5 + .5) * h).toFixed(1) + 'px'; }
    });
  }

  const ctl = new OrbitControls(cam, cv);
  ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false;
  ctl.minDistance = 2.2; ctl.maxDistance = 11; ctl.enableZoom = false; ctl.autoRotate = !reduce; ctl.autoRotateSpeed = .7;
  const home = () => { cam.position.set(-3.3, 1.9, 3.9); ctl.target.set(0, -.12, 0); ctl.update(); };
  home();
  ctl.addEventListener('start', () => { ctl.autoRotate = false; box.classList.add('s3d-used'); });

  let visible = true, raf = 0;
  function fit(){
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < 1.25 ? 40 : 28; cam.updateProjectionMatrix();
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
  function setXray(on){ Object.values(groups).forEach(n => { if (n.userData.skin){ n.userData.mat.opacity = on ? .16 : 1; n.userData.mat.depthWrite = !on; } }); }
  if (xr){ setXray(xr.getAttribute('aria-pressed') === 'true'); xr.addEventListener('click', () => { const on = xr.getAttribute('aria-pressed') !== 'true'; xr.setAttribute('aria-pressed', on ? 'true' : 'false'); setXray(on); }); }
  /* take apart */
  const ex = box.querySelector('[data-apart]');
  function setApart(k){ model.scale.setScalar(1 - .2 * k); Object.values(groups).forEach(n => { const d = APART[n.userData.id] || [0, 0, 0]; n.position.set(d[0] * k * .8, d[1] * k * .8, d[2] * k * .8); }); }
  if (ex){ setApart(ex.value / 100); ex.addEventListener('input', () => { ctl.autoRotate = false; setApart(ex.value / 100); }); }
  const rs = box.querySelector('[data-home]');
  if (rs) rs.addEventListener('click', () => { home(); if (ex){ ex.value = 0; setApart(0); } });

  box.classList.add('s3d-on');
}
