const CACHE_VERSION = "tactlex-shell-v2";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icon.png", "/uk/offline", "/en/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function isPrivateRequest(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/admin") ||
    url.pathname.includes("/dashboard") ||
    url.pathname.includes("/profile") ||
    url.pathname.includes("/settings") ||
    url.pathname.includes("/sessions") ||
    url.pathname.includes("/progress") ||
    url.pathname.includes("/leaderboard")
  );
}

function isPublicPage(url) {
  return /^\/(uk|en)\/?$/.test(url.pathname) || url.pathname.endsWith("/offline");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || isPrivateRequest(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isPublicPage(url)) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const locale = url.pathname.startsWith("/en") ? "en" : "uk";
          return caches.match(`/${locale}/offline`);
        }),
    );
    return;
  }

  if (url.pathname === "/icon.png" || url.pathname.startsWith("/audio/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
