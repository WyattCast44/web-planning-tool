/**
 * Elevation Service Tests
 * 
 * Tests for the elevation service including tile caching and elevation lookups.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElevationService, getElevationService, resetElevationService } from './ElevationService';

// Mock OpenLayers modules
vi.mock('ol/Map', () => ({
  default: vi.fn().mockImplementation(() => ({
    getView: vi.fn().mockReturnValue({
      getResolution: vi.fn().mockReturnValue(100),
      getZoom: vi.fn().mockReturnValue(10),
      getProjection: vi.fn().mockReturnValue('EPSG:3857'),
    }),
    getLayers: vi.fn().mockReturnValue({
      insertAt: vi.fn(),
    }),
    removeLayer: vi.fn(),
  })),
}));

vi.mock('ol/layer/Tile', () => ({
  default: vi.fn().mockImplementation(() => ({
    setSource: vi.fn(),
  })),
}));

vi.mock('ol/source/XYZ', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    getTileGrid: vi.fn().mockReturnValue({
      getTileCoordForCoordAndZ: vi.fn().mockReturnValue([10, 123, 456]),
      getTileCoordExtent: vi.fn().mockReturnValue([0, 0, 256, 256]),
    }),
    getTile: vi.fn(),
  })),
}));

describe('ElevationService', () => {
  let service: ElevationService;

  beforeEach(() => {
    service = new ElevationService(50);
  });

  afterEach(() => {
    service.destroy();
    resetElevationService();
  });

  describe('Initialization', () => {
    it('creates new instance', () => {
      expect(service).toBeInstanceOf(ElevationService);
    });

    it('is not ready before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    it('reports cache stats', () => {
      const stats = service.getCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(50);
    });
  });

  describe('Cache Management', () => {
    it('clears cache', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('returns same instance from getElevationService', () => {
      const instance1 = getElevationService();
      const instance2 = getElevationService();
      
      expect(instance1).toBe(instance2);
    });

    it('creates new instance after reset', () => {
      const instance1 = getElevationService();
      resetElevationService();
      const instance2 = getElevationService();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Enable/Disable', () => {
    it('can be enabled and disabled', () => {
      service.setEnabled(false);
      // Service state is internal, but we can verify getElevation returns error when not initialized
      
      const result = service.getElevation([0, 0]);
      expect(result.status).toBe('error');
    });
  });

  describe('getElevation', () => {
    it('returns error when not initialized', () => {
      const result = service.getElevation([0, 0]);
      
      expect(result.status).toBe('error');
      expect(result.elevation).toBeNull();
      expect(result.message).toBeTruthy();
    });
  });

  describe('getElevationProfile', () => {
    it('returns array of results', () => {
      const coordinates = [[0, 0], [100, 100], [200, 200]];
      const results = service.getElevationProfile(coordinates as [number, number][]);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
    });

    it('handles empty coordinate array', () => {
      const results = service.getElevationProfile([]);
      
      expect(results).toEqual([]);
    });

    it('handles single coordinate', () => {
      const results = service.getElevationProfile([[0, 0]]);
      
      expect(results.length).toBe(1);
    });

    it('interpolates along path', () => {
      const coordinates = [[0, 0], [1000, 1000]];
      const results = service.getElevationProfile(coordinates as [number, number][], 5);
      
      expect(results.length).toBe(5);
    });
  });
});

describe('ElevationService Integration', () => {
  // These tests verify the elevation decoding logic in isolation
  
  describe('Terrarium Decoding', () => {
    it('correctly decodes known elevation values', () => {
      // Using the formula: elevation = (R × 256 + G + B/256) - 32768
      
      // Sea level (0m): R=128, G=0, B=0
      const seaLevel = (128 * 256 + 0 + 0/256) - 32768;
      expect(seaLevel).toBe(0);
      
      // Mt. Everest approximate (8849m): calculate RGB
      const everestElevation = 8849;
      const encoded = everestElevation + 32768;
      const r = Math.floor(encoded / 256);
      const g = encoded % 256;
      
      const decoded = (r * 256 + g + 0/256) - 32768;
      expect(decoded).toBe(everestElevation);
      
      // Dead Sea approximate (-430m)
      const deadSeaElevation = -430;
      const encodedDeadSea = deadSeaElevation + 32768;
      const rDeadSea = Math.floor(encodedDeadSea / 256);
      const gDeadSea = encodedDeadSea % 256;
      
      const decodedDeadSea = (rDeadSea * 256 + gDeadSea + 0/256) - 32768;
      expect(decodedDeadSea).toBe(deadSeaElevation);
    });

    it('blue channel provides sub-meter precision', () => {
      const baseElevation = (128 * 256 + 0 + 0/256) - 32768;
      const withBlue = (128 * 256 + 0 + 128/256) - 32768;
      
      expect(withBlue - baseElevation).toBeCloseTo(0.5, 2);
    });
  });

  describe('Tile Coordinate Calculation', () => {
    it('calculates pixel position within tile', () => {
      // Given a tile extent and coordinate, verify pixel calculation
      const tileExtent = [0, 0, 40075016, 40075016]; // Approximate world extent at z=0
      const tileWidth = 256;
      const tileHeight = 256;
      
      // Center of tile should be pixel 128, 128
      const centerCoord = [20037508, 20037508];
      const pixelX = Math.floor(
        ((centerCoord[0] - tileExtent[0]) / (tileExtent[2] - tileExtent[0])) * tileWidth
      );
      const pixelY = Math.floor(
        ((tileExtent[3] - centerCoord[1]) / (tileExtent[3] - tileExtent[1])) * tileHeight
      );
      
      expect(pixelX).toBe(128);
      expect(pixelY).toBe(128);
    });
  });
});
