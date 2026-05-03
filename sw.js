const cacheName = "gym-training-log-v38";
const files = [
  "./",
  "./index.html",
  "./index.html?v=38",
  "./styles.css?v=38",
  "./app.js?v=38",
  "./manifest.webmanifest?v=38",
  "./assets/home-hero-lulu-cutout.png",
  "./assets/home-card-lower.png",
  "./assets/home-card-upper.png",
  "./assets/lulu-header.webp",
  "./assets/lulu-lower.webp",
  "./assets/lulu-upper.webp",
  "./assets/lulu-plaid.webp",
  "./assets/workout-card-lower.webp",
  "./assets/workout-card-upper.webp",
  "./assets/lulu-action-lower.webp",
  "./assets/lulu-action-upper.webp",
  "./assets/lulu-action-lower-cutout.webp",
  "./assets/lulu-action-upper-cutout.webp",
  "./assets/lulu-card-lower-clean.webp",
  "./assets/lulu-card-upper-clean.webp",
  "./assets/lulu-workout-lower-cutout.png",
  "./assets/lulu-workout-upper-cutout.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./startup-750x1334.png",
  "./startup-828x1792.png",
  "./startup-1125x2436.png",
  "./startup-1170x2532.png",
  "./startup-1179x2556.png",
  "./startup-1290x2796.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(files)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(cacheName).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(cacheName).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fresh;
    }),
  );
});
