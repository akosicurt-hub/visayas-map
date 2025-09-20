export interface Placemark {
  accountNumber: string;
  accountName: string;
  latitude: number;
  longitude: number;
}

export interface SearchResult {
  found: boolean;
  placemark?: Placemark;
}

export interface CacheProgress {
  isActive: boolean;
  message: string;
  progress?: number;
}