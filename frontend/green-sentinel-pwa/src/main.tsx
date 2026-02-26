import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './utils/serviceWorkerRegister'

// Register service worker for offline support
registerServiceWorker({
  onSuccess: () => {
    console.log('PWA service worker registered successfully');
  },
  onError: (error) => {
    console.error('Failed to register service worker:', error);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
