/* Cookie consent + Google Analytics + click tracking.
   Google Analytics only loads after the visitor accepts. The choice is kept in
   localStorage; "Cookie settings" links (data-cookie-settings) reopen the banner. */
(function () {
  var GA_ID = 'G-JNNDRPCD82';
  var KEY = 'uxc-consent'; // 'granted' | 'denied'
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  function getChoice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var loaded = false;
  function loadAnalytics() {
    if (loaded) return;
    loaded = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^_ga/.test(name)) {
        var host = location.hostname.replace(/^www\./, '');
        ['', '; domain=' + host, '; domain=.' + host].forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
        });
      }
    });
  }

  /* ---------- Banner ---------- */
  var css = '' +
    '.uxc-cookie{position:fixed;right:16px;bottom:16px;z-index:9999;max-width:380px;background:#fff;color:#1a1433;border:1px solid rgba(107,92,231,.35);border-radius:12px;padding:18px 18px 16px;box-shadow:0 20px 60px rgba(20,16,51,.18);font:14px/1.55 "DM Sans",system-ui,sans-serif}' +
    '.uxc-cookie p{margin:0}.uxc-cookie .uxc-cookie-title{font:600 15px/1.3 "Outfit",system-ui,sans-serif;margin-bottom:6px}' +
    '.uxc-cookie a{color:#6b5ce7;text-decoration:underline;text-underline-offset:3px}' +
    '.uxc-cookie-btns{display:flex;gap:8px;margin-top:14px}' +
    '.uxc-cookie button{flex:1;font:500 14px/1 "DM Sans",system-ui,sans-serif;padding:11px 12px;border-radius:6px;cursor:pointer;border:1px solid #6b5ce7}' +
    '.uxc-cookie .acc{background:#6b5ce7;color:#fff}.uxc-cookie .rej{background:#fff;color:#6b5ce7}' +
    '.uxc-cookie button:focus-visible{outline:2px solid #1a1433;outline-offset:2px}' +
    '@media (max-width:600px){.uxc-cookie{left:12px;right:12px;bottom:12px;max-width:none}}';

  function showBanner() {
    if (document.querySelector('.uxc-cookie')) return;
    if (!document.getElementById('uxc-cookie-css')) {
      var st = document.createElement('style'); st.id = 'uxc-cookie-css'; st.textContent = css; document.head.appendChild(st);
    }
    var box = document.createElement('div');
    box.className = 'uxc-cookie';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookie preferences');
    box.innerHTML =
      '<p class="uxc-cookie-title">Help us improve your experience</p>' +
      '<p>Analytics cookies show us which pages help most. No ads, and nothing is set unless you accept. <a href="/privacy#s4">Privacy policy</a></p>' +
      '<div class="uxc-cookie-btns"><button type="button" class="rej">No thanks</button><button type="button" class="acc">Accept</button></div>';
    document.body.appendChild(box);
    box.querySelector('.acc').addEventListener('click', function () { setChoice('granted'); box.remove(); loadAnalytics(); });
    box.querySelector('.rej').addEventListener('click', function () {
      setChoice('denied'); box.remove();
      if (loaded) { gtag('consent', 'update', { analytics_storage: 'denied' }); }
      clearAnalyticsCookies();
    });
  }

  /* ---------- Click tracking (only sent once analytics has loaded) ---------- */
  function linkType(a) {
    var href = a.getAttribute('href') || '';
    if (/cal\.com/.test(href)) return 'book_call';
    if (/^mailto:/.test(href)) return 'email';
    if (/^tel:/.test(href)) return 'phone';
    if (a.classList.contains('wa-float')) return 'whatsapp_float';
    if (/wa\.me|whatsapp\.com/.test(href)) return 'whatsapp';
    if (/(^|\/)free(\.html)?([#?]|$)/.test(href)) return 'free_offer';
    if (/uxcircles\.github\.io/.test(href)) return 'demo_site';
    if (a.host && a.host !== location.host) return 'outbound';
    if (a.closest('nav')) return 'nav';
    if (a.closest('footer')) return 'footer';
    return 'internal';
  }

  document.addEventListener('click', function (e) {
    var settings = e.target.closest('[data-cookie-settings]');
    if (settings) { e.preventDefault(); showBanner(); return; }
    if (!loaded) return;
    var a = e.target.closest('a[href]');
    if (!a) return;
    var section = a.closest('section[id], section[class], footer, nav');
    // One event name per link type (click_book_call, click_email, click_free_offer...),
    // so each shows up in GA's Events report without setting up custom dimensions.
    var type = linkType(a);
    gtag('event', 'click_' + type, {
      link_type: type,
      link_text: (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      link_url: a.href,
      page_section: section ? (section.id || section.className.split(' ')[0] || section.tagName.toLowerCase()) : ''
    });
  }, true);

  /* ---------- Start ---------- */
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  var choice = getChoice();
  if (choice === 'granted') loadAnalytics();
  else if (choice !== 'denied') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner);
    else showBanner();
  }

  // Small "Cookie settings" link in the footer, so the choice can be changed later.
  function addFooterLink() {
    if (document.querySelector('[data-cookie-settings]')) return;
    var link = document.createElement('a');
    link.href = '#';
    link.setAttribute('data-cookie-settings', '');
    link.textContent = 'Cookie settings';
    // Sits with the email and WhatsApp links when the page has them
    var group = document.querySelector('.footer-contact');
    if (group) { group.appendChild(link); return; }
    var copy = document.querySelector('.footer-copy span, footer .footer-copy');
    if (!copy) return;
    link.style.cssText = 'color:inherit;text-decoration:underline;text-underline-offset:3px;';
    copy.appendChild(document.createTextNode(' · '));
    copy.appendChild(link);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFooterLink);
  else addFooterLink();
})();
