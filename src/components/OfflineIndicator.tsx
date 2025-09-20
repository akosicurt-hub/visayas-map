import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, CheckCircle } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  hasOfflineData: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  isOnline, 
  hasOfflineData 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed top-4 left-4 z-50">
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 ${
          isOnline 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : hasOfflineData
            ? 'bg-blue-100 border border-blue-300 text-blue-800'
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        
        <span className="text-sm font-medium">
          {isOnline ? 'Online' : hasOfflineData ? 'Offline Ready' : 'Offline'}
        </span>
        
        {hasOfflineData && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
      </div>

      {showDetails && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Internet Connection:</span>
              <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Offline Maps:</span>
              <span className={`font-medium ${hasOfflineData ? 'text-green-600' : 'text-gray-500'}`}>
                {hasOfflineData ? 'Available' : 'Not cached'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>App Status:</span>
              <span className="font-medium text-blue-600">
                {isOnline ? 'Fully Functional' : hasOfflineData ? 'Offline Mode' : 'Limited'}
              </span>
            </div>
            
            {!isOnline && hasOfflineData && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                ✅ App is working offline with cached Visayas maps and data!
              </div>
            )}
            
            {!isOnline && !hasOfflineData && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                ⚠️ Limited offline functionality. Connect to internet to cache maps.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};