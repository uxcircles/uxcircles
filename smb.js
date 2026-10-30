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
