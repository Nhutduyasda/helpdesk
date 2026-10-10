const STATIC_CACHE = 'itcare-static-v1';
const STATIC_FILES = ['/manifest.webmanifest', '/icons/itcare-192.png', '/icons/itcare-512.png', '/icons/itcare-maskable-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('itcare-static-') && key !== STATIC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows => {
    const app = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (app) await app.focus();
    else await self.clients.openWindow('/login');
  }));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Supabase API/data/images and authenticated HTML are never placed in Cache Storage.
  const staticAsset = STATIC_FILES.includes(url.pathname) || /^\/assets\/[^/]+\.(js|css|woff2)$/.test(url.pathname) || /^\/fonts\/[^/]+\/[^/]+\.woff2$/.test(url.pathname);
  if (staticAsset) {
    event.respondWith(caches.open(STATIC_CACHE).then(async cache => {
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') await cache.put(event.request, response.clone());
      return response;
    }));
  } else if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => new Response('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ITCare — Mất kết nối</title><body><h1>ITCare đang mất kết nối</h1><p>Kết nối mạng rồi mở lại ứng dụng. Yêu cầu chưa được gửi khi ngoại tuyến.</p><button onclick="location.reload()">Thử lại</button></body></html>', {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
  }
});
