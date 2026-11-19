(function(){

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* tracking: events go to window.dataLayer for the analytics tool */
  window.dataLayer = window.dataLayer || [];
  function track(ev, props){ var o = Object.assign({event: ev, page: current}, props || {}); window.dataLayer.push(o); }
  window.aeTrack = track;

  
  /* dropdowns: hover, focus, or click/Enter; Esc closes */
  document.querySelectorAll('.dd').forEach(function(dd){
    var b=dd.querySelector('button');
    b.addEventListener('click',function(){ var o=!dd.classList.contains('open'); dd.classList.remove('shut'); document.querySelectorAll('.dd.open').forEach(function(x){x.classList.remove('open');x.querySelector('button').setAttribute('aria-expanded','false');}); dd.classList.toggle('open',o); b.setAttribute('aria-expanded',o); });
    dd.addEventListener('mouseleave',function(){ dd.classList.remove('open','shut'); b.setAttribute('aria-expanded','false'); });
    dd.addEventListener('focusout',function(e){ if(!dd.contains(e.relatedTarget)){ dd.classList.remove('open'); b.setAttribute('aria-expanded','false'); } });
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ document.querySelectorAll('.dd.open').forEach(function(x){x.classList.remove('open');x.querySelector('button').setAttribute('aria-expanded','false');x.querySelector('button').focus();}); document.querySelectorAll('.dd:hover').forEach(function(x){x.classList.add('shut');}); if(!mnav.hidden) closeMenu(); } });

  /* mobile menu */
  var mnav=document.getElementById('mnav'), lastOpener=null;
  function closeMenu(){ mnav.hidden=true; document.body.style.overflow=''; document.querySelectorAll('[data-menu-open]').forEach(function(b){b.setAttribute('aria-expanded','false');}); if(lastOpener) lastOpener.focus(); }
  document.addEventListener('click',function(e){
    var o=e.target.closest('[data-menu-open]'); if(o){ lastOpener=o; mnav.hidden=false; o.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; mnav.querySelector('[data-menu-close]').focus(); return; }
    if(e.target.closest('[data-menu-close]')){ closeMenu(); return; }
    if(!mnav.hidden && e.target.closest('#mnav a')){ lastOpener=null; closeMenu(); }
    var t=e.target.closest('[data-track]'); if(t) track(t.dataset.track,{section:t.dataset.section||''});
  });

  mnav.addEventListener('keydown',function(e){ if(e.key!=='Tab') return; var f=mnav.querySelectorAll('a[href],button'), a=f[0], z=f[f.length-1];
    if(e.shiftKey && document.activeElement===a){ e.preventDefault(); z.focus(); } else if(!e.shiftKey && document.activeElement===z){ e.preventDefault(); a.focus(); } });

  /* one page per address: this file is loaded on every page */
  var ROOT = document.documentElement.getAttribute('data-root') || '';
  var pgEl = document.querySelector('.page'), current = pgEl ? pgEl.dataset.page : 'home';
  document.querySelectorAll('[data-nav]').forEach(function(a){ if(a.dataset.nav===current) a.setAttribute('aria-current','page'); });
  function route(){
    var h = location.hash.slice(1), target = h && h !== 'main' ? document.getElementById(h) : null;
    if(target){ setTimeout(function(){ target.scrollIntoView({behavior: reduce?'auto':'smooth'}); if(!target.matches('a[href],button,input,select,textarea,[tabindex]')) target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); },30); }
    document.querySelectorAll('video[data-auto]').forEach(function(v){ if(!v.dataset.userPaused && !reduce){ var p=v.play(); if(p&&p.catch)p.catch(function(){}); } else v.pause(); });
    window.dispatchEvent(new Event('scroll'));
  }
  addEventListener('hashchange',route);

  /* reveal: the pointer lights the photo; tap or Enter opens it fully */
  document.querySelectorAll('.reveal').forEach(function(r){
    r.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return; var b=r.getBoundingClientRect(); r.style.setProperty('--x',(e.clientX-b.left)+'px'); r.style.setProperty('--y',(e.clientY-b.top)+'px'); });
    r.addEventListener('pointerleave',function(){ r.style.setProperty('--x','-999px'); r.style.setProperty('--y','-999px'); });
    r.addEventListener('click',function(e){ if(r.tagName==='A' || (e.target.closest && e.target.closest('a,button,input,select,textarea'))) return; r.classList.toggle('open'); if(r.hasAttribute('aria-pressed')) r.setAttribute('aria-pressed', r.classList.contains('open')); });
    var im=r.querySelector('img');
    if(im && r.tagName!=='A' && !r.closest('a') && !r.querySelector('a,button,input,select,textarea')){ r.tabIndex=0; r.setAttribute('role','button'); r.setAttribute('aria-pressed','false'); var hn=r.querySelector('.hint'); r.setAttribute('aria-label',(hn?hn.textContent.trim():'Show photo')+': '+(im.alt||''));
      r.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); r.click(); } }); }
  });

  /* videos: pause buttons and play tracking */
  document.querySelectorAll('[data-video-btn]').forEach(function(b){
    var v=document.getElementById(b.dataset.videoBtn); if(!v) return;
    function show(paused){ b.setAttribute('aria-pressed', paused?'true':'false'); b.setAttribute('aria-label', paused?'Play background video':'Pause background video'); }
    b.addEventListener('click',function(){ if(v.paused){ delete v.dataset.userPaused; var p=v.play(); if(p&&p.catch)p.catch(function(){}); show(false); } else { v.dataset.userPaused='1'; v.pause(); show(true); } });
    if(reduce){ v.dataset.userPaused='1'; show(true); } else show(false);
  });
  /* with/for swap: runs once (5 s) when it comes into view */
  document.querySelectorAll('.wbox').forEach(function(w){
    if(!('IntersectionObserver' in window)){ w.classList.add('go'); return; }
    var o=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ w.classList.add('go'); o.disconnect(); } }); },{threshold:.6}); o.observe(w);
  });
  document.querySelectorAll('video').forEach(function(v){ v.addEventListener('play',function(){ if(!v.dataset.tracked){ v.dataset.tracked='1'; track('video_play',{video:v.id||''}); } }); });

  /* home hero: the footage pulls back into a frame as you scroll */
  var hero=document.getElementById('hhero'), frame=document.getElementById('hframe'), htitle=document.getElementById('htitle'), tick=false;
  function onScroll(){
    if(tick||!hero) return; tick=true;
    requestAnimationFrame(function(){ tick=false;
      if(current!=='home' || reduce || innerWidth<=700){ frame.style.clipPath=''; htitle.style.opacity=''; htitle.style.transform=''; return; }
      var p=Math.max(0,Math.min(1,-hero.getBoundingClientRect().top/Math.max(1,hero.offsetHeight-innerHeight)));
      var ins=p*Math.min(innerWidth*.06,64); frame.style.clipPath='inset('+(ins*1.2).toFixed(1)+'px '+ins.toFixed(1)+'px round '+(p*18).toFixed(1)+'px)';
      htitle.style.transform='translate3d(0,'+Math.round(-p*60)+'px,0)'; htitle.style.opacity=Math.max(0,1-p*1.2).toFixed(2);
    });
  }
  addEventListener('scroll',onScroll,{passive:true}); addEventListener('resize',onScroll);


  /* careers: open positions come from content.json (edited in the site editor) */
  window.AE_jobs=function(list){
    var ul=document.getElementById('careers-roles-list'), none=document.getElementById('careers-none'); if(!ul||!none) return;
    ul.textContent='';
    (list||[]).forEach(function(j){
      if(!j||!String(j.title||'').trim()) return;
      var li=document.createElement('li'); li.className='listrow'; li.style.padding='24px 0';
      var d=document.createElement('div'), h=document.createElement('h3'); h.className='s'; h.textContent=j.title; d.appendChild(h);
      if(j.team){ var p=document.createElement('p'); p.className='mono muted'; p.style.marginTop='8px'; p.textContent=j.team; d.appendChild(p); }
      if(j.desc){ var q=document.createElement('p'); q.className='job-desc'; q.textContent=j.desc; d.appendChild(q); }
      li.appendChild(d);
      if(j.location){ var t=document.createElement('span'); t.className='tag'; var sr=document.createElement('span'); sr.className='sr'; sr.textContent='Location: '; t.appendChild(sr); t.appendChild(document.createTextNode(j.location)); li.appendChild(t); }
      ul.appendChild(li);
    });
    var n=ul.children.length; ul.hidden=!n; none.hidden=!!n;
  };
  window.AE_jobs([]);
  /* "for" -> "with" swap, once, when it scrolls into view */
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var el=e.target; setTimeout(function(){ el.classList.add('done'); }, reduce?0:700); io.unobserve(el); } }); },{threshold:.8});
    document.querySelectorAll('.swap').forEach(function(s){ io.observe(s); });
  } else document.querySelectorAll('.swap').forEach(function(s){ s.classList.add('done'); });

  /* tabs: [data-tabs] holds buttons [data-tab=i] and panels [data-panel=i] */
  document.querySelectorAll('[data-tabs]').forEach(function(box){
    var btns=box.querySelectorAll('[data-tab]'), panels=box.querySelectorAll('[data-panel]');
    function sel(i){ btns.forEach(function(b){ b.setAttribute('aria-selected', b.dataset.tab===i?'true':'false'); b.tabIndex = b.dataset.tab===i?0:-1; }); panels.forEach(function(p){ p.hidden = p.dataset.panel!==i; }); }
    btns.forEach(function(b,k){ b.addEventListener('click',function(){ sel(b.dataset.tab); });
      b.addEventListener('keydown',function(e){ var n=null; if(e.key==='ArrowRight') n=btns[(k+1)%btns.length]; if(e.key==='ArrowLeft') n=btns[(k-1+btns.length)%btns.length]; if(n){ e.preventDefault(); n.focus(); sel(n.dataset.tab); } }); });
    sel(btns[0].dataset.tab);
  });

  /* filters: [data-filter] buttons with data-value, items [data-item] with data-value */
  document.querySelectorAll('[data-filter]').forEach(function(box){
    var target=document.getElementById(box.dataset.filter), btns=box.querySelectorAll('button');
    btns.forEach(function(b){ b.addEventListener('click',function(){ btns.forEach(function(x){ x.setAttribute('aria-pressed', x===b?'true':'false'); });
      var n=0; target.querySelectorAll('[data-item]').forEach(function(it){ it.hidden = !(b.dataset.value==='all' || it.dataset.value===b.dataset.value); if(!it.hidden) n++; });
      status.textContent = n ? n + (n===1?' role':' roles') + ' shown.' : 'No open roles in this team right now.'; }); });
    var status=document.createElement('p'); status.className='note'; status.setAttribute('role','status'); status.style.marginTop='16px'; target.insertAdjacentElement('afterend',status);
  });

  /* form errors appear only after the visitor has used a field; aria-invalid and the error text follow the same moment */
  var liveBox=null, liveTimer=0, liveSaid=[];
  function fTarget(el){ return el.type==='radio' ? (el.closest('fieldset')||el) : el; }
  function fUserInvalid(el){ try{ return el.matches(':user-invalid'); }catch(e){ return el.dataset.touched==='1' && !el.validity.valid; } }
  function fSync(el, bad, announce){
    var t=fTarget(el), id=t.getAttribute('data-error'), msg=id?document.getElementById(id):null;
    t.setAttribute('aria-invalid', bad?'true':'false');
    if(msg){ var ids=(t.getAttribute('aria-describedby')||'').split(/\s+/).filter(function(x){ return x && x!==id; }); if(bad) ids.push(id);
      if(ids.length) t.setAttribute('aria-describedby', ids.join(' ')); else t.removeAttribute('aria-describedby'); }
    var k=liveSaid.indexOf(t);
    if(!bad){ if(k>=0) liveSaid.splice(k,1); return; }
    if(announce && msg && k<0){ liveSaid.push(t);
      if(!liveBox){ liveBox=document.createElement('div'); liveBox.setAttribute('aria-live','polite'); liveBox.className='sr-only'; document.body.appendChild(liveBox); }
      clearTimeout(liveTimer); liveBox.textContent=''; liveTimer=setTimeout(function(){ liveBox.textContent=msg.textContent; },500); }
  }
  document.querySelectorAll('form[data-form]').forEach(function(f){
    function on(e, announce){ var el=e.target; if(!el.matches || !el.matches('input,select,textarea') || !el.required) return; if(e.type!=='input') el.dataset.touched='1'; fSync(el, fUserInvalid(el), announce); }
    f.addEventListener('focusout', function(e){ on(e,true); });
    f.addEventListener('change', function(e){ on(e,true); });
    f.addEventListener('input', function(e){ on(e,false); });
  });

  /* forms: [data-form] validates [required], shows [data-ok] on success */
  document.querySelectorAll('form[data-form]').forEach(function(f){
    var started=false;
    f.addEventListener('input',function(){ if(!started){ started=true; track('form_start',{form:f.dataset.form}); } });
    f.addEventListener('submit',function(e){ e.preventDefault();
      var bad=null; f.querySelectorAll('[required]').forEach(function(el){
        var ok = el.validity ? el.validity.valid : true; el.dataset.touched='1'; fSync(el, !ok, false); if(!ok && !bad) bad=el; });
      var err=f.querySelector('[data-err]');
      if(bad){ if(err) err.hidden=false; bad.focus(); return; }
      if(err) err.hidden=true;
      var iam=f.querySelector('input[name="iam"]:checked');
      track('form_submit',{form:f.dataset.form, i_am: iam?iam.value:''});
      var data={}; new FormData(f).forEach(function(v,k){ data[k]=String(v); });
      var btn=f.querySelector('button[type=submit]'), fail=f.querySelector('[data-fail]');
      if(fail) fail.hidden=true; if(btn){ btn.disabled=true; btn.dataset.label=btn.textContent; btn.textContent='Sending\u2026'; }
      fetch(ROOT+'api/contact.php',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'fetch'},body:JSON.stringify(data),credentials:'same-origin'})
        .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok||!j.ok) throw new Error(j.error||'send'); }); })
        .then(function(){ f.querySelector('.fields').hidden=true; var ok=f.querySelector('[data-ok]'); ok.hidden=false; ok.setAttribute('tabindex','-1'); ok.focus(); })
        .catch(function(){ if(fail){ fail.hidden=false; fail.focus(); } })
        .then(function(){ if(btn){ btn.disabled=false; btn.textContent=btn.dataset.label; } });
    });
  });

  /* IR documents */
  document.addEventListener('click',function(e){ var d=e.target.closest('[data-doc]'); if(d){ e.preventDefault(); track('ir_document_download',{doc:d.dataset.doc}); } });



  /* brand devices: solid header on scroll, scroll-lit words, reach line, why panels, precision cursor */
  var hdr=document.querySelector('.hdr'), words=document.getElementById('words'), ws=[];
  function escH(t){ return t.replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  function splitWords(){ if(!words) return;
    var cam=(words.dataset.cam||'').trim().split(/\s+/).filter(Boolean), toks=words.textContent.trim().split(/\s+/), ci=-1;
    for(var i=0; cam.length && i+cam.length<=toks.length; i++){ var ok=true; for(var j=0;j<cam.length;j++){ if(toks[i+j]!==cam[j]){ ok=false; break; } } if(ok){ ci=i; break; } }
    words.innerHTML=toks.map(function(w,k){ return '<span class="w'+(ci>=0&&k>=ci&&k<ci+cam.length?' cam':'')+'">'+escH(w)+'</span>'; }).join(' ');
    ws=[].slice.call(words.querySelectorAll('.w')); }
  splitWords();
  var reach=document.getElementById('reach'), rlsolid=document.getElementById('rlsolid'), rldash=document.getElementById('rldash'), rlhead=document.getElementById('rlhead'), km=document.getElementById('km'), m1=document.getElementById('m1'), m2=document.getElementById('m2');
  function c01(v){ return Math.max(0,Math.min(1,v)); }
  var btick=false;
  function brand(){ if(btick) return; btick=true; requestAnimationFrame(function(){ btick=false; var vh=innerHeight;
    if(hdr) hdr.classList.toggle('solid', scrollY>40);
    if(current!=='home') return;
    if(words){ ws=[].slice.call(words.querySelectorAll('.w')); var wr=words.getBoundingClientRect(), wp=reduce?1:c01((vh*.85-wr.top)/(wr.height+vh*.35)), n=Math.round(wp*ws.length); ws.forEach(function(w,i){ w.classList.toggle('on',i<n); }); }
    if(reach){ var rr=reach.getBoundingClientRect(), rp=reduce?1:c01(-rr.top/Math.max(1,reach.offsetHeight-vh)), a=c01(rp/.55), b=c01((rp-.6)/.35);
      rlsolid.style.width=(a*50)+'%'; rldash.style.width=(b*50)+'%'; rlhead.style.left=(a<1?a*50:50+b*50)+'%'; if(km) km.textContent=Math.round(a*(+reach.dataset.km||500));
      m1.classList.toggle('on',a>=1); m2.classList.toggle('on',b>.85); }
  }); }
  addEventListener('scroll',brand,{passive:true}); addEventListener('resize',brand);
  window.AE_words=function(){ splitWords(); brand(); };

  var panels=[].slice.call(document.querySelectorAll('.panel'));
  function actPanel(p){ panels.forEach(function(x){ var on=x===p; x.classList.toggle('on',on); x.setAttribute('aria-expanded',on?'true':'false'); }); }
  panels.forEach(function(p){ p.addEventListener('mouseenter',function(){ actPanel(p); }); p.addEventListener('focus',function(){ actPanel(p); }); p.addEventListener('click',function(){ actPanel(p); }); });

  var capsEl=document.getElementById('caps'), ret=document.getElementById('reticle'), rlab=document.getElementById('rlabel');
  document.querySelectorAll('.cap').forEach(function(c){ c.addEventListener('mousemove',function(e){ var r=c.getBoundingClientRect(); c.style.setProperty('--cx',(e.clientX-r.left)+'px'); c.style.setProperty('--cy',(e.clientY-r.top)+'px'); }); });
  if(capsEl && ret && !reduce && !/[?&]edit=1/.test(location.search) && window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches){
    var mx=0,my=0,rx=0,ry=0,rw=44,rh=44,rtarget=null,rraf=null; capsEl.classList.add('cursor-on');
    function rloop(){ var tx,ty,tw,th; if(rtarget){ var r=rtarget.getBoundingClientRect(); tx=r.left-8; ty=r.top-8; tw=r.width+16; th=r.height+16; } else { tw=44; th=44; tx=mx-22; ty=my-22; }
      rx+=(tx-rx)*.22; ry+=(ty-ry)*.22; rw+=(tw-rw)*.22; rh+=(th-rh)*.22; ret.style.transform='translate('+rx.toFixed(1)+'px,'+ry.toFixed(1)+'px)'; ret.style.width=rw.toFixed(1)+'px'; ret.style.height=rh.toFixed(1)+'px'; rraf=requestAnimationFrame(rloop); }
    capsEl.addEventListener('mouseenter',function(e){ mx=rx=e.clientX; my=ry=e.clientY; ret.classList.add('show'); if(!rraf) rloop(); });
    capsEl.addEventListener('mouseleave',function(){ ret.classList.remove('show'); cancelAnimationFrame(rraf); rraf=null; rtarget=null; ret.classList.remove('lock'); });
    capsEl.addEventListener('mousemove',function(e){ mx=e.clientX; my=e.clientY; var c=e.target.closest('.cap'); if(c!==rtarget){ rtarget=c; ret.classList.toggle('lock',!!c); rlab.textContent=c?('LOCKED · '+c.dataset.lock.toUpperCase()):''; } });
  }

  /* depth effects (mouse and scroll); off for reduced motion and inside the site editor */
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  var editing = /[?&]edit=1/.test(location.search);
  if(!reduce && !editing){
    if(false){
      document.querySelectorAll('.card,.media-card,.linkcard,.shot').forEach(function(c){
        if(c.querySelector('input,select,textarea,[role=tablist],.reveal')) return;
        c.classList.add('tilt');
        c.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return;
          var b=c.getBoundingClientRect(), x=(e.clientX-b.left)/b.width, y=(e.clientY-b.top)/b.height, m=b.width>700?2:5.5;
          c.classList.add('live');
          c.style.setProperty('--ry',((x-.5)*2*m).toFixed(2)+'deg'); c.style.setProperty('--rx',((.5-y)*2*m).toFixed(2)+'deg');
          c.style.setProperty('--gx',(x*100).toFixed(1)+'%'); c.style.setProperty('--gy',(y*100).toFixed(1)+'%'); });
        c.addEventListener('pointerleave',function(){ c.classList.remove('live'); c.style.setProperty('--rx','0deg'); c.style.setProperty('--ry','0deg'); });
      });
      document.querySelectorAll('.reveal,.hhero .stick').forEach(function(r){
        var t=r.classList.contains('reveal')?r:r.querySelector('video');
        r.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return; var b=r.getBoundingClientRect();
          t.style.setProperty('--px',((.5-(e.clientX-b.left)/b.width)*5).toFixed(2)); t.style.setProperty('--py',((.5-(e.clientY-b.top)/b.height)*3).toFixed(2)); });
        r.addEventListener('pointerleave',function(){ t.style.setProperty('--px','0'); t.style.setProperty('--py','0'); });
      });
    }
    var ptick=false;
    function parallax(){ if(ptick) return; ptick=true; requestAnimationFrame(function(){ ptick=false; var vh=innerHeight;
      document.querySelectorAll('.page.on .reveal').forEach(function(r){ var b=r.getBoundingClientRect(); if(b.bottom<0||b.top>vh) return;
        var p=Math.max(-1,Math.min(1,(b.top+b.height/2-vh/2)/vh)); r.style.setProperty('--sy',(p*-2.4).toFixed(2)); }); }); }

    if('IntersectionObserver' in window){
      var rio=new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return; var el=e.target; rio.unobserve(el);
        var d=(el.dataset.ri||0)*90; el.style.transitionDelay=d+'ms'; el.classList.add('seen'); setTimeout(function(){ el.style.transitionDelay=''; },d+1000); }); },{threshold:.1});
      document.querySelectorAll('.page').forEach(function(pg){ pg.querySelectorAll('.card,.media-card,.pt,.linkcard,.step,.shot,.cap,.human,.tile-about,.tile-careers,.formcard').forEach(function(el){
        if(el.closest('.rise')) return; var sib=el.parentElement?Array.prototype.indexOf.call(el.parentElement.children,el):0;
        el.dataset.ri=Math.min(sib,5); el.classList.add('rise'); rio.observe(el); }); });
    }
  }

  route();
})();
