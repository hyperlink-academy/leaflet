self.addEventListener("fetch", (event) => {
  console.log("Handling fetch event for", event.request.url);

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
          throw error;
        });
    }),
  );
});
