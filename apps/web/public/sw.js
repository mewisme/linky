self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
