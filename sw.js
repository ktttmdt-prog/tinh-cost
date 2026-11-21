const CACHE = 'tinh-cost-202611211108';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const keyOf = req => { const u = new URL(req.url); return u.origin + u.pathname; };
const putCache = (req, res) => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(keyOf(req), cp)); } return res; };
const fromCache = req => caches.match(keyOf(req)).then(r => r || (req.mode === 'navigate' ? caches.match(new URL('./index.html', self.registration.scope).href) : undefined));
// Trang & dữ liệu: ưu tiên mạng (luôn bản mới nhất), mất mạng hoặc chậm quá 4 giây thì dùng bản đã lưu
const networkFirst = req => new Promise(resolve => {
  let done = false;
  const finish = r => { if (!done && r) { done = true; resolve(r); } };
  const timer = setTimeout(() => fromCache(req).then(finish), 4000);
  fetch(req).then(res => { clearTimeout(timer); putCache(req, res); if (done) return; if (res && res.ok) finish(res); else fromCache(req).then(r => { done = true; resolve(r || res); }); })
    .catch(() => { clearTimeout(timer); fromCache(req).then(r => { if (!done) { done = true; resolve(r || Response.error()); } }); });
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== location.origin) return;
  if (req.mode === 'navigate' || /\.(html|json)$/.test(u.pathname) || u.pathname.endsWith('/')) { e.respondWith(networkFirst(req)); return; }
  e.respondWith(fromCache(req).then(hit => hit || fetch(req).then(res => putCache(req, res))));
});