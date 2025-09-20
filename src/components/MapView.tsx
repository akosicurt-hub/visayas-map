import React, { useRef, useEffect } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Placemark } from '../types';

// Fix for default markers
if (L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
}
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom user location icon (arrow)
const createUserLocationIcon = (heading: number = 0) => {
  return L.divIcon({
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #4285f4;
        border: 3px solid white;
        border-radius: 50%;
        position: relative;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        <div style="
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) rotate(${heading}deg);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 12px solid #1a73e8;
        "></div>
      </div>
    `,
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

interface MapViewProps {
  selectedPlacemark: Placemark | null;
}

export const MapView: React.FC<MapViewProps> = ({ selectedPlacemark }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center: [10.3, 123.9], // Cebu, Visayas, Philippines
      zoom: 7,
      maxZoom: 20,
      zoomControl: true,
      attributionControl: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    // Start watching user location
    startLocationTracking();
    return () => {
      // Stop watching location
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache position for 1 minute
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateUserLocation(position);
      },
      (error) => {
        console.warn('Error getting initial location:', error.message);
      },
      options
    );

    // Watch position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        updateUserLocation(position);
      },
      (error) => {
        console.warn('Error watching location:', error.message);
      },
      options
    );
  };

  const updateUserLocation = (position: GeolocationPosition) => {
    if (!mapRef.current) return;

    const { latitude, longitude, heading } = position.coords;
    const userLatLng: [number, number] = [latitude, longitude];

    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      mapRef.current.removeLayer(userLocationMarkerRef.current);
    }

    // Create new user location marker with heading
    const userIcon = createUserLocationIcon(heading || 0);
    const userMarker = L.marker(userLatLng, { icon: userIcon })
      .addTo(mapRef.current)
      .bindPopup(
        `<div class="p-2">
          <h3 class="font-bold text-blue-600">Your Location</h3>
          <p class="text-xs text-gray-500 mt-1">
            ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
          </p>
          ${heading ? `<p class="text-xs text-gray-500">Heading: ${Math.round(heading)}°</p>` : ''}
        </div>`,
        {
          maxWidth: 200,
          className: 'custom-popup'
        }
      );

    userLocationMarkerRef.current = userMarker;

    // Add accuracy circle if available
    if (position.coords.accuracy) {
      L.circle(userLatLng, {
        radius: position.coords.accuracy,
        fillColor: '#4285f4',
        fillOpacity: 0.1,
        color: '#4285f4',
        weight: 1,
        opacity: 0.3
      }).addTo(mapRef.current);
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    // Add new marker if placemark is selected
    if (selectedPlacemark) {
      const marker = L.marker([selectedPlacemark.latitude, selectedPlacemark.longitude])
        .addTo(mapRef.current)
        .bindPopup(
          `<div class="p-2">
            <h3 class="font-bold text-gray-800">${selectedPlacemark.accountName}</h3>
            <p class="text-sm text-gray-600">Account: ${selectedPlacemark.accountNumber}</p>
            <p class="text-xs text-gray-500 mt-1">
              ${selectedPlacemark.latitude.toFixed(6)}, ${selectedPlacemark.longitude.toFixed(6)}
            </p>
          </div>`,
          {
            maxWidth: 300,
            className: 'custom-popup'
          }
        )
        .openPopup();

      markerRef.current = marker;

      // Center and zoom to marker
      mapRef.current.setView([selectedPlacemark.latitude, selectedPlacemark.longitude], 20, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedPlacemark]);

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-100"
        style={{ minHeight: '400px' }}
      />
      
      {/* Map attribution overlay */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-2 py-1 rounded text-xs text-gray-600">
        Visayas, Philippines - 🌐 Offline Ready
      </div>
      
      {/* Location permission notice */}
      <div className="absolute top-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800 max-w-48">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Your location (if enabled)</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Maps work offline</span>
        </div>
      </div>
    </div>
  );
};