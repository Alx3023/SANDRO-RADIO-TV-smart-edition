const CACHE_VERSION = 'v2.0.2';
const CACHE_NAME = `sandro-radio-tv-${CACHE_VERSION}`;

const STATIC_ASSETS = [
   '/',
  '/index.html',
  '/manifest.json'
];

const STREAMING_DOMAINS = [
  'mediapolis.rai.it',
  'mediaset.net',
  'akamaized.net',
  'cloudfront.net',
  'msvdn.net',
  'streamlock.net',
  'xdevel.com',
  'hiway.media',
  'fluid.stream',
  'imgur.com',
  'cdn.jsdelivr.net',
  'icestreaming.rai.it',
  'mediahub.it',
  'radioradicale.it',
  'mariatvcdn.it',
   'lswcdn.net',
  'morescreens.com',
  'youtube.com',
  'twitch.tv',
  'vimeo.com',
  'dailymotion.com',
  'shoutcast.rtl.it',
  'ice02.fluidstream.net',
  'ice04.fluidstream.net',
   'ice12.fluidstream.net',
  'ice14.fluidstream.net'
];

self.addEventListener('install', (event) => {
  console.log('[SW] 📻 Installazione SANDRO RADIO TV in corso...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aperta:', CACHE_NAME);
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] ✅ Risorse statiche cachate');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] ❌ Errore cache:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Attivazione SANDRO RADIO TV...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('sandro-radio-tv-') && name !== CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] 🗑️ Elimino cache vecchia:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Attivazione completata');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') return;
  
  if (isStreamingURL(url)) {
    return;
  }
  
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      if (request.url.includes('.js') || request.url.includes('.css')) {
        fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response));
          }
        }).catch(() => {});
      }
      return cached;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] ❌ Errore cacheFirst:', error);
    return offlineResponse();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineResponse();
  }
}

function isStreamingURL(url) {
  return STREAMING_DOMAINS.some(domain => url.hostname.includes(domain));
}

function offlineResponse() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Offline</title></head>
    <body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:40px;">
      <h1>📻 SANDRO RADIO TV</h1>
      <p>Sei offline. Controlla la connessione internet.</p>
      <button onclick="location.reload()">🔄 Riprova</button>
    </body>
    </html>
  `;
  
  return new Response(html, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach(name => {
        if (name.startsWith('sandro-radio-tv-')) {
          caches.delete(name);
          console.log('[SW] 🗑️ Cache eliminata:', name);
        }
      });
    });
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ 
      version: CACHE_VERSION, 
      name: 'SANDRO RADIO TV',
      cache: CACHE_NAME
    });
  }
});

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || '🎵 Nuovi contenuti disponibili!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-72.png',
    vibrate: [200, 100, 200],
    sound: 'default',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'open', title: '📺 Apri TV', icon: 'icons/icon-72.png' },
      { action: 'radio', title: '🎵 Radio', icon: 'icons/icon-72.png' },
      { action: 'close', title: '❌ Chiudi', icon: 'icons/icon-72.png' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification('📻 SANDRO RADIO TV', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open') {
    event.waitUntil(clients.openWindow('/'));
  } else if (event.action === 'radio') {
    event.waitUntil(clients.openWindow('/?tab=radio'));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-playlists') {
    console.log('[SW] 🔄 Sincronizzazione playlist in background...');
    event.waitUntil(syncPlaylists());
  }
});

async function syncPlaylists() {
  console.log('[SW] ✅ Playlist sincronizzate');
}

console.log('[SW] 📻 SANDRO RADIO TV Service Worker caricato - v' + CACHE_VERSION);