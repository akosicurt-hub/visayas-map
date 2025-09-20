import React, { useRef, useState } from 'react';
import { Upload, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CacheProgress } from '../types';

interface SearchPanelProps {
  onFileUpload: (file: File) => Promise<void>;
  onSearch: (query: string) => Promise<void>;
  cacheProgress: CacheProgress;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
}

// Format input to xx-xxxx-xxxx pattern
const formatAccountNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Apply formatting based on length
  if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  } else {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
};

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onFileUpload,
  onSearch,
  cacheProgress,
  searchQuery,
  setSearchQuery,
  isLoading
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.kml')) {
      await onFileUpload(file);
    } else {
      alert('Please select a valid KML file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // If input contains only digits or is being formatted, apply auto-formatting
    if (/^[\d-]*$/.test(value)) {
      const formatted = formatAccountNumber(value);
      setSearchQuery(formatted);
    } else {
      // Allow free text for account names
      setSearchQuery(value);
    }
  };
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div className="bg-white shadow-lg border-b border-gray-200 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* File Upload Section */}
          <div className="flex-1">
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 transition-all duration-200 ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              
              <div className="flex items-center gap-3">
                <Upload className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Upload KML File
                  </p>
                  <p className="text-xs text-gray-500">
                    Click or drag & drop your KML file here
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="flex-1">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Search by account number (e.g., 0206461300) or name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={isLoading}
                maxLength={50}
              />
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-200"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-1">
              Enter numbers only for account search (auto-formatted) or type account name
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        {cacheProgress.isActive && (
          <div className={`mt-4 rounded-lg p-3 border ${
            cacheProgress.message.includes('Failed') || cacheProgress.message.includes('error')
              ? 'bg-red-50 border-red-200'
              : cacheProgress.message.includes('✅') || cacheProgress.message.includes('cached!')
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {cacheProgress.progress !== undefined && cacheProgress.progress < 100 ? (
                <AlertCircle className="h-5 w-5 text-blue-600 animate-pulse" />
              ) : cacheProgress.message.includes('✅') ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : cacheProgress.message.includes('Failed') ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              <p className={`text-sm ${
                cacheProgress.message.includes('Failed') || cacheProgress.message.includes('error')
                  ? 'text-red-800'
                  : cacheProgress.message.includes('✅') || cacheProgress.message.includes('cached!')
                  ? 'text-green-800'
                  : 'text-blue-800'
              }`}>
                {cacheProgress.message}
              </p>
            </div>
            
            {/* Enhanced progress bar */}
            {cacheProgress.progress !== undefined && cacheProgress.progress < 100 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-blue-600 mb-1">
                  <span>Downloading for offline use</span>
                  <span>{Math.round(cacheProgress.progress)}%</span>
                </div>
                <div className="bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${cacheProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Offline ready indicator */}
            {cacheProgress.message.includes('✅') && (
              <div className="mt-2 p-2 bg-green-100 rounded-md border border-green-200">
                <p className="text-xs text-green-700 font-medium">
                  🌐 App now works completely offline! You can use it without internet connection.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};