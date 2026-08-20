/* =========================================================
   RECORDATÓRIO + REGISTROS
   SERVICE WORKER — PWA
========================================================= */

const CACHE_NAME =
  "recordatorio-registros-v03";


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


/* =========================================================
   INSTALAÇÃO
========================================================= */

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


/* =========================================================
   ATIVAÇÃO
========================================================= */

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


/* =========================================================
   BUSCA DE ARQUIVOS
========================================================= */

self.addEventListener(
  "fetch",
  event => {

    /*
     * Não interceptar requisições do Supabase.
     * Elas precisam acessar a internet diretamente.
     */

    if (
      event.request.url.includes(
        ".supabase.co"
      )
    ) {

      return;

    }


    /*
     * O Service Worker trabalha apenas
     * com requisições GET.
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

                  /*
                   * Guarda uma cópia das respostas
                   * válidas no cache.
                   */

                  if (
                    response &&
                    response.status ===
                    200
                  ) {

                    const responseClone =
                      response.clone();


                    caches
                      .open(
                        CACHE_NAME
                      )
                      .then(
                        cache => {

                          cache.put(
                            event.request,
                            responseClone
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
