import { Placemark } from '../types';

const DB_NAME = 'KMLMapDB';
const DB_VERSION = 1;
const STORE_NAME = 'placemarks';

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'accountNumber' });
          store.createIndex('accountName', 'accountName', { unique: false });
        }
      };
    });
  }

  async storePlacemarks(placemarks: Placemark[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing data
      store.clear();

      // Add all placemarks
      placemarks.forEach(placemark => {
        store.add(placemark);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async searchPlacemark(query: string): Promise<Placemark | null> {
    if (!this.db) throw new Error('Database not initialized');

    const normalizedQuery = query.toLowerCase().trim();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      // Search by account number first - try both original query and normalized version
      const searchQueries = [
        query.trim(),
        query.replace(/\D/g, ''), // Remove all non-digits
        normalizedQuery
      ];
      
      let found = false;
      let searchIndex = 0;
      
      const tryNextSearch = () => {
        if (searchIndex >= searchQueries.length || found) {
          if (!found) {
            // Search by account name if no exact match found
            searchByName();
          }
          return;
        }
        
        const currentQuery = searchQueries[searchIndex];
        searchIndex++;
        
        const accountNumberRequest = store.get(currentQuery);
        
        accountNumberRequest.onsuccess = () => {
          if (accountNumberRequest.result && !found) {
            found = true;
            resolve(accountNumberRequest.result);
            return;
          }
          tryNextSearch();
        };
        
        accountNumberRequest.onerror = () => {
          tryNextSearch();
        };
      };
      
      const searchByName = () => {
        const nameIndex = store.index('accountName');
        const nameRequest = nameIndex.openCursor();
        
        nameRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && !found) {
            const placemark = cursor.value as Placemark;
            
            // Check if account name contains the search query
            if (placemark.accountName.toLowerCase().includes(normalizedQuery)) {
              found = true;
              resolve(placemark);
              return;
            }
            
            // Also check if the account number matches (with or without formatting)
            const accountNumberDigits = placemark.accountNumber.replace(/\D/g, '');
            const queryDigits = query.replace(/\D/g, '');
            
            if (queryDigits && accountNumberDigits.includes(queryDigits)) {
              found = true;
              resolve(placemark);
              return;
            }
            
            cursor.continue();
          } else if (!found) {
            resolve(null);
          }
        };
        
        nameRequest.onerror = () => reject(nameRequest.error);
      };

      // Start the search process
      tryNextSearch();
    });
  }

  async getPlacemarksCount(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBManager = new IndexedDBManager();