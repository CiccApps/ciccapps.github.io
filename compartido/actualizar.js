/* CiccApps · al abrir la app instalada, tirar hacia abajo desde arriba del todo recarga la página
   y trae siempre la última versión (el service worker pide primero la red). Solo en modo app (pantalla de inicio). */
(function () {
  // 1) Versión nueva publicada: al volver a la app se comprueba y, si hay cambios, se recarga sola
  if ('serviceWorker' in navigator) {
    var habia = !!navigator.serviceWorker.controller, recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!habia || recargado) { habia = true; return; }
      recargado = true; location.reload();
    });
    var comprobar = function () { navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().catch(function () {}); }); };
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') comprobar(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); else comprobar(); });
  }
  // 2) Tirar hacia abajo para recargar (solo en modo app)
  var app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (!app || !('ontouchstart' in window)) return;
  var UMBRAL = 80, y0 = null, dy = 0, listo = false;
  var el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:9999;width:34px;height:34px;margin-left:-17px;border-radius:50%;' +
    'display:grid;place-items:center;background:rgba(20,20,24,.82);color:#D9B878;box-shadow:0 4px 14px rgba(0,0,0,.3);opacity:0;transform:translateY(-40px);transition:opacity .15s;pointer-events:none;' +
    '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)';
  el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.35-5.65"/><path d="M20 4v5h-5"/></svg>';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(el); });
  var arriba = function () { return (window.scrollY || document.documentElement.scrollTop) <= 0; };
  var hayHoja = function () { return document.querySelector('.sheet-bg, [role="dialog"]:not([hidden])'); };
  document.addEventListener('touchstart', function (e) {
    y0 = (e.touches.length === 1 && arriba() && !hayHoja()) ? e.touches[0].clientY : null; dy = 0; listo = false;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0 || !arriba()) { el.style.opacity = 0; return; }
    var p = Math.min(dy / UMBRAL, 1); listo = dy >= UMBRAL;
    el.style.opacity = Math.min(1, dy / 40);
    el.style.transform = 'translateY(' + (Math.min(dy, UMBRAL + 20) * .6 - 20) + 'px) rotate(' + (p * 300) + 'deg)';
    el.style.color = listo ? '#F1E6CF' : '#D9B878';
  }, { passive: true });
  document.addEventListener('touchend', function () {
    if (y0 === null) return; y0 = null;
    if (listo) {
      el.style.transition = 'transform .6s linear'; el.style.transform = 'translateY(40px) rotate(720deg)';
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update(); });
      setTimeout(function () { location.reload(); }, 250);
    } else { el.style.opacity = 0; el.style.transform = 'translateY(-40px)'; }
  });
})();
