import React, { useState, useEffect } from 'react';
import { SearchPanel } from './components/SearchPanel';
import { MapView } from './components/MapView';
import { KMLParser } from './utils/kmlParser';
import { indexedDBManager } from './utils/indexedDB';
import { useServiceWorker } from './hooks/useServiceWorker';
import { useOfflineStatus } from './hooks/useOfflineStatus';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Placemark, CacheProgress } from './types';

function App() {
  const [selectedPlacemark, setSelectedPlacemark] = useState<Placemark | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CacheProgress>({
    isActive: false,
    message: ''
  });
  
  const { cacheProgress: swCacheProgress } = useServiceWorker();
  const { isOnline, hasOfflineData, checkOfflineData } = useOfflineStatus();

  // Combine upload progress and service worker progress
  const cacheProgress = uploadProgress.isActive ? uploadProgress : swCacheProgress;

  useEffect(() => {
    // Initialize IndexedDB
    indexedDBManager.init().catch(error => {
      console.error('Failed to initialize IndexedDB:', error);
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setUploadProgress({
        isActive: true,
        message: 'Parsing KML file...',
        progress: 0
      });

      const placemarks = await KMLParser.parseKML(file, (progress) => {
        setUploadProgress({
          isActive: true,
          message: `Parsing KML file... (${Math.round(progress)}%)`,
          progress
        });
      });

      setUploadProgress({
        isActive: true,
        message: 'Storing data offline...',
        progress: 100
      });

      await indexedDBManager.storePlacemarks(placemarks);

      // Update offline data status
      checkOfflineData();

      setUploadProgress({
        isActive: true,
        message: `Successfully loaded ${placemarks.length.toLocaleString()} placemarks offline!`
      });

      // Hide success message after 3 seconds
      setTimeout(() => {
        setUploadProgress({ isActive: false, message: '' });
      }, 3000);

    } catch (error) {
      console.error('Error uploading KML:', error);
      setUploadProgress({
        isActive: true,
        message: 'Failed to process KML file. Please check the file format.'
      });
      
      setTimeout(() => {
        setUploadProgress({ isActive: false, message: '' });
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true);
      const placemark = await indexedDBManager.searchPlacemark(query);

      if (placemark) {
        setSelectedPlacemark(placemark);
      } else {
        setSelectedPlacemark(null);
        alert(`Account "${query}" not found. Please check the account number or name.`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Offline Status Indicator */}
      <OfflineIndicator isOnline={isOnline} hasOfflineData={hasOfflineData} />

      {/* Title Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">KML Map - Visayas Offline</h1>
          <p className="text-blue-100 text-sm">Import KML files and search locations offline</p>
        </div>
      </div>

      {/* Search Panel */}
      <SearchPanel
        onFileUpload={handleFileUpload}
        onSearch={handleSearch}
        cacheProgress={cacheProgress}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
      />

      {/* Map View */}
      <MapView selectedPlacemark={selectedPlacemark} />
    </div>
  );
}

export default App;