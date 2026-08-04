"use strict";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const legacyFlutterCaches = new Set([
      "flutter-app-manifest",
      "flutter-temp-cache",
      "flutter-app-cache"
    ]);
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter(function (name) {
      return legacyFlutterCaches.has(name);
    }).map(function (name) {
      return caches.delete(name);
    }));

    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: "window" });
    await self.registration.unregister();
    await Promise.all(windows.map(function (client) {
      return client.navigate(client.url);
    }));
  }()));
});
