/* CiccApps — funciona sin conexión: guarda una copia de cada app y sus piezas al visitarlas. */
const CACHE = 'ciccapps-v162';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // los datos (Supabase) siempre en vivo
  const pagina = e.request.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/');
  if (pagina) {
    // páginas, scripts y estilos: primero la red (para ver siempre la última versión); sin conexión, la copia
    e.respondWith(fetch(e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-store', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-store' })).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request)));
  } else {
    // fuentes e iconos: la copia al instante y, por detrás, se descarga la versión nueva para la próxima vez
    e.respondWith(caches.open(CACHE).then(k => k.match(e.request).then(m => {
      const red = fetch(e.request).then(r => { if (r.ok) k.put(e.request, r.clone()); return r; }).catch(() => m);
      return m || red;
    })));
  }
});
