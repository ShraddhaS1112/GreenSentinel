# Quick Start: Offline Support

## For Developers

### Using the Offline Features

#### 1. Register Service Worker (Already Done)
The service worker is automatically registered in `src/main.tsx`:
```typescript
import { registerServiceWorker } from './utils/serviceWorkerRegister';

registerServiceWorker({
  onSuccess: (registration) => {
    console.log('PWA service worker registered successfully');
  },
  onError: (error) => {
    console.error('Failed to register service worker:', error);
  }
});
```

#### 2. Cache Farm Data
```typescript
import { cacheFarmData, getCachedFarmData } from './utils/cacheManager';

// Cache farm data with 1-hour TTL
await cacheFarmData('farm-123', farmData, 3600000);

// Retrieve cached data
const cachedData = await getCachedFarmData('farm-123');
```

#### 3. Cache Threat History
```typescript
import { cacheThreatHistory, getCachedThreatHistory } from './utils/cacheManager';

// Cache threats
await cacheThreatHistory('farm-123', threatsArray);

// Retrieve threats
const threats = await getCachedThreatHistory('farm-123');
```

#### 4. Cache Health Scores
```typescript
import { cacheHealthScores, getCachedHealthScores } from './utils/cacheManager';

// Cache health scores
await cacheHealthScores('farm-123', healthData);

// Retrieve health scores
const health = await getCachedHealthScores('farm-123');
```

#### 5. Detect Offline Status
```typescript
import { useOfflineStatus } from './hooks/useOfflineStatus';

function MyComponent() {
  const isOffline = useOfflineStatus();
  
  return (
    <div>
      {isOffline && <p>You are offline</p>}
      {!isOffline && <p>You are online</p>}
    </div>
  );
}
```

#### 6. Show Offline Indicator
```typescript
import { OfflineIndicator } from './components/OfflineIndicator';

function App() {
  return (
    <>
      <OfflineIndicator />
      {/* Rest of app */}
    </>
  );
}
```

#### 7. Listen for Online/Offline Changes
```typescript
import { onOnlineStatusChange } from './utils/serviceWorkerRegister';

const cleanup = onOnlineStatusChange((isOnline) => {
  if (isOnline) {
    console.log('Back online!');
    // Sync data with backend
  } else {
    console.log('Gone offline');
    // Show offline UI
  }
});

// Clean up listener when done
cleanup();
```

#### 8. Clear All Caches
```typescript
import { clearAllCaches } from './utils/cacheManager';

// Clear all cached data
await clearAllCaches();
```

#### 9. Get Cache Info
```typescript
import { getCacheInfo } from './utils/cacheManager';

const info = await getCacheInfo();
console.log(`Farm data entries: ${info.farmDataSize}`);
console.log(`Threat history entries: ${info.threatHistorySize}`);
console.log(`Health scores entries: ${info.healthScoresSize}`);
```

### Testing Offline Mode

#### In Browser DevTools

1. **Chrome/Edge:**
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Service Workers"
   - Check "Offline" checkbox
   - Reload page

2. **Firefox:**
   - Open DevTools (F12)
   - Go to Storage tab
   - Expand "Service Workers"
   - Click "Offline" button

3. **Safari:**
   - Develop menu → Disable Local File Restrictions
   - Develop menu → Disable JavaScript
   - Or use Network Link Conditioner

#### Programmatically

```typescript
// Simulate offline
Object.defineProperty(navigator, 'onLine', {
  value: false,
  configurable: true
});

// Dispatch offline event
window.dispatchEvent(new Event('offline'));

// Simulate online
Object.defineProperty(navigator, 'onLine', {
  value: true,
  configurable: true
});

// Dispatch online event
window.dispatchEvent(new Event('online'));
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test serviceWorkerRegister.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Debugging

#### Check Service Worker Status
```typescript
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => {
    console.log('SW registered:', registration);
    console.log('Active:', registration.active);
    console.log('Installing:', registration.installing);
    console.log('Waiting:', registration.waiting);
  });
});
```

#### Check Cache Contents
```typescript
caches.keys().then((cacheNames) => {
  cacheNames.forEach((cacheName) => {
    caches.open(cacheName).then((cache) => {
      cache.keys().then((requests) => {
        console.log(`Cache: ${cacheName}`);
        requests.forEach((request) => {
          console.log(`  - ${request.url}`);
        });
      });
    });
  });
});
```

#### Monitor Cache Operations
```typescript
// Add logging to cache operations
const originalCachesOpen = caches.open;
caches.open = function(cacheName) {
  console.log(`Opening cache: ${cacheName}`);
  return originalCachesOpen.call(this, cacheName);
};
```

### Common Issues

#### Service Worker Not Registering
- Check browser console for errors
- Verify HTTPS is enabled (required for SW)
- Check that `/service-worker.js` is accessible
- Clear browser cache and reload

#### Cached Data Not Updating
- Check TTL settings in cache calls
- Verify network requests are completing
- Check browser DevTools > Application > Cache Storage
- Clear caches using `clearAllCaches()`

#### Offline Indicator Always Showing
- Check `navigator.onLine` status
- Verify online/offline event listeners are attached
- Check browser network settings
- Test with DevTools offline mode

### Performance Tips

1. **Cache Strategically**
   - Cache only essential data
   - Use TTL to keep data fresh
   - Clear old caches regularly

2. **Minimize Cache Size**
   - Compress data before caching
   - Remove unnecessary fields
   - Implement cache size limits

3. **Optimize Network Requests**
   - Use service worker to intercept requests
   - Implement request deduplication
   - Use background sync for offline requests

4. **Monitor Performance**
   - Track cache hit rates
   - Monitor service worker performance
   - Log offline usage patterns

### Next Steps

1. **Integrate with React Router**
   - Add routing for dashboard, threats, health
   - Cache route data

2. **Connect to AWS Backend**
   - Integrate with AppSync GraphQL API
   - Cache API responses

3. **Implement Background Sync**
   - Queue offline threat alerts
   - Sync when online

4. **Add Push Notifications**
   - Notify user of new threats
   - Deliver alerts when offline

### Resources

- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [OFFLINE_SUPPORT.md](./OFFLINE_SUPPORT.md) - Full documentation
