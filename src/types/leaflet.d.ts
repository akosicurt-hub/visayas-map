// Type definitions for Leaflet integration
declare module 'leaflet' {
  interface Icon {
    Default: {
      prototype: any;
      mergeOptions(options: any): void;
    };
  }
}