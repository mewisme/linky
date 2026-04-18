const CACHE_VERSION = "linky-pwa-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await cache.addAll(["/offline.html"]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("linky-pwa-") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_VERSION);
        const fallback = await cache.match("/offline.html");
        return fallback || Response.error();
      })
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { notification } = data;
  const notifData = notification.data || {};
  const onlyWhenBlurred = notifData.onlyWhenBlurred === true;

  const showIfAllowed = () => {
    if (onlyWhenBlurred) {
      return self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          const hasFocusedTab = clientList.some(
            (c) => c.visibilityState === "visible" && c.focused === true
          );
          if (hasFocusedTab) return;
          return self.registration.showNotification(notification.title, {
            body: notification.body,
            icon: notification.icon || "/android-chrome-192x192.png",
            badge: notification.badge || "/badge-72x72.png",
            data: notifData,
            tag: notifData.notificationId || undefined,
          });
        });
    }
    return self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || "/android-chrome-192x192.png",
      badge: notification.badge || "/badge-72x72.png",
      data: notifData,
      tag: notifData.notificationId || undefined,
    });
  };

  event.waitUntil(showIfAllowed());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
