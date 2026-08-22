const CACHE_NAME = "ayko-kit-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// estratégia network-first, mas SÓ pra arquivos do próprio site (GET,
// mesmo domínio). Qualquer chamada de API (Supabase, etc) passa direto,
// sem o service worker interferir — nunca deve ser cacheada.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const mesmoOrigem = url.origin === self.location.origin;

  if (event.request.method !== "GET" || !mesmoOrigem) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
