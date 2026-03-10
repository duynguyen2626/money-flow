self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    } catch {}

    try {
      const regs = await self.registration.unregister()
      if (regs && self.clients && self.clients.matchAll) {
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        clients.forEach((client) => client.navigate(client.url))
      }
    } catch {}
  })())
})
