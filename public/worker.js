self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.open("minilink-user-assets").then(async (cache) => {
      return cache
        .match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request.clone());
        })
        .catch((error) => {
          console.log(error);
          throw error;
        });
    }),
  );
});

self.addEventListener("install", () => {
  // The promise that skipWaiting() returns can be safely ignored.
  self.skipWaiting();

  // Perform any other actions required for your
  // service worker to install, potentially inside
  // of event.waitUntil();
});
