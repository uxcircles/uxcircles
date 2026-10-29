/* Floating WhatsApp button for the small-business pages.
   Fades in after some scrolling, stays out of the way of the cookie banner,
   and hides while the page's own contact section (which already has a
   WhatsApp button) is on screen. Optional data-text on the script tag sets
   the pre-filled message. */
(function () {
  var script = document.currentScript;
  var text = (script && script.getAttribute('data-text')) || "Hi UX CIRCLES, I'd like to ask about ";
  var zh = /^zh/.test(document.documentElement.lang);

  var css = '' +
    '.wa-float{position:fixed;right:20px;bottom:20px;z-index:9000;display:flex;align-items:center;gap:10px;text-decoration:none;' +
    'opacity:0;transform:translateY(12px) scale(.9);pointer-events:none;transition:opacity .25s ease,transform .25s ease}' +
    '.wa-float.is-on{opacity:1;transform:none;pointer-events:auto}' +
    '.wa-float-btn{width:56px;height:56px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 10px 28px rgba(0,0,0,.22);transition:transform .2s ease}' +
    '.wa-float-btn svg{width:30px;height:30px}' +
    '.wa-float-label{background:#fff;color:#1a1433;font:500 14px/1 "DM Sans",system-ui,sans-serif;padding:10px 14px;border-radius:999px;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.14);white-space:nowrap;opacity:0;transform:translateX(6px);transition:opacity .2s,transform .2s}' +
    '.wa-float:hover .wa-float-label,.wa-float:focus-visible .wa-float-label{opacity:1;transform:none}' +
    '.wa-float:hover .wa-float-btn{transform:scale(1.06)}' +
    '.wa-float:focus-visible{outline:none}.wa-float:focus-visible .wa-float-btn{outline:3px solid #1a1433;outline-offset:3px}' +
    '@media (max-width:600px){.wa-float{right:16px;bottom:16px}.wa-float-btn{width:52px;height:52px}.wa-float-label{display:none}}' +
    '@media (prefers-reduced-motion:reduce){.wa-float,.wa-float-label,.wa-float-btn{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var a = document.createElement('a');
  a.className = 'wa-float';
  a.href = 'https://wa.me/447343132461?text=' + encodeURIComponent(text);
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', zh ? 'WhatsApp 聯絡我們' : 'WhatsApp us');
  a.innerHTML = '<span class="wa-float-label">' + (zh ? 'WhatsApp 聯絡我們' : 'WhatsApp us') + '</span>' +
    '<span class="wa-float-btn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.88 9.89M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg></span>';
  document.body.appendChild(a);
  // Keep the label in step with pages that switch language in place (e.g. /wedding)
  new MutationObserver(function () {
    var z = /^zh/.test(document.documentElement.lang), t = z ? 'WhatsApp 聯絡我們' : 'WhatsApp us';
    a.setAttribute('aria-label', t); a.querySelector('.wa-float-label').textContent = t;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  var scrolledEnough = false, contactVisible = false;
  function update() {
    var bannerOpen = !!document.querySelector('.uxc-cookie');
    a.classList.toggle('is-on', scrolledEnough && !contactVisible && !bannerOpen);
  }
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    scrolledEnough = scrollY > Math.min(600, max * 0.3);
    update();
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var contact = document.querySelectorAll('.cta-section, #contact');
  if (contact.length && 'IntersectionObserver' in window) {
    var seen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      contactVisible = seen.size > 0; update();
    }, { threshold: 0.15 });
    contact.forEach(function (el) { io.observe(el); });
  }
  // The cookie banner comes and goes; re-check when it does.
  new MutationObserver(update).observe(document.body, { childList: true });
})();
