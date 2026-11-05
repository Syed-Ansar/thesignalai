/* Mana Review — offline-first service worker.
   Network-first for everything GET (so fresh code always wins when online),
   falling back to the cache when the network drops. POSTs are never cached. */
const CACHE = "review-studio-v2";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.svg", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isImage = url.hostname === "images.unsplash.com";
  if (!sameOrigin && !isImage) return;
  if (sameOrigin && url.pathname.startsWith("/__")) return; // dev tooling

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("", { status: 503, statusText: "Offline" });
      }),
  );
});

// Background Sync: the CRM queue lives in the page's localStorage, so ask open clients to flush it.
self.addEventListener("sync", (event) => {
  if (event.tag === "crm-sync") {
    event.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true, type: "window" })
        .then((clients) => clients.forEach((c) => c.postMessage({ type: "crm-sync" }))),
    );
  }
});
