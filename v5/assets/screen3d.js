/* APEX LT film on a large curved screen. Falls back to the flat monitor if WebGL is not available. */
import * as THREE from './vendor/three.module.min.js';

const box = document.querySelector('.monitor'), video = box && box.querySelector('video');
if (box && video) try {
  const stage = box.querySelector('.screen');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement; cv.className = 'curve-canvas'; cv.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene(), R = 4, ARC = 1.15, H = R * ARC / (1280 / 672), PI = Math.PI;
  const arc = (r, h, a) => new THREE.CylinderGeometry(r, r, h, 96, 1, true, PI - a / 2, a);
  const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  scene.add(new THREE.Mesh(arc(R, H, ARC), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
  /* bezel, back shell, glass highlight, stand and base */
  const dark = c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(arc(R + .004, H + .1, ARC + .026), dark(0x14181d)));
  scene.add(new THREE.Mesh(arc(R + .012, H + .12, ARC + .032), dark(0x2a3038)));
  const led = new THREE.Mesh(new THREE.CircleGeometry(.012, 16), new THREE.MeshBasicMaterial({ color: 0xf28c28 }));
  led.position.set(0, -H / 2 - .028, -R + .002); scene.add(led);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(.34, .5, .08), dark(0x1a1e24)); neck.position.set(0, -H / 2 - .28, -R - .12); scene.add(neck);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.75, .8, .035, 48), dark(0x20252c)); base.position.set(0, -H / 2 - .54, -R + .1); base.scale.z = .5; scene.add(base);

  const cam = new THREE.PerspectiveCamera(30, 2, .1, 50), CZ = 2.6, CY = .18;
  cam.position.set(0, CY, CZ); cam.lookAt(0, -.2, -R);
  function fit(){
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    /* choose the field of view so the whole screen and its base fit */
    const ex = R * Math.sin(ARC / 2) * 1.03, ez = CZ + R * Math.cos(ARC / 2), top = H / 2 + .12, bot = H / 2 + .62;
    const vy = Math.max((top - CY) / ez, (bot + CY) / (CZ + R)) * .8, vx = ex / ez / cam.aspect * 1.02;
    cam.fov = 2 * Math.atan(Math.max(vy, vx)) * 180 / PI; cam.updateProjectionMatrix();
  }
  let visible = true, raf = 0;
  function frame(){ raf = 0; renderer.render(scene, cam); if (visible) raf = requestAnimationFrame(frame); }
  const wake = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  stage.appendChild(cv); box.classList.add('curved');
  new ResizeObserver(() => { fit(); wake(); }).observe(stage);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(stage);
  fit(); wake();
} catch (e) { box.classList.remove('curved'); }
