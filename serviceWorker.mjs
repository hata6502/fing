const a=["/","/favicon.png","/index.mjs","/manifest.json"],t=String(1673888226794),e=globalThis;e.addEventListener("activate",(a=>{a.waitUntil((async()=>{const a=await caches.keys();await Promise.all(a.map((async a=>{a!==t&&await caches.delete(a)}))),await e.clients.claim()})())})),e.addEventListener("fetch",(a=>{a.respondWith((async()=>{const t=await caches.match(a.request);return t||await fetch(a.request)})())})),e.addEventListener("install",(i=>{i.waitUntil((async()=>{const i=await caches.open(t);await i.addAll(a),await e.skipWaiting()})())}));