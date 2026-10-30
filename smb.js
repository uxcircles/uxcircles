/* Mobile menu for the small-business pages' nav (see smb.css). */
(function () {
  var btn = document.querySelector('.smb-toggle');
  var menu = document.getElementById('smb-menu');
  if (!btn || !menu) return;

  function set(open) {
    btn.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  }

  btn.addEventListener('click', function () {
    set(btn.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) set(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') set(false);
  });
})();

/* Scroll reveal: blocks below the hero fade up once as they come into view.
   Progressive: nothing is hidden unless this runs, and blocks already on screen
   at load are left alone so nothing flickers. Off when the visitor asks for
   reduced motion. The GSAP case sections on /web and /restaurants animate
   themselves on desktop, so only their images are included, on phones. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var selectors = [
    '.services-label', '.services-title', '.services-title-zh', '.demo-disclaimer',
    '.service-card', '.aud-card', '.demo-card', '.price-card', '.price-addon', '.free-grid > *',
    '.receive-card', '.who-card', '.report', '.faq-item', '.free-band-inner',
    '.smb-more-label', '.smb-more-title', '.smb-more-card', '.smb-more-studio',
    '.cta-inner > *',
    '.contact-divider', '.contact-form', '.contact-fallback', '.contact-details'
  ];
  var phone = window.matchMedia('(max-width: 900px)').matches;
  if (phone) selectors.push('.case-img-wrap');

  var found = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));
  // Outermost matches only, and never inside the hero
  var els = found.filter(function (el) {
    if (el.closest('.hero, .hero-wrap')) return false;
    return !found.some(function (o) { return o !== el && o.contains(el); });
  });

  var groups = new Map();
  els.forEach(function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible
    // Stagger siblings in the same row or list
    var i = groups.get(el.parentElement) || 0;
    groups.set(el.parentElement, i + 1);
    el.style.setProperty('--rv-delay', Math.min(i * 80, 320) + 'ms');
    el.classList.add('rv');
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      el.classList.add('rv-in');
      // Hand the element back to its own hover transitions once revealed
      var done = function () { el.classList.remove('rv', 'rv-in'); el.style.removeProperty('--rv-delay'); };
      el.addEventListener('transitionend', function end(ev) {
        if (ev.target !== el) return; // ignore transitions bubbling up from children
        el.removeEventListener('transitionend', end);
        done();
      });
      setTimeout(done, 1600);
    });
  // Phones scroll in quick flicks, so start the fade once a block is well into view
  }, { rootMargin: phone ? '0px 0px -18% 0px' : '0px 0px -8% 0px' });

  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
})();
