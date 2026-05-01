// Last-resort boot UI for stuck Telegram WebViews. Loaded as an external
// script so the CSP (which forbids inline scripts) lets it run. If the main
// bundle replaces #root within 6s, we cancel the reveal. Otherwise we surface
// a manual reload button that clears caches + service workers and reloads
// with a cache-buster, so users can self-rescue without device-side fiddling.
(function () {
  var revealTimer = setTimeout(function () {
    var hint = document.getElementById('boot-fallback-hint');
    var btn = document.getElementById('boot-fallback-reload');
    if (hint) hint.style.opacity = '1';
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.onclick = function () {
        var purge = Promise.resolve();
        try {
          if ('serviceWorker' in navigator) {
            purge = navigator.serviceWorker.getRegistrations().then(function (regs) {
              return Promise.all(regs.map(function (r) { return r.unregister(); }));
            });
          }
        } catch (e) { /* noop */ }
        purge
          .then(function () {
            if (typeof caches !== 'undefined') {
              return caches.keys().then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
              });
            }
          })
          .catch(function () { /* noop */ })
          .then(function () {
            var url = new URL(window.location.href);
            url.searchParams.set('_r', String(Date.now()));
            window.location.replace(url.toString());
          });
      };
    }
  }, 6000);

  var check = setInterval(function () {
    var root = document.getElementById('root');
    var fallback = document.getElementById('boot-fallback');
    if (root && fallback && root.firstElementChild !== fallback) {
      clearTimeout(revealTimer);
      clearInterval(check);
    }
  }, 200);
})();
