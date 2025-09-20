import { useState, useEffect } from 'react';
import { indexedDBManager } from '../utils/indexedDB';

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasOfflineData, setHasOfflineData] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for offline data
    checkOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkOfflineData = async () => {
    try {
      const count = await indexedDBManager.getPlacemarksCount();
      setHasOfflineData(count > 0);
    } catch (error) {
      console.error('Error checking offline data:', error);
      setHasOfflineData(false);
    }
  };

  return { isOnline, hasOfflineData, checkOfflineData };
};