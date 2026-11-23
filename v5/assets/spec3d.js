/* Aerodrome 3D specification viewer. Loaded only when a [data-s3d] block scrolls into view. */
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const LOOK = {
  fuselage: { color: 0xc9ced3, skin: true },  nose: { color: 0xd6dade, skin: true },
  wings: { color: 0xc3c8cd, skin: true },     winglets: { color: 0xd6dade, skin: true },
  hatches: { color: 0xaeb4ba, skin: true },   structure: { color: 0x5d6770 },
  payload: { color: 0xf28c28 },               avionics: { color: 0xff9a4d }
};
/* direction each section moves when the model is taken apart (model axes: x aft, y left, z up) */
const APART = {
  fuselage: [0, 0, .42], nose: [-.5, 0, 0], 'wings:l': [0, .4, 0], 'wings:r': [0, -.4, 0],
  'winglets:l': [.1, .65, 0], 'winglets:r': [.1, -.65, 0], hatches: [0, 0, .75],
  structure: [0, 0, 0], payload: [0, 0, -.42], avionics: [.2, 0, -.42]
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

  const ctl = new OrbitControls(cam, cv);
  ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false;
  ctl.minDistance = 2.2; ctl.maxDistance = 11; ctl.enableZoom = false; ctl.autoRotate = !reduce; ctl.autoRotateSpeed = .7;
  const home = () => { cam.position.set(-3.3, 1.9, 3.9); ctl.target.set(0, 0, 0); ctl.update(); };
  home();
  ctl.addEventListener('start', () => { ctl.autoRotate = false; box.classList.add('s3d-used'); });

  let visible = true, raf = 0;
  function fit(){
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < 1.25 ? 40 : 28; cam.updateProjectionMatrix();
  }
  function frame(){ raf = 0; ctl.update(); renderer.render(scene, cam); if (visible) raf = requestAnimationFrame(frame); }
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
  function setApart(k){ Object.values(groups).forEach(n => { const d = APART[n.userData.id] || [0, 0, 0]; n.position.set(d[0] * k * .8, d[1] * k * .8, d[2] * k * .8); }); }
  if (ex){ setApart(ex.value / 100); ex.addEventListener('input', () => { ctl.autoRotate = false; setApart(ex.value / 100); }); }
  const rs = box.querySelector('[data-home]');
  if (rs) rs.addEventListener('click', () => { home(); if (ex){ ex.value = 0; setApart(0); } });

  box.classList.add('s3d-on');
}
