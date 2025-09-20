import { useState, useEffect } from 'react';
import { CacheProgress } from '../types';

export const useServiceWorker = () => {
  const [cacheProgress, setCacheProgress] = useState<CacheProgress>({
    isActive: false,
    message: ''
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_PROGRESS') {
          setCacheProgress({
            isActive: true,
            message: event.data.message,
            progress: event.data.progress
          });
        } else if (event.data.type === 'CACHE_COMPLETE') {
          setCacheProgress({
            isActive: true,
            message: event.data.message
          });
          
          // Hide success message after 3 seconds
          setTimeout(() => {
            setCacheProgress(prev => ({ ...prev, isActive: false }));
          }, 3000);
        } else if (event.data.type === 'CACHE_ERROR') {
          setCacheProgress({
            isActive: true,
            message: event.data.message
          });
          
          // Hide error message after 8 seconds
          setTimeout(() => {
            setCacheProgress(prev => ({ ...prev, isActive: false }));
          }, 8000);
        }
      });
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      setCacheProgress({
        isActive: true,
        message: 'Registering service worker...'
      });

      const registration = await navigator.serviceWorker.register('/sw.js');
      
      if (registration.installing) {
        setCacheProgress({
          isActive: true,
          message: 'Installing offline capabilities...'
        });
      } else if (registration.waiting) {
        setCacheProgress({
          isActive: true,
          message: 'New version available, please refresh.'
        });
      } else if (registration.active) {
        setCacheProgress({
          isActive: true,
          message: 'Offline capabilities ready!'
        });
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setCacheProgress(prev => ({ ...prev, isActive: false }));
        }, 3000);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setCacheProgress({
                isActive: true,
                message: 'New version available, please refresh.'
              });
            }
          });
        }
      });

    } catch (error) {
      console.error('Service worker registration failed:', error);
      setCacheProgress({
        isActive: false,
        message: 'Failed to enable offline mode'
      });
    }
  };

  return { cacheProgress };
};