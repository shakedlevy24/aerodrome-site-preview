/* APEX LT film on a large curved screen. Falls back to the flat monitor if WebGL is not available. */
import * as THREE from './vendor/three.module.min.js';

const box = document.querySelector('.monitor'), video = box && box.querySelector('video');
if (box && video) try {
  const stage = box.querySelector('.screen');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement; cv.className = 'curve-canvas'; cv.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene(), R = 4, ARC = 1.15, H = R * ARC / (1280 / 672), PI = Math.PI;
  const arc = (r, h, a) => new THREE.CylinderGeometry(r, r, h, 96, 1, true, PI - a / 2, a);
  const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  scene.add(new THREE.Mesh(arc(R, H, ARC), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
  /* thin black bezel and silver aluminium shell (no stand) */
  function metal(w, h, stops){
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, w > h ? w : 0, w > h ? 0 : h); stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const silverH = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: metal(256, 4, [[0, '#8f959c'], [.18, '#e9ecef'], [.5, '#c3c8cd'], [.82, '#eef0f2'], [1, '#8f959c']]) });
  const silverV = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: metal(4, 128, [[0, '#eef0f2'], [.5, '#c9cdd2'], [1, '#9aa0a7']]) });
  scene.add(new THREE.Mesh(arc(R + .004, H + .07, ARC + .018), new THREE.MeshBasicMaterial({ color: 0x08090b, side: THREE.DoubleSide })));
  scene.add(new THREE.Mesh(arc(R + .012, H + .1, ARC + .026), silverH));

  const cam = new THREE.PerspectiveCamera(30, 2, .1, 50), CZ = 2.6, CY = 0;
  cam.position.set(0, CY, CZ); cam.lookAt(0, 0, -R);
  function fit(){
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    /* choose the field of view so the whole screen and its base fit */
    const ex = R * Math.sin(ARC / 2 + .016), ez = CZ + R * Math.cos(ARC / 2), top = H / 2 + .06, bot = H / 2 + .06;
    const vy = Math.max((top - CY) / ez, (bot + CY) / ez), vx = ex / ez / cam.aspect;
    cam.fov = 2 * Math.atan(Math.max(vy, vx)) * 180 / PI; cam.updateProjectionMatrix();
  }
  /* draw only when the film has a new picture, not on every screen refresh */
  const draw = () => renderer.render(scene, cam);
  let visible = true, raf = 0;
  const hasVfc = 'requestVideoFrameCallback' in video;
  function frame(){ raf = 0; draw(); if (visible && !hasVfc) raf = requestAnimationFrame(frame); }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  if (hasVfc){ const onPic = () => { if (visible) draw(); video.requestVideoFrameCallback(onPic); }; video.requestVideoFrameCallback(onPic); }
  stage.appendChild(cv); box.classList.add('curved');
  new ResizeObserver(() => { fit(); wake(); }).observe(stage);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(stage);
  fit(); wake();
} catch (e) { box.classList.remove('curved'); }
