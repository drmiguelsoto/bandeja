/* Bandeja Michelle — Service Worker
   Etapa 2 (instalable): habilita la instalación como app y cachea el "cascarón"
   para que abra rápido. NO cachea datos de pacientes ni respuestas de la API
   (esos siempre se piden frescos). La base de notificaciones queda lista abajo
   para la Etapa 3.
*/
const CACHE = "bandeja-v4";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // NUNCA cachear llamadas a la API de Michelle (datos en vivo): siempre a la red.
  if (url.href.includes("chatbot-whatsapp-production") || url.href.includes("/inbox/")) {
    return; // deja pasar a la red normal
  }
  // Para el cascarón (HTML/íconos): red primero, con respaldo al cache si no hay señal.
  if (e.request.method === "GET" && url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(()=>{});
        return r;
      }).catch(() => caches.match(e.request))
    );
  }
});

/* ── Base para notificaciones (Etapa 3) — inofensiva hasta que se active push ── */
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const titulo = data.titulo || "Nuevo mensaje";
  const cuerpo = data.cuerpo || "Un paciente escribió a la bandeja.";
  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: data.telefono || "bandeja",
      data: { telefono: data.telefono || "" }
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then((cs) => {
    for (const c of cs) { if ("focus" in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow("./");
  }));
});
