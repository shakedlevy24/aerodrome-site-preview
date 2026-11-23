/* Aerodrome site content runtime.
   Live site: loads content.json (saved by the site editor) and applies text and media changes.
   Editor (?edit=1 inside /admin/): makes text editable in place and pictures replaceable. */
(function(){
  var EDIT = /[?&]edit=1/.test(location.search) && window.parent !== window;
  var root = document.documentElement, ROOT = root.getAttribute('data-root') || '';
  var PAGES = [{"id": "home", "title": "Home", "path": ""}, {"id": "phoenix-lt", "title": "Phoenix LT", "path": "phoenix-lt/"}, {"id": "apex-lt", "title": "APEX LT", "path": "apex-lt/"}, {"id": "aerial-services", "title": "Aerial Services", "path": "aerial-services/"}, {"id": "about", "title": "About Us", "path": "about/"}, {"id": "management", "title": "Management", "path": "management/"}, {"id": "careers", "title": "Careers", "path": "careers/"}, {"id": "contact", "title": "Contact Us", "path": "contact/"}, {"id": "faq", "title": "FAQ", "path": "faq/"}, {"id": "accessibility", "title": "Accessibility Statement", "path": "accessibility/"}, {"id": "privacy", "title": "Privacy Policy", "path": "privacy/"}, {"id": "terms", "title": "Terms of Use", "path": "terms/"}, {"id": "disclaimers", "title": "Disclaimers", "path": "disclaimers/"}];
  function rel(src){ return ROOT && src.indexOf(ROOT) === 0 ? src.slice(ROOT.length) : src; }
  var INLINE = {B:1, STRONG:1, EM:1, I:1, BR:1, SMALL:1};
  var SKIP = 'script,style,svg,select,option,textarea,noscript,video,.sr,.swap,.wbox,#careers-roles-list,.hint,.rl-count,.reticle';
  var T = {}, M = {}, order = [];

  function norm(s){ return (s || '').replace(/\s+/g, ' ').trim(); }
  function inlineOk(el){ return INLINE[el.tagName] || (el.tagName === 'SPAN' && ((el.classList.contains('ph') && el.attributes.length === 1) || el.classList.contains('w'))); }
  function okKids(el){
    for (var c = el.firstChild; c; c = c.nextSibling){
      if (c.nodeType === 3 || c.nodeType === 8) continue;
      if (c.nodeType !== 1 || !inlineOk(c) || !okKids(c)) return false;
    }
    return true;
  }
  function scopes(){
    var s = [], h = document.querySelector('.hdr'), m = document.getElementById('mnav'), f = document.querySelector('footer');
    if (h) s.push(['header', h]); if (m) s.push(['menu', m]);
    document.querySelectorAll('.page').forEach(function(p){ s.push([p.dataset.page, p]); });
    if (f) s.push(['footer', f]);
    return s;
  }

  /* give every piece of text and every picture a stable key: <scope>:t<n> / <scope>:m<n> */
  function index(){
    scopes().forEach(function(sc){
      var name = sc[0], box = sc[1], leaves = [], seen = [];
      var w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, { acceptNode: function(t){
        if (!t.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = t.parentElement; if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT; } });
      var nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach(function(t){
        var p = t.parentElement;
        while (p !== box && inlineOk(p) && p.parentElement && p.parentElement !== box && okKids(p.parentElement)) p = p.parentElement;
        var leaf;
        if (p !== box && okKids(p)) leaf = p;
        else { leaf = document.createElement('span'); t.parentNode.insertBefore(leaf, t); leaf.appendChild(t); }
        if (seen.indexOf(leaf) < 0){ seen.push(leaf); leaves.push(leaf); }
      });
      leaves.forEach(function(el, i){
        var k = name + ':t' + i; el.setAttribute('data-ek', k);
        T[k] = { el: el, orig: norm(el.textContent), scope: name }; order.push(k);
      });
      box.querySelectorAll('img,video').forEach(function(el, i){
        var k = name + ':m' + i; el.setAttribute('data-em', k);
        M[k] = { el: el, orig: rel(el.getAttribute('src') || ''), alt: el.tagName === 'IMG' ? (el.getAttribute('alt') || '') : (el.getAttribute('aria-label') || ''), scope: name, kind: el.tagName === 'VIDEO' ? 'video' : 'image' };
      });
    });
  }

  function findT(k, o){
    var e = T[k]; if (e && e.orig === o.orig) return e;
    var sc = k.split(':')[0];
    for (var x in T) if (T[x].scope === sc && T[x].orig === o.orig) return T[x];
    return null;
  }
  function findM(k, o){
    var e = M[k]; if (e && e.orig === o.orig) return e;
    var sc = k.split(':')[0];
    for (var x in M) if (M[x].scope === sc && M[x].orig === o.orig) return M[x];
    return null;
  }
  function resolve(src){ return /^(https?:|data:|blob:|\/)/.test(src) ? src : ROOT + src; }
  function setText(e, text){ e.el.textContent = text; if (e.el.id === 'words' && window.AE_words) window.AE_words(); mark(e); }
  function mark(e){ if (EDIT) e.el.classList.toggle('ae-ch', norm(e.el.textContent) !== e.orig); }
  function setMedia(e, src, alt){
    var el = e.el;
    if (src && el.getAttribute('src') !== resolve(src)){
      el.src = resolve(src);
      if (el.tagName === 'VIDEO'){ el.removeAttribute('poster'); el.load(); var p = el.play && el.play(); if (p && p.catch) p.catch(function(){}); }
    }
    if (alt != null){ if (el.tagName === 'IMG') el.alt = alt; else el.setAttribute('aria-label', alt); }
  }
  /* pages switched off in the editor: their links disappear, and a visitor who opens one is sent to the home page */
  var hiddenPages = [];
  function hrefOf(id){ for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return (ROOT + PAGES[i].path) || './'; return '#none'; }
  function curPage(){ var p = document.querySelector('.page'); return p ? p.dataset.page : 'home'; }
  function leave(){ var m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m); location.replace(new URL(ROOT || './', document.baseURI).href); }
  function setHidden(list){
    hiddenPages = (list || []).filter(function(id){ return id !== 'home'; });
    document.querySelectorAll('a[data-hid]').forEach(function(a){ var box = a.parentNode.tagName === 'LI' ? a.parentNode : a; box.hidden = false; a.removeAttribute('data-hid'); });
    hiddenPages.forEach(function(id){
      var h = hrefOf(id);
      document.querySelectorAll('a[href]').forEach(function(a){
        var href = a.getAttribute('href');
        if (h.charAt(0) === '#' ? href !== h : href.split('#')[0].split('?')[0] !== h) return;
        a.setAttribute('data-hid', '1');
        (a.parentNode.tagName === 'LI' ? a.parentNode : a).hidden = true;
      });
    });
    if (!EDIT && hiddenPages.indexOf(curPage()) >= 0) leave();
  }
  addEventListener('hashchange', function(){ if (!EDIT && hiddenPages.indexOf(curPage()) >= 0) leave(); });

  function apply(c){
    c = c || {}; var t = c.text || {}, m = c.media || {};
    Object.keys(t).forEach(function(k){ var e = findT(k, t[k]); if (e) setText(e, t[k].text); });
    Object.keys(m).forEach(function(k){ var e = findM(k, m[k]); if (e) setMedia(e, m[k].src, m[k].alt); });
    if (window.AE_jobs) window.AE_jobs(c.jobs || []);
    setHidden(c.hidden || []);
  }
  function show(){ root.classList.remove('cl'); }

  index();

  if (!EDIT){
    if (/^https?:/.test(location.protocol)){
      fetch(ROOT + 'content.json?v=' + Date.now(), { cache: 'no-store' })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(apply).catch(function(){}).then(show);
    } else show();
    return;
  }

  /* ---------- editor mode ---------- */
  var cb = {};
  function enable(){
    root.classList.add('ae-edit');
    order.forEach(function(k){
      var el = T[k].el;
      try { el.contentEditable = 'plaintext-only'; } catch (_) {}
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.addEventListener('input', function(){ mark(T[k]); cb.text && cb.text(k, T[k].orig, norm(el.textContent), T[k].scope); });
    });
    document.addEventListener('keydown', function(e){
      var el = e.target.closest && e.target.closest('[data-ek]'); if (!el) return;
      if (e.key === 'Enter'){ e.preventDefault(); el.blur(); }
      else if (e.key === ' ' && el.closest('a,button')){ e.preventDefault(); document.execCommand('insertText', false, ' '); }
    }, true);
    document.addEventListener('paste', function(e){
      var el = e.target.closest && e.target.closest('[data-ek]'); if (!el) return;
      e.preventDefault(); var s = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, s);
    }, true);
    function mediaAt(e){
      var hit = e.target.closest && e.target.closest('[data-em]'); if (hit) return hit;
      if (e.target.closest && e.target.closest('[data-ek],input,label,select,textarea,form,.hdr,.mnav,footer')) return null;
      var all = document.elementsFromPoint(e.clientX, e.clientY);
      for (var i = 0; i < all.length; i++) if (all[i].hasAttribute && all[i].hasAttribute('data-em')) return all[i];
      return null;
    }
    document.addEventListener('click', function(e){
      var m = mediaAt(e);
      if (m){ e.preventDefault(); e.stopPropagation(); var k = m.getAttribute('data-em'), d = M[k];
        cb.pick && cb.pick(k, { orig: d.orig, current: m.currentSrc || m.src, alt: d.el.tagName === 'IMG' ? d.el.alt : (d.el.getAttribute('aria-label') || ''), kind: d.kind, scope: d.scope });
        return; }
      var a = e.target.closest && e.target.closest('a[href]'); if (a) e.preventDefault();
    }, true);
    var hl = null, raf = false;
    document.addEventListener('mousemove', function(e){
      if (raf) return; raf = true;
      requestAnimationFrame(function(){ raf = false; var m = mediaAt(e); var box = m ? (m.closest('.reveal,.frame,.shot,.apex-shot,.panel,.cap,.band,.ill figure') || m) : null;
        if (box !== hl){ if (hl) hl.classList.remove('ae-mhl'); hl = box; if (hl) hl.classList.add('ae-mhl'); } });
    });
    var st = document.createElement('style');
    st.textContent =
      '.ae-edit [data-ek]{outline:1px dashed transparent;outline-offset:3px;cursor:text;border-radius:2px}' +
      '.ae-edit [data-ek]:hover{outline-color:rgba(255,122,26,.6)}' +
      '.ae-edit [data-ek].ae-ch{outline:1px solid rgba(233,201,143,.85)}' +
      '.ae-edit [data-ek]:focus{outline:2px solid #FF7A1A;outline-offset:3px}' +
      '.ae-edit .veil,.ae-edit .hint{display:none!important}' +
      '.ae-edit .grad,.ae-edit .shade{pointer-events:none}' +
      '.ae-edit .reveal{cursor:pointer}' +
      '.ae-edit .ae-mhl{position:relative;box-shadow:inset 0 0 0 3px #FF7A1A}' +
      '.ae-edit .ae-mhl::after{content:"Click to replace";position:absolute;right:12px;top:12px;z-index:5;background:#FF7A1A;color:#140700;font:600 12px/1 Geist,Arial,sans-serif;padding:8px 10px;border-radius:6px;pointer-events:none}';
    document.head.appendChild(st);
  }

  window.AE = {
    start: function(content, callbacks){ cb = callbacks || {}; apply(content); enable(); show(); },
    apply: apply,
    setJobs: function(list){ if (window.AE_jobs) window.AE_jobs(list || []); },
    setHidden: function(list){ setHidden(list || []); },
    setText: function(k, text){ if (T[k]) setText(T[k], text); },
    setMedia: function(k, src, alt){ if (M[k]){ var el = M[k].el; if (/^data:|^blob:/.test(src)) { el.src = src; if (el.tagName === 'VIDEO'){ el.removeAttribute('poster'); el.load(); var p = el.play(); if (p && p.catch) p.catch(function(){}); } if (alt != null){ if (el.tagName === 'IMG') el.alt = alt; else el.setAttribute('aria-label', alt); } } else setMedia(M[k], src, alt); } },
    origText: function(k){ return T[k] ? T[k].orig : null; },
    origMedia: function(k){ return M[k] ? M[k].orig : null; },
    pages: function(){ return PAGES.slice(); },
    go: function(id){ for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id){ location.href = new URL(ROOT + PAGES[i].path + '?edit=1', document.baseURI).href; return; } },
    current: function(){ var p = document.querySelector('.page'); return p ? p.dataset.page : 'home'; }
  };
  try { if (window.parent.AE_READY) window.parent.AE_READY(window.AE); } catch (_) {}
})();
