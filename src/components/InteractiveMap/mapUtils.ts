/**
 * Interactive Map Utilities
 * 
 * Provides coordinate conversions, elevation decoding, and export functionality.
 */

import { transform } from 'ol/proj';
import { forward as toMgrs, toPoint as mgrsToPoint } from 'mgrs';

// ============================================================================
// TYPES
// ============================================================================

export type CoordinateFormat = 'decimal' | 'dms' | 'mgrs';

export interface Coordinate {
  lon: number;
  lat: number;
}

export interface FormattedCoordinate {
  primary: string;
  secondary?: string;
}

export interface ElevationResult {
  elevation: number | null;
  status: 'success' | 'no_data' | 'tile_not_loaded' | 'error';
  message?: string;
}

export interface DrawFeatureProperties {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'circle' | 'measurement';
  name: string;
  description?: string;
  coordinates: number[] | number[][] | number[][][];
  timestamp: string;
  // Circle-specific properties
  radius?: number; // in meters
  center?: [number, number]; // [lon, lat]
  // Measurement-specific properties
  distance?: number; // in meters
  area?: number; // in square meters
}

// ============================================================================
// COORDINATE CONVERSIONS
// ============================================================================

/**
 * Convert Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
 */
export function toWgs84(coordinate: number[]): Coordinate {
  const [lon, lat] = transform(coordinate, 'EPSG:3857', 'EPSG:4326');
  return { lon, lat };
}

/**
 * Convert WGS84 (EPSG:4326) to Web Mercator (EPSG:3857)
 */
export function toWebMercator(lon: number, lat: number): number[] {
  return transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
}

/**
 * Format decimal degrees to DMS (Degrees Minutes Seconds)
 */
export function decimalToDms(decimal: number, isLat: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
  
  const direction = isLat 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

/**
 * Convert coordinate to MGRS string
 */
export function coordinateToMgrs(lon: number, lat: number, precision: number = 5): string {
  try {
    // Clamp latitude to valid MGRS range (-80 to 84)
    const clampedLat = Math.max(-80, Math.min(84, lat));
    if (clampedLat !== lat) {
      return 'Outside MGRS range';
    }
    return toMgrs([lon, lat], precision);
  } catch (error) {
    return 'Invalid coordinates';
  }
}

/**
 * Convert MGRS string to WGS84 coordinate
 */
export function mgrsToCoordinate(mgrs: string): Coordinate | null {
  try {
    const point = mgrsToPoint(mgrs);
    if (point) {
      return { lon: point[0], lat: point[1] };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format coordinate based on selected format
 */
export function formatCoordinate(
  lon: number, 
  lat: number, 
  format: CoordinateFormat,
  precision: number = 6
): FormattedCoordinate {
  switch (format) {
    case 'decimal':
      return {
        primary: `${lat.toFixed(precision)}°, ${lon.toFixed(precision)}°`,
        secondary: `Lat: ${lat.toFixed(precision)} | Lon: ${lon.toFixed(precision)}`
      };
    
    case 'dms':
      return {
        primary: `${decimalToDms(lat, true)}, ${decimalToDms(lon, false)}`,
      };
    
    case 'mgrs':
      return {
        primary: coordinateToMgrs(lon, lat, 5),
        secondary: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
      };
    
    default:
      return { primary: `${lat.toFixed(6)}°, ${lon.toFixed(6)}°` };
  }
}

// ============================================================================
// ELEVATION (RGB TERRAIN DECODING)
// ============================================================================

/**
 * Decode Mapzen Terrarium RGB to elevation in meters
 * Formula: elevation = (R × 256 + G + B / 256) - 32768
 */
export function decodeTerrainumRgb(r: number, g: number, b: number): number {
  return (r * 256 + g + b / 256) - 32768;
}

/**
 * Convert elevation from meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Format elevation for display
 */
export function formatElevation(meters: number | null, showFeet: boolean = true): string {
  if (meters === null) return '---';
  
  const m = Math.round(meters);
  if (showFeet) {
    const ft = Math.round(metersToFeet(meters));
    return `${m}m / ${ft}ft`;
  }
  return `${m}m`;
}

// ============================================================================
// TILE CACHE FOR ELEVATION DATA
// ============================================================================

export interface TileCacheEntry {
  data: ImageData;
  width: number;
  height: number;
}

export class ElevationTileCache {
  private cache: Map<string, TileCacheEntry> = new Map();
  private keyOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  set(key: string, entry: TileCacheEntry): void {
    // Remove oldest entries if at capacity
    while (this.keyOrder.length >= this.maxSize) {
      const oldestKey = this.keyOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);
    this.keyOrder.push(key);
  }

  get(key: string): TileCacheEntry | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.keyOrder = [];
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// GEOJSON EXPORT/IMPORT
// ============================================================================

export interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  properties: {
    name: string;
    description?: string;
    featureType: 'point' | 'line' | 'polygon' | 'circle' | 'measurement';
    timestamp?: string;
    // Circle-specific properties
    radius?: number; // in meters
    center?: [number, number]; // [lon, lat]
    // Measurement-specific properties
    distance?: number; // in meters
    area?: number; // in square meters
  };
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Convert drawn features to GeoJSON FeatureCollection
 */
export function featuresToGeoJSON(features: DrawFeatureProperties[]): GeoJSONFeatureCollection {
  const geoJsonFeatures: GeoJSONFeature[] = features.map(feature => {
    let geometry: GeoJSONFeature['geometry'];
    
    switch (feature.type) {
      case 'point':
        geometry = {
          type: 'Point',
          coordinates: feature.coordinates as number[],
        };
        break;
      
      case 'line':
      case 'measurement':
        geometry = {
          type: 'LineString',
          coordinates: feature.coordinates as number[][],
        };
        break;
      
      case 'polygon':
      case 'circle':
        geometry = {
          type: 'Polygon',
          coordinates: feature.coordinates as number[][][],
        };
        break;
      
      default:
        geometry = {
          type: 'Point',
          coordinates: feature.coordinates as number[],
        };
    }

    const properties: GeoJSONFeature['properties'] = {
      name: feature.name,
      description: feature.description,
      featureType: feature.type,
      timestamp: feature.timestamp,
    };

    // Add circle-specific properties
    if (feature.type === 'circle' && feature.radius !== undefined && feature.center) {
      properties.radius = feature.radius;
      properties.center = feature.center;
    }

    // Add measurement-specific properties
    if (feature.type === 'measurement' && feature.distance !== undefined) {
      properties.distance = feature.distance;
      if (feature.area !== undefined) {
        properties.area = feature.area;
      }
    }

    return {
      type: 'Feature',
      id: feature.id,
      properties,
      geometry,
    };
  });

  return {
    type: 'FeatureCollection',
    features: geoJsonFeatures,
  };
}

/**
 * Generate GeoJSON string from features
 */
export function generateGeoJSON(features: DrawFeatureProperties[], pretty: boolean = true): string {
  const featureCollection = featuresToGeoJSON(features);
  return pretty 
    ? JSON.stringify(featureCollection, null, 2)
    : JSON.stringify(featureCollection);
}

/**
 * Download GeoJSON file
 */
export function downloadGeoJSON(features: DrawFeatureProperties[], filename: string = 'export'): void {
  const geoJson = generateGeoJSON(features);
  const blob = new Blob([geoJson], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse GeoJSON file and convert to DrawFeatureProperties
 */
export function parseGeoJSON(geoJsonString: string): DrawFeatureProperties[] {
  try {
    const data = JSON.parse(geoJsonString);
    
    // Handle single feature
    if (data.type === 'Feature') {
      const feature = convertGeoJSONFeature(data);
      return feature ? [feature] : [];
    }
    
    // Handle feature collection
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      return data.features.map(convertGeoJSONFeature).filter((f: DrawFeatureProperties | null): f is DrawFeatureProperties => f !== null);
    }
    
    // Handle geometry directly
    if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(data.type)) {
      const feature = convertGeoJSONFeature({ type: 'Feature', properties: {}, geometry: data });
      return feature ? [feature] : [];
    }
    
    throw new Error('Invalid GeoJSON format');
  } catch (error) {
    console.error('Failed to parse GeoJSON:', error);
    throw error;
  }
}

/**
 * Convert a single GeoJSON feature to DrawFeatureProperties
 */
function convertGeoJSONFeature(feature: GeoJSONFeature | Record<string, unknown>): DrawFeatureProperties | null {
  if (!feature || typeof feature !== 'object') return null;
  
  const geom = feature.geometry as GeoJSONFeature['geometry'];
  const props = (feature.properties || {}) as Record<string, unknown>;
  
  if (!geom || !geom.type || !geom.coordinates) return null;
  
  let type: DrawFeatureProperties['type'];
  let coordinates: DrawFeatureProperties['coordinates'];
  
  switch (geom.type) {
    case 'Point': {
      const pointType = props.featureType as string | undefined;
      type = (pointType === 'point' || pointType === 'circle' || pointType === 'line' || pointType === 'polygon' || pointType === 'measurement') 
        ? pointType 
        : 'point';
      coordinates = geom.coordinates as number[];
      break;
    }
    
    case 'LineString':
      // Check if it's a measurement
      if (props.featureType === 'measurement' || props.distance !== undefined) {
        type = 'measurement';
      } else {
        type = 'line';
      }
      coordinates = geom.coordinates as number[][];
      break;
    
    case 'Polygon':
      // Check if it's a circle
      if (props.featureType === 'circle' || props.radius !== undefined) {
        type = 'circle';
      } else {
        type = 'polygon';
      }
      coordinates = geom.coordinates as number[][][];
      break;
    
    default:
      return null;
  }

  const result: DrawFeatureProperties = {
    id: (feature.id as string) || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: type as DrawFeatureProperties['type'],
    name: (props.name as string) || `Imported ${geom.type}`,
    description: props.description as string | undefined,
    coordinates,
    timestamp: (props.timestamp as string) || new Date().toISOString(),
  };

  // Add circle properties
  if (type === 'circle' && props.radius !== undefined) {
    result.radius = props.radius as number;
    result.center = props.center as [number, number];
  }

  // Add measurement properties
  if (type === 'measurement') {
    result.distance = props.distance as number | undefined;
    result.area = props.area as number | undefined;
  }

  return result;
}

/**
 * Import GeoJSON from file input
 */
export function importGeoJSONFile(file: File): Promise<DrawFeatureProperties[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const features = parseGeoJSON(content);
        resolve(features);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ============================================================================
// GEOMETRY UTILITIES
// ============================================================================

/**
 * Calculate the distance between two points in meters (Haversine formula)
 */
export function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLon = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total distance of a line (array of coordinates) in meters
 */
export function calculateLineDistance(coordinates: number[][]): number {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += calculateDistance(
      coordinates[i - 1] as [number, number],
      coordinates[i] as [number, number]
    );
  }
  return total;
}

/**
 * Calculate the area of a polygon in square meters (Shoelace formula with spherical correction)
 */
export function calculatePolygonArea(coordinates: number[][][]): number {
  const ring = coordinates[0]; // Outer ring
  if (!ring || ring.length < 3) return 0;

  // Use spherical excess formula for accurate area calculation
  const R = 6371000; // Earth's radius in meters
  let total = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    
    // Convert to radians
    const lon1 = p1[0] * Math.PI / 180;
    const lat1 = p1[1] * Math.PI / 180;
    const lon2 = p2[0] * Math.PI / 180;
    const lat2 = p2[1] * Math.PI / 180;

    total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  return Math.abs(total * R * R / 2);
}

/**
 * Generate circle polygon coordinates given center and radius
 * @param center [lon, lat] in degrees
 * @param radius in meters
 * @param numPoints number of points to generate (default 64)
 */
export function generateCirclePolygon(
  center: [number, number], 
  radius: number, 
  numPoints: number = 64
): number[][][] {
  const coordinates: number[][] = [];
  const [centerLon, centerLat] = center;
  
  // Earth's radius in meters
  const R = 6371000;
  
  // Angular distance in radians
  const angularDistance = radius / R;
  
  for (let i = 0; i <= numPoints; i++) {
    const bearing = (2 * Math.PI * i) / numPoints;
    
    // Convert center to radians
    const lat1 = centerLat * Math.PI / 180;
    const lon1 = centerLon * Math.PI / 180;
    
    // Calculate destination point
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    
    const lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    // Convert back to degrees
    coordinates.push([
      lon2 * 180 / Math.PI,
      lat2 * 180 / Math.PI
    ]);
  }
  
  // Ensure the ring is closed
  if (coordinates.length > 0) {
    coordinates.push([...coordinates[0]]);
  }
  
  return [coordinates];
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number, useNauticalMiles: boolean = false): string {
  if (useNauticalMiles) {
    const nm = meters / 1852;
    if (nm < 0.1) return `${Math.round(meters)}m`;
    if (nm < 1) return `${(nm * 1000).toFixed(0)}m`;
    return `${nm.toFixed(2)} NM`;
  } else {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(2)} km`;
  }
}

/**
 * Format area for display
 */
export function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) {
    return `${Math.round(sqMeters)} m²`;
  } else if (sqMeters < 1000000) {
    return `${(sqMeters / 10000).toFixed(2)} ha`;
  } else {
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  }
}

// ============================================================================
// BASEMAP DEFINITIONS
// ============================================================================

export interface BasemapDefinition {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  crossOrigin?: string;
}

export const DEFAULT_BASEMAPS: BasemapDefinition[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    crossOrigin: 'anonymous',
  },
  {
    id: 'osm-humanitarian',
    name: 'Humanitarian',
    url: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
    maxZoom: 19,
    crossOrigin: 'anonymous',
  },
  {
    id: 'opentopomap',
    name: 'OpenTopoMap',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
    crossOrigin: 'anonymous',
  },
  {
    id: 'carto-light',
    name: 'Carto Light',
    url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
    maxZoom: 20,
    crossOrigin: 'anonymous',
  },
  {
    id: 'carto-dark',
    name: 'Carto Dark',
    url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO',
    maxZoom: 20,
    crossOrigin: 'anonymous',
  },
  {
    id: 'esri-world-imagery',
    name: 'ESRI Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    crossOrigin: 'anonymous',
  },
  {
    id: 'stamen-terrain',
    name: 'Stadia Terrain',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    attribution: '© Stadia Maps, © Stamen Design, © OpenStreetMap contributors',
    maxZoom: 18,
    crossOrigin: 'anonymous',
  },
];

// Terrain tile source for elevation
export const TERRAIN_TILE_SOURCE = {
  id: 'terrarium',
  name: 'AWS Terrarium',
  url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  attribution: '© Mapzen, AWS Open Data',
  maxZoom: 15,
  crossOrigin: 'anonymous',
};

// ============================================================================
// SCALE BAR UTILITIES
// ============================================================================

/**
 * Format scale bar distance
 */
export function formatScaleDistance(meters: number, useNauticalMiles: boolean): string {
  if (useNauticalMiles) {
    const nm = meters / 1852;
    if (nm < 1) {
      return `${Math.round(nm * 1000)}m`;
    }
    return `${nm.toFixed(nm < 10 ? 1 : 0)} NM`;
  } else {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    const km = meters / 1000;
    return `${km.toFixed(km < 10 ? 1 : 0)} km`;
  }
}
