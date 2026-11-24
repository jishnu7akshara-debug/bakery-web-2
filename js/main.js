/* Atta & Oven — interactions (no dependencies) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const istNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const fmt = h => {
    const hr = Math.floor(h), m = Math.round((h - hr) * 60);
    const ap = hr >= 12 ? 'pm' : 'am', h12 = ((hr + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };
  const fmtShort = h => fmt(h).replace(' am', '').replace(' pm', '');

  /* ---------- Loader ---------- */
  document.body.classList.add('is-loading');
  const minTime = new Promise(r => setTimeout(r, reduced ? 0 : 1300));
  const heroReady = new Promise(r => {
    const v = $('.hero video');
    if (!v || v.readyState >= 2) return r();
    v.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 3500);
  });
  Promise.all([minTime, heroReady]).then(() => {
    $('.loader').classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
  });

  /* ---------- Nav ---------- */
  const nav = $('[data-nav]'), toggle = $('.nav-toggle'), mobile = $('#mobile-menu');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    mobile.hidden = open;
  });
  $$('#mobile-menu a').forEach(a => a.addEventListener('click', () => { toggle.setAttribute('aria-expanded', 'false'); mobile.hidden = true; }));
  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 30), { passive: true });

  /* ---------- Live bake board ---------- */
  // t = time the tray comes out (24h decimal), shelf = hours it usually lasts
  const BATCHES = [
    { name: 'Country sourdough', t: 7.0,  shelf: 5 },
    { name: 'Butter croissants', t: 7.5,  shelf: 2.5 },
    { name: 'Cardamom buns',     t: 9.0,  shelf: 3 },
    { name: 'Banana bread',      t: 11.0, shelf: 4 },
    { name: 'Soft milk pav',     t: 12.5, shelf: 4 },
    { name: 'Rosemary focaccia', t: 16.0, shelf: 2.5 },
    { name: 'Cinnamon rolls',    t: 18.0, shelf: 2.5 },
    { name: 'Brown butter cookies', t: 19.5, shelf: 1.5 }
  ];
  const OVEN_LEAD = 0.75; // shown as "in the oven" for the last 45 minutes
  const list = $('[data-batches]'), clock = $('[data-clock]'), foot = $('[data-board-foot]');
  const renderBoard = () => {
    if (!list || !clock || !foot) return;
    const now = istNow(), t = now.getHours() + now.getMinutes() / 60;
    clock.textContent = fmt(t);
    let next = null;
    list.innerHTML = BATCHES.map(b => {
      let tag, cls = '', label;
      if (t >= b.t && t < b.t + b.shelf) {
        const left = b.t + b.shelf - t;
        tag = 'out'; label = left < 0.75 ? 'Last few' : 'Out now';
      } else if (t >= b.t - OVEN_LEAD && t < b.t) {
        tag = 'oven'; label = `Out in ${Math.max(1, Math.round((b.t - t) * 60))} min`;
        if (!next) next = b;
      } else if (t < b.t) {
        tag = 'later'; label = 'Later'; if (!next) next = b;
      } else {
        tag = 'gone'; label = 'Sold out'; cls = 'is-gone';
      }
      return `<li class="${cls}"><time>${fmtShort(b.t)}</time><span class="name">${b.name}</span><span class="tag ${tag}">${label}</span></li>`;
    }).join('');
    foot.textContent = next
      ? `Next out: ${next.name.toLowerCase()} at ${fmt(next.t)}. We bake small, so favourites go fast.`
      : 'That’s the last tray for today. The first sourdough is out at 7:00 am tomorrow.';
  };
  renderBoard(); setInterval(renderBoard, 30000);

  /* ---------- Open / closed + morning box cutoff ---------- */
  const renderOpen = () => {
    const now = istNow(), d = now.getDay(), t = now.getHours() + now.getMinutes() / 60;
    const close = (d === 0 || d === 6) ? 22 : 21;
    const el = $('[data-open]');
    const open = t >= 7 && t < close;
    el.classList.toggle('is-closed', !open);
    el.textContent = open ? `Open now, until ${fmt(close)}` : (t < 7 ? 'Closed, opens at 7:00 am' : 'Closed, opens tomorrow at 7:00 am');
    const cut = $('[data-cutoff]');
    if (t < 21) {
      const mins = Math.round((21 - t) * 60), h = Math.floor(mins / 60), m = mins % 60;
      cut.textContent = `${h ? h + ' hr ' : ''}${m} min left to order for tomorrow morning.`;
    } else cut.textContent = 'Orders for tomorrow are closed. Order now for the day after.';
  };
  renderOpen(); setInterval(renderOpen, 30000);

  /* ---------- Flour dust over the hero video ---------- */
  const cv = $('[data-flour]');
  if (cv && !reduced) {
    const ctx = cv.getContext('2d');
    let W, H, parts = [], running = true;
    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (y) => ({ x: Math.random() * W, y: y ?? -10, r: Math.random() * 1.8 + .4, vy: Math.random() * .35 + .12, vx: (Math.random() - .5) * .25, a: Math.random() * .5 + .25, ph: Math.random() * 6.28 });
    size(); parts = Array.from({ length: 70 }, () => spawn(Math.random() * H));
    addEventListener('resize', size);
    new IntersectionObserver(e => { running = e[0].isIntersecting; if (running) requestAnimationFrame(tick); }).observe(cv);
    function tick(ts) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y += p.vy; p.x += p.vx + Math.sin(ts / 1400 + p.ph) * .15;
        if (p.y > H + 10) Object.assign(p, spawn());
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = `rgba(255,251,243,${p.a})`; ctx.fill();
      }
      requestAnimationFrame(tick);
    }
  }

  /* ---------- Counter rail: arrows + filters ---------- */
  const rail = $('[data-rail]');
  $$('[data-scroll]').forEach(b => b.addEventListener('click', () => {
    const card = rail.querySelector('.item:not([hidden])');
    const step = card ? card.getBoundingClientRect().width + 18 : 300;
    rail.scrollBy({ left: Number(b.dataset.scroll) * step * 2, behavior: reduced ? 'auto' : 'smooth' });
  }));
  $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
    $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.filter; let shown = 0;
    $$('.item', rail).forEach(it => {
      const on = f === 'all' || it.dataset.tags.split(' ').includes(f);
      it.hidden = !on; if (on) shown++;
    });
    $('[data-empty]').hidden = shown > 0;
    rail.scrollTo({ left: 0 });
  }));

  /* ---------- Lazy, in-view video playback ---------- */
  const lazyVids = $$('video[data-src]');
  const vObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        if (!reduced) v.play().catch(() => {});
      } else v.pause();
    });
  }, { rootMargin: '150px 0px', threshold: 0.15 });
  lazyVids.forEach(v => vObs.observe(v));

  /* ---------- Cake builder ---------- */
  const form = $('[data-builder]'), out = $('[data-estimate]');
  const price = () => {
    const rate = Number(form.querySelector('[name="flavour"]:checked').dataset.rate);
    const kg = Number(form.size.value);
    let p = rate * kg + (form.eggless.checked ? 100 * Math.max(1, kg) : 0);
    return Math.round(p / 10) * 10;
  };
  const renderPrice = () => {
    out.textContent = '₹' + price().toLocaleString('en-IN');
    out.classList.add('bump'); setTimeout(() => out.classList.remove('bump'), 250);
  };
  form.addEventListener('change', renderPrice);
  renderPrice();
  const toast = $('[data-toast]'); let tt;
  const say = m => { toast.textContent = m; toast.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('is-on'), 2600); };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const kg = form.size.value === '0.5' ? '½ kg' : form.size.value + ' kg';
    const msg = form.message.value.trim();
    const text = `Hi Atta & Oven, I'd like a ${kg} ${form.flavour.value} cake for a ${form.occasion.value.toLowerCase()}${form.eggless.checked ? ', eggless' : ''}.${msg ? ` Message: "${msg}".` : ''} Estimate shown: ${out.textContent}.`;
    window.open(`https://wa.me/919800000001?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    say('Opening WhatsApp with your cake details.');
  });

  $('[data-year]').textContent = new Date().getFullYear();
})();
