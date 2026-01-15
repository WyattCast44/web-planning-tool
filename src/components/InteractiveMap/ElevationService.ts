/**
 * Elevation Service
 * 
 * Provides real-time elevation lookups using RGB-encoded terrain tiles.
 * Uses the Mapzen Terrarium format from AWS Open Data.
 */

import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import ImageTile from 'ol/ImageTile';
import type Map from 'ol/Map';
import type { Coordinate } from 'ol/coordinate';
import { 
  ElevationTileCache, 
  decodeTerrainumRgb,
  TERRAIN_TILE_SOURCE,
  type ElevationResult,
  type TileCacheEntry 
} from './mapUtils';

export class ElevationService {
  private map: Map | null = null;
  private terrainLayer: TileLayer<XYZ> | null = null;
  private terrainSource: XYZ | null = null;
  private tileCache: ElevationTileCache;
  private enabled: boolean = true;
  private offlineMode: boolean = false;
  private localTileUrl: string | null = null;

  constructor(cacheSize: number = 50) {
    this.tileCache = new ElevationTileCache(cacheSize);
  }

  /**
   * Initialize the elevation service with a map instance
   */
  initialize(map: Map, options?: { offlineMode?: boolean; localTileUrl?: string }): void {
    this.map = map;
    this.offlineMode = options?.offlineMode ?? false;
    this.localTileUrl = options?.localTileUrl ?? null;

    // Determine tile URL based on mode
    const tileUrl = this.offlineMode && this.localTileUrl 
      ? this.localTileUrl 
      : TERRAIN_TILE_SOURCE.url;

    // Create terrain tile source (invisible - only for data)
    this.terrainSource = new XYZ({
      url: tileUrl,
      crossOrigin: 'anonymous',
      maxZoom: TERRAIN_TILE_SOURCE.maxZoom,
    });

    // Create invisible terrain layer
    this.terrainLayer = new TileLayer({
      source: this.terrainSource,
      visible: false, // Hidden - only used for elevation data
      className: 'terrain-elevation-layer',
    });

    // Add layer to map (at bottom)
    map.getLayers().insertAt(0, this.terrainLayer);

    // Setup tile load handlers for caching
    this.setupTileHandlers();
  }

  /**
   * Setup handlers to cache tile data when tiles load
   */
  private setupTileHandlers(): void {
    if (!this.terrainSource) return;

    this.terrainSource.on('tileloadend', (event) => {
      const tile = event.tile as ImageTile;
      const image = tile.getImage() as HTMLImageElement;
      const tileCoord = tile.getTileCoord();
      const key = tileCoord.join('/');

      // Skip if already cached
      if (this.tileCache.has(key)) return;

      try {
        // Create canvas to extract pixel data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        this.tileCache.set(key, {
          data: imageData,
          width: canvas.width,
          height: canvas.height,
        });
      } catch (error) {
        // CORS or other error - silently ignore
        console.debug('Failed to cache terrain tile:', key, error);
      }
    });
  }

  /**
   * Get elevation at a coordinate
   */
  getElevation(coordinate: Coordinate): ElevationResult {
    if (!this.enabled || !this.map || !this.terrainSource) {
      return { elevation: null, status: 'error', message: 'Service not initialized' };
    }

    const view = this.map.getView();
    const resolution = view.getResolution();
    if (!resolution) {
      return { elevation: null, status: 'error', message: 'Invalid map state' };
    }

    // Get tile grid and calculate tile coordinate
    const tileGrid = this.terrainSource.getTileGrid();
    if (!tileGrid) {
      return { elevation: null, status: 'error', message: 'Tile grid not available' };
    }

    // Use a fixed zoom level for terrain lookups (lower zoom = faster, higher = more precise)
    // We use the current view zoom but cap it at the terrain source max
    const viewZoom = view.getZoom() ?? 10;
    const z = Math.min(Math.floor(viewZoom), TERRAIN_TILE_SOURCE.maxZoom);
    
    const tileCoord = tileGrid.getTileCoordForCoordAndZ(coordinate, z);
    const key = tileCoord.join('/');

    // Check cache
    const cached = this.tileCache.get(key);
    if (!cached) {
      // Trigger tile load if not loaded
      this.preloadTile(coordinate, z);
      return { elevation: null, status: 'tile_not_loaded', message: 'Loading elevation data...' };
    }

    // Calculate pixel position within tile
    const tileExtent = tileGrid.getTileCoordExtent(tileCoord);
    if (!tileExtent) {
      return { elevation: null, status: 'error', message: 'Invalid tile extent' };
    }

    const pixelX = Math.floor(
      ((coordinate[0] - tileExtent[0]) / (tileExtent[2] - tileExtent[0])) * cached.width
    );
    const pixelY = Math.floor(
      ((tileExtent[3] - coordinate[1]) / (tileExtent[3] - tileExtent[1])) * cached.height
    );

    // Bounds check
    if (pixelX < 0 || pixelX >= cached.width || pixelY < 0 || pixelY >= cached.height) {
      return { elevation: null, status: 'error', message: 'Coordinate out of tile bounds' };
    }

    // Read RGB values
    const index = (pixelY * cached.width + pixelX) * 4;
    const r = cached.data.data[index];
    const g = cached.data.data[index + 1];
    const b = cached.data.data[index + 2];

    // Check for no-data (pure black or specific no-data values)
    if (r === 0 && g === 0 && b === 0) {
      return { elevation: null, status: 'no_data', message: 'No elevation data' };
    }

    // Decode elevation
    const elevation = decodeTerrainumRgb(r, g, b);

    // Sanity check
    if (elevation < -500 || elevation > 9000) {
      return { elevation: null, status: 'error', message: 'Suspicious elevation value' };
    }

    return { elevation, status: 'success' };
  }

  /**
   * Preload a tile at a specific coordinate and zoom
   */
  private preloadTile(coordinate: Coordinate, z: number): void {
    if (!this.terrainSource) return;

    const tileGrid = this.terrainSource.getTileGrid();
    if (!tileGrid) return;

    const tileCoord = tileGrid.getTileCoordForCoordAndZ(coordinate, z);
    
    // Request the tile through the source
    // This will trigger the tileloadend event when loaded
    this.terrainSource.getTile(tileCoord[0], tileCoord[1], tileCoord[2], 1, this.map!.getView().getProjection());
  }

  /**
   * Get elevation along a line (for profiles)
   */
  getElevationProfile(coordinates: Coordinate[], numSamples?: number): ElevationResult[] {
    const samples = numSamples ?? coordinates.length;
    const results: ElevationResult[] = [];

    if (coordinates.length < 2) {
      return coordinates.map(coord => this.getElevation(coord));
    }

    // Interpolate along the line
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const coord = this.interpolateCoordinate(coordinates, t);
      results.push(this.getElevation(coord));
    }

    return results;
  }

  /**
   * Interpolate a coordinate along a path
   */
  private interpolateCoordinate(coordinates: Coordinate[], t: number): Coordinate {
    if (coordinates.length === 0) return [0, 0];
    if (coordinates.length === 1) return coordinates[0];
    if (t <= 0) return coordinates[0];
    if (t >= 1) return coordinates[coordinates.length - 1];

    // Calculate total length
    let totalLength = 0;
    const segmentLengths: number[] = [];
    for (let i = 1; i < coordinates.length; i++) {
      const dx = coordinates[i][0] - coordinates[i - 1][0];
      const dy = coordinates[i][1] - coordinates[i - 1][1];
      const length = Math.sqrt(dx * dx + dy * dy);
      segmentLengths.push(length);
      totalLength += length;
    }

    // Find segment and interpolate
    const targetLength = t * totalLength;
    let accumulatedLength = 0;

    for (let i = 0; i < segmentLengths.length; i++) {
      if (accumulatedLength + segmentLengths[i] >= targetLength) {
        const segmentT = (targetLength - accumulatedLength) / segmentLengths[i];
        return [
          coordinates[i][0] + segmentT * (coordinates[i + 1][0] - coordinates[i][0]),
          coordinates[i][1] + segmentT * (coordinates[i + 1][1] - coordinates[i][1]),
        ];
      }
      accumulatedLength += segmentLengths[i];
    }

    return coordinates[coordinates.length - 1];
  }

  /**
   * Enable or disable elevation lookups
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.map !== null && this.terrainSource !== null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.tileCache.size,
      maxSize: 50, // Default max size
    };
  }

  /**
   * Clear the tile cache
   */
  clearCache(): void {
    this.tileCache.clear();
  }

  /**
   * Cleanup when component unmounts
   */
  destroy(): void {
    if (this.map && this.terrainLayer) {
      this.map.removeLayer(this.terrainLayer);
    }
    this.terrainLayer = null;
    this.terrainSource = null;
    this.map = null;
    this.tileCache.clear();
  }
}

// Singleton instance for global access
let elevationServiceInstance: ElevationService | null = null;

export function getElevationService(): ElevationService {
  if (!elevationServiceInstance) {
    elevationServiceInstance = new ElevationService();
  }
  return elevationServiceInstance;
}

export function resetElevationService(): void {
  if (elevationServiceInstance) {
    elevationServiceInstance.destroy();
    elevationServiceInstance = null;
  }
}
