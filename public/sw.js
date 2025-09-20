const CACHE_NAME = "offline-map-cache-v3";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/vite.svg"
];

// Enhanced pre-cache OSM tiles for Visayas region with better coverage
async function cacheVisayasTiles(cache) {
  // Expanded Visayas coverage including surrounding waters and islands
  const regions = [
    // Main Visayas region
    { minLat: 8.0, maxLat: 13.0, minLon: 121.0, maxLon: 127.0, minZoom: 6, maxZoom: 13 },
    // High detail for major cities
    { minLat: 10.2, maxLat: 10.4, minLon: 123.8, maxLon: 124.0, minZoom: 14, maxZoom: 17 }, // Cebu City
    { minLat: 10.6, maxLat: 10.8, minLon: 122.9, maxLon: 123.1, minZoom: 14, maxZoom: 17 }, // Bacolod
    { minLat: 11.0, maxLat: 11.2, minLon: 122.5, maxLon: 122.7, minZoom: 14, maxZoom: 17 }, // Iloilo
    { minLat: 9.7, maxLat: 9.9, minLon: 118.7, maxLon: 118.9, minZoom: 14, maxZoom: 17 }, // Dumaguete
    { minLat: 11.2, maxLat: 11.4, minLon: 125.0, maxLon: 125.2, minZoom: 14, maxZoom: 17 }, // Tacloban
  ];

  let totalTiles = 0;
  let cachedTiles = 0;

  // Calculate total tiles for all regions
  for (const region of regions) {
    for (let z = region.minZoom; z <= region.maxZoom; z++) {
      const tileCount = Math.pow(2, z);
      const xMin = Math.floor(((region.minLon + 180) / 360) * tileCount);
      const xMax = Math.floor(((region.maxLon + 180) / 360) * tileCount);
      const yMin = Math.floor(
        ((1 - Math.log(Math.tan((region.maxLat * Math.PI) / 180) + 1 / Math.cos((region.maxLat * Math.PI) / 180)) / Math.PI) / 2) * tileCount
      );
      const yMax = Math.floor(
        ((1 - Math.log(Math.tan((region.minLat * Math.PI) / 180) + 1 / Math.cos((region.minLat * Math.PI) / 180)) / Math.PI) / 2) * tileCount
      );
      totalTiles += (xMax - xMin + 1) * (yMax - yMin + 1);
    }
  }

  console.log(`Starting to cache ${totalTiles} map tiles for offline use...`);

  // Cache tiles for all regions with progress reporting
  for (const region of regions) {
    for (let z = region.minZoom; z <= region.maxZoom; z++) {
      const tileCount = Math.pow(2, z);
      const xMin = Math.floor(((region.minLon + 180) / 360) * tileCount);
      const xMax = Math.floor(((region.maxLon + 180) / 360) * tileCount);
      const yMin = Math.floor(
        ((1 - Math.log(Math.tan((region.maxLat * Math.PI) / 180) + 1 / Math.cos((region.maxLat * Math.PI) / 180)) / Math.PI) / 2) * tileCount
      );
      const yMax = Math.floor(
        ((1 - Math.log(Math.tan((region.minLat * Math.PI) / 180) + 1 / Math.cos((region.minLat * Math.PI) / 180)) / Math.PI) / 2) * tileCount
      );

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
          try {
            // Add delay to avoid overwhelming the tile server
            if (cachedTiles % 50 === 0 && cachedTiles > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            const response = await fetch(tileUrl);
            if (response.ok) {
              await cache.put(tileUrl, response.clone());
              cachedTiles++;
              
              // Send progress update to clients every 10 tiles
              if (cachedTiles % 10 === 0) {
                const progress = Math.round((cachedTiles / totalTiles) * 100);
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => {
                    client.postMessage({
                      type: 'CACHE_PROGRESS',
                      progress: progress,
                      message: `Downloading map tiles... ${cachedTiles}/${totalTiles} (${progress}%)`
                    });
                  });
                });
              }
            }
          } catch (e) {
            console.warn("Failed to cache tile:", tileUrl, e.message);
            // Continue with next tile even if one fails
          }
        }
      }
    }
  }

  console.log(`Successfully cached ${cachedTiles} map tiles for offline use!`);
  return cachedTiles;
}

// Install event - Cache static assets and map tiles
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache static assets first
        await cache.addAll(STATIC_ASSETS);
        console.log("Service Worker: Static assets cached");
        
        // Notify clients that caching is starting
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_PROGRESS',
              progress: 0,
              message: 'Starting to download Visayas map tiles for offline use...'
            });
          });
        });
        
        // Cache map tiles
        const tilesCount = await cacheVisayasTiles(cache);
        
        // Send completion message
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_COMPLETE',
              message: `✅ ${tilesCount.toLocaleString()} map tiles cached! Visayas region now available offline.`
            });
          });
        });
        
      } catch (error) {
        console.error("Service Worker: Installation failed", error);
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_ERROR',
              message: 'Failed to cache map tiles. Some areas may not work offline.'
            });
          });
        });
      }
    })()
  );
  
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Service Worker: Deleting old cache", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  
  self.clients.claim();
});

// Fetch event - Serve cached content when offline
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle tile requests
  if (event.request.url.includes("tile.openstreetmap.org")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          // Return cached tile
          return response;
        }
        
        // If not cached, try to fetch and cache for future use
        return fetch(event.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, res.clone());
            });
          }
          return res;
        }).catch(() => {
          // Return a placeholder tile or error response when completely offline
          // Create a simple gray tile as fallback
          const canvas = new OffscreenCanvas(256, 256);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, 256, 256);
          ctx.fillStyle = '#ccc';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Offline', 128, 128);
          
          return canvas.convertToBlob().then(blob => {
            return new Response(blob, {
              headers: { 'Content-Type': 'image/png' }
            });
          });
        });
      })
    );
    return;
  }

  // Handle other requests (HTML, CSS, JS, etc.)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then((res) => {
        // Cache successful responses for static assets
        if (res.ok && res.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, res.clone());
          });
        }
        return res;
      }).catch(() => {
        // Return offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match("/index.html");
        }
        
        // Return appropriate offline responses
        if (event.request.destination === 'image') {
          return new Response('', { 
            status: 200,
            statusText: 'Offline fallback'
          });
        }
        
        return new Response('Service unavailable - offline', { 
          status: 503,
          statusText: 'Service Unavailable - Offline'
        });
      });
    })
  );
}
)