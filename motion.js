/* Motion layer for adnanbinsayeed: intro hand-off, scroll depth, reveals, nav pill, theme reveal. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paused = () => root.classList.contains('paused');
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ---- theme switch: circle grows from the button (View Transitions) ---- */
  window.__vt = (btn, apply) => {
    if (reduced || paused() || !document.startViewTransition) return apply();
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  };

  /* ---- intro: start the hero once the preloader opens ---- */
  const pre = $('#pre');
  const go = () => root.classList.add('mo-go');
  if (!root.classList.contains('mo-intro')) go();
  else if (!pre) go();
  else {
    if (pre.classList.contains('done')) setTimeout(go, 250);
    else new MutationObserver((m, o) => { if (pre.classList.contains('done')) { o.disconnect(); setTimeout(go, 250); } })
      .observe(pre, { attributes: true, attributeFilter: ['class'] });
  }

  if (reduced) return;

  /* ---- scroll: hero depth, marquee lean, nav pill ---- */
  const hero = $('.hero'), htext = $('.hero .htext'), hcal = $('.hcal');
  const land = [...document.querySelectorAll('.land path')];
  const mwrap = $('.mwrap');
  let lastY = scrollY, vel = 0, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    vel = vel * 0.8 + (y - lastY) * 0.2; lastY = y;
    if (paused()) { htext && htext.style.removeProperty('--sy1'); return; }
    const h = hero ? hero.offsetHeight : 800;
    if (y < h * 1.1) {
      const k = Math.min(1, y / h);
      if (htext) { htext.style.setProperty('--sy1', (y * 0.28).toFixed(1) + 'px'); htext.style.setProperty('--so', (1 - k * 0.9).toFixed(3)); }
      land.forEach((p, i) => { p.style.transform = `translateY(${(y * (0.04 + i * 0.035)).toFixed(1)}px)`; });
      if (hcal) hcal.style.setProperty('--sx', (y * (root.dir === 'rtl' ? 0.35 : -0.35)).toFixed(1) + 'px');
    }
    if (mwrap) mwrap.style.setProperty('--skew', Math.max(-12, Math.min(12, vel * 0.35)).toFixed(2) + 'deg');
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  // let the marquee settle back when scrolling stops
  setInterval(() => { if (Math.abs(vel) > 0.05) { vel *= 0.6; if (mwrap) mwrap.style.setProperty('--skew', (vel * 0.35).toFixed(2) + 'deg'); } }, 120);

  /* ---- nav: one pill slides to the active link ---- */
  const links = $('.links');
  if (links) {
    const ind = document.createElement('span'); ind.className = 'ind'; ind.setAttribute('aria-hidden', 'true');
    links.prepend(ind); links.classList.add('has-ind');
    const place = () => {
      const a = links.querySelector('a.on');
      if (!a) { ind.style.opacity = 0; return; }
      const lr = links.getBoundingClientRect(), r = a.getBoundingClientRect();
      ind.style.width = r.width + 'px'; ind.style.transform = `translateX(${r.left - lr.left}px)`; ind.style.opacity = 1;
    };
    new MutationObserver(place).observe(links, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true, characterData: true });
    addEventListener('resize', place); setTimeout(place, 400); document.fonts && document.fonts.ready.then(place);
  }

  /* ---- headings: words rise one by one when they come into view ---- */
  const splitWords = el => {
    const text = el.textContent;
    if (!text.trim() || el.children.length) return null;
    el.textContent = '';
    text.split(/(\s+)/).forEach((w, i) => {
      if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(w)); return; }
      const s = document.createElement('span'); s.className = 'wr'; s.textContent = w; el.appendChild(s);
    });
    return text;
  };
  const heads = $$('section h2, .shead .kicker, .contact h2');
  const ioH = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; ioH.unobserve(el);
    if (paused()) return;
    const original = splitWords(el);
    if (original == null) return;
    const ws = [...el.querySelectorAll('.wr')];
    requestAnimationFrame(() => ws.forEach((w, i) => { w.style.transitionDelay = (i * 70) + 'ms'; requestAnimationFrame(() => w.classList.add('on')); }));
    // put the plain text back so language switching keeps working
    setTimeout(() => { if (el.querySelector('.wr')) el.textContent = el.textContent; }, 900 + ws.length * 70 + 400);
  }), { threshold: 0.35 });
  heads.forEach(h => { if (h.getBoundingClientRect().top > innerHeight * 0.9) ioH.observe(h); });

  /* ---- photos: wipe up into view ---- */
  const ioP = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; ioP.unobserve(el);
    el.classList.add('on');
    setTimeout(() => el.classList.remove('wipe', 'on'), 1700);
  }), { threshold: 0.2 });
  const armPhotos = () => $$('.ath img, .gitem img, .card.cov .cv > svg, .card.cov .cv > img, .feat .pic > svg').forEach(el => {
    if (el.dataset.wiped) return; el.dataset.wiped = 1;
    if (paused() || el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add('wipe'); ioP.observe(el);
  });
  armPhotos();
  // project cards and awards can be redrawn later (saved content, filters)
  ['#projGrid', '#awGrid', '#gal'].forEach(sel => { const g = $(sel); if (g) new MutationObserver(armPhotos).observe(g, { childList: true }); });

  /* ---- project covers lean toward the pointer ---- */
  if (matchMedia('(pointer: fine)').matches) {
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.card.cov'); if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--tx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      c.style.setProperty('--ty', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    }, { passive: true });
  }
})();
