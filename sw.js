/* CiccApps — funciona sin conexión: guarda una copia de cada app y sus piezas al visitarlas. */
const CACHE = 'ciccapps-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // los datos (Supabase) siempre en vivo
  const pagina = e.request.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/');
  if (pagina) {
    // páginas: primero la red (para ver siempre la última versión); sin conexión, la copia
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request)));
  } else {
    // fuentes, iconos y scripts: la copia primero
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; })));
  }
});
