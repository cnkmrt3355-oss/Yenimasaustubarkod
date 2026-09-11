// Nur Market POS — Service Worker
// Basit "cache-first, ağdan güncelle" stratejisi: uygulama kabuğunu
// (HTML/manifest) önbelleğe alır, böylece internet olmadan da açılabilir.
// NOT: Bu dosya yalnızca https:// veya http://localhost üzerinden
// çalışır — bir dosyayı doğrudan çift tıklayıp (file://) açtığınızda
// tarayıcılar service worker çalıştırmaz. Çevrimdışı çalışma ve "Ana
// Ekrana Ekle" özelliğini kullanmak için bu dosyayı, index HTML dosyanız
// ve manifest.json ile birlikte herhangi bir statik web barındırma
// hizmetine (GitHub Pages, Netlify, kendi sunucunuz vb.) yükleyin.

const CACHE_NAME = 'nur-market-pos-v1';
const APP_SHELL = [
  self.registration ? self.registration.scope : './'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Kapsam URL'i önbelleğe alınamazsa sessizce geç — ilk ziyarette
        // fetch olayı zaten sayfayı önbelleğe alacak.
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Sadece kendi originimizdeki istekleri önbelleğe al (fontlar/CDN hariç,
  // onlar tarayıcının kendi HTTP önbelleğine bırakılır).
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // Varsa önce önbellekten hızlıca göster, arka planda ağdan güncelle.
      return cached || networkFetch;
    })
  );
});
