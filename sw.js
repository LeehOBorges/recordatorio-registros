```javascript
/* =========================================================
   RECORDATÓRIO + REGISTROS
   SERVICE WORKER — PWA
========================================================= */

const CACHE_NAME = "recordatorio-registros-v01";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];


/* =========================================================
   INSTALAÇÃO
========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => {

        return cache.addAll(FILES_TO_CACHE);

      })

  );

  self.skipWaiting();

});


/* =========================================================
   ATIVAÇÃO
========================================================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(cacheNames => {

        return Promise.all(

          cacheNames
            .filter(cacheName => {

              return cacheName !== CACHE_NAME;

            })
            .map(cacheName => {

              return caches.delete(cacheName);

            })

        );

      })

  );

  self.clients.claim();

});


/* =========================================================
   BUSCA DE ARQUIVOS
========================================================= */

self.addEventListener("fetch", event => {

  event.respondWith(

    caches.match(event.request)
      .then(cachedResponse => {

        if (cachedResponse) {

          return cachedResponse;

        }

        return fetch(event.request);

      })

  );

});
```
