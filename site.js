(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async function () {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const rootRegistrations = registrations.filter(function (registration) {
        return new URL(registration.scope).pathname === "/";
      });

      await Promise.all(rootRegistrations.map(function (registration) {
        return registration.unregister();
      }));

      if ("caches" in window && rootRegistrations.length > 0) {
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
      }
    } catch (error) {
      console.warn("기존 앱 캐시를 정리하지 못했습니다.", error);
    }
  });
}());
