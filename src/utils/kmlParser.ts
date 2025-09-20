import { Placemark } from '../types';

export class KMLParser {
  static async parseKML(file: File, onProgress?: (progress: number) => void): Promise<Placemark[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const xmlString = event.target?.result as string;
          const placemarks = this.extractPlacemarks(xmlString, onProgress);
          resolve(placemarks);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private static extractPlacemarks(xmlString: string, onProgress?: (progress: number) => void): Placemark[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Handle parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid KML format');
    }

    const placemarkElements = xmlDoc.getElementsByTagName('Placemark');
    const placemarks: Placemark[] = [];

    for (let i = 0; i < placemarkElements.length; i++) {
      const element = placemarkElements[i];
      
      try {
        const placemark = this.parsePlacemark(element);
        if (placemark) {
          placemarks.push(placemark);
        }
      } catch (error) {
        console.warn(`Skipped placemark ${i}: ${error}`);
      }

      // Report progress every 1000 items
      if (onProgress && i % 1000 === 0) {
        onProgress((i / placemarkElements.length) * 100);
      }
    }

    if (onProgress) {
      onProgress(100);
    }

    return placemarks;
  }

  private static parsePlacemark(element: Element): Placemark | null {
    const nameElement = element.getElementsByTagName('name')[0];
    const coordsElement = element.getElementsByTagName('coordinates')[0];

    if (!nameElement || !coordsElement) {
      return null;
    }

    const name = nameElement.textContent?.trim() || '';
    const coords = coordsElement.textContent?.trim() || '';

    // Parse coordinates (format: longitude,latitude,altitude or longitude,latitude)
    const coordParts = coords.split(',');
    if (coordParts.length < 2) {
      return null;
    }

    const longitude = parseFloat(coordParts[0]);
    const latitude = parseFloat(coordParts[1]);

    if (isNaN(longitude) || isNaN(latitude)) {
      return null;
    }

    // Extract account number and name from the placemark name
    // Handle various formats like:
    // "Account: 02-0646-1300 - Customer Name"
    // "02-0646-1300 - Customer Name"
    // "02-0646-1300"
    // "Account: 02-0646-1300"
    const match = name.match(/(?:Account:?\s*)?([0-9]{2}-[0-9]{4}-[0-9]{4}|[A-Z0-9-]+)(?:\s*-\s*(.+))?/i);
    
    let accountNumber = '';
    let accountName = '';

    if (match) {
      accountNumber = match[1].trim();
      accountName = match[2] ? match[2].trim() : name;
    } else {
      // Fallback: use the entire name as both account number and name
      accountNumber = name;
      accountName = name;
    }

    return {
      accountNumber,
      accountName,
      latitude,
      longitude
    };
  }
}