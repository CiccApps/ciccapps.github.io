/* CiccApps · al volver a una app, comprueba si hay una versión nueva publicada y, si la hay, recarga sola. */
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
})();
