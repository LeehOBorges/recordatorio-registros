```javascript id="p5w1st"
/* =========================================================
   RECORDATÓRIO + REGISTROS
   SERVICE WORKER — PWA
========================================================= */

const CACHE_NAME =
  "recordatorio-registros-v04";


const FILES_TO_CACHE = [

  "./",

  "./index.html",

  "./styles.css",

  "./app.js",

  "./relatorios.js",

  "./sincronizacao.js",

  "./manifest.json",

  "./icon-192.png",

  "./icon-512.png"

];


/* =====================================================
   INSTALAÇÃO
===================================================== */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          cache => {

            return cache.addAll(
              FILES_TO_CACHE
            );

          }
        )

    );

    self.skipWaiting();

  }
);


/* =====================================================
   ATIVAÇÃO
===================================================== */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          cacheNames => {

            return Promise.all(

              cacheNames
                .filter(
                  cacheName => {

                    return (
                      cacheName !==
                      CACHE_NAME
                    );

                  }
                )
                .map(
                  cacheName => {

                    return caches.delete(
                      cacheName
                    );

                  }
                )

            );

          }
        )

    );

    self.clients.claim();

  }
);


/* =====================================================
   REQUISIÇÕES
===================================================== */

self.addEventListener(
  "fetch",
  event => {

    /*
     * O Supabase deve acessar a internet diretamente.
     */

    if (
      event.request.url.includes(
        ".supabase.co"
      )
    ) {

      return;

    }


    /*
     * O cache será usado apenas para GET.
     */

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    event.respondWith(

      caches
        .match(
          event.request
        )
        .then(
          cachedResponse => {

            if (
              cachedResponse
            ) {

              return cachedResponse;

            }


            return fetch(
              event.request
            )
              .then(
                response => {

                  if (
                    response &&
                    response.status ===
                    200
                  ) {

                    const cloned =
                      response.clone();


                    caches
                      .open(
                        CACHE_NAME
                      )
                      .then(
                        cache => {

                          cache.put(
                            event.request,
                            cloned
                          );

                        }
                      );

                  }


                  return response;

                }
              );

          }
        )

    );

  }
);
```
