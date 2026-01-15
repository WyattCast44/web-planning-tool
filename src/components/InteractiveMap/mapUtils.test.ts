/**
 * Map Utilities Tests
 * 
 * Tests for coordinate conversions, elevation decoding, and export functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  toWgs84,
  toWebMercator,
  decimalToDms,
  coordinateToMgrs,
  mgrsToCoordinate,
  formatCoordinate,
  decodeTerrainumRgb,
  metersToFeet,
  formatElevation,
  ElevationTileCache,
  formatScaleDistance,
  DEFAULT_BASEMAPS,
  TERRAIN_TILE_SOURCE,
} from './mapUtils';

// ============================================================================
// COORDINATE CONVERSION TESTS
// ============================================================================

describe('Coordinate Conversions', () => {
  describe('toWgs84', () => {
    it('converts Web Mercator to WGS84 correctly', () => {
      // Las Vegas approximate coordinates
      const webMercator = [-12815721.5, 4311357.5];
      const result = toWgs84(webMercator);
      
      expect(result.lon).toBeCloseTo(-115.14, 1);
      expect(result.lat).toBeCloseTo(36.17, 1);
    });

    it('handles origin coordinates', () => {
      const result = toWgs84([0, 0]);
      
      expect(result.lon).toBeCloseTo(0, 5);
      expect(result.lat).toBeCloseTo(0, 5);
    });

    it('handles negative coordinates', () => {
      // Southern hemisphere, western hemisphere
      const webMercator = [-5009377.1, -5009377.1];
      const result = toWgs84(webMercator);
      
      expect(result.lon).toBeLessThan(0);
      expect(result.lat).toBeLessThan(0);
    });
  });

  describe('toWebMercator', () => {
    it('converts WGS84 to Web Mercator correctly', () => {
      const result = toWebMercator(-115.14, 36.17);
      
      expect(result[0]).toBeCloseTo(-12815721.5, -2);
      expect(result[1]).toBeCloseTo(4311357.5, -2);
    });

    it('handles origin coordinates', () => {
      const result = toWebMercator(0, 0);
      
      expect(result[0]).toBeCloseTo(0, 5);
      expect(result[1]).toBeCloseTo(0, 5);
    });

    it('is inverse of toWgs84', () => {
      const original = [-115.14, 36.17];
      const webMercator = toWebMercator(original[0], original[1]);
      const backToWgs84 = toWgs84(webMercator);
      
      expect(backToWgs84.lon).toBeCloseTo(original[0], 5);
      expect(backToWgs84.lat).toBeCloseTo(original[1], 5);
    });
  });

  describe('decimalToDms', () => {
    it('converts positive latitude correctly', () => {
      const result = decimalToDms(36.1699, true);
      
      expect(result).toContain('36°');
      expect(result).toContain('N');
    });

    it('converts negative latitude correctly', () => {
      const result = decimalToDms(-33.8688, true);
      
      expect(result).toContain('33°');
      expect(result).toContain('S');
    });

    it('converts positive longitude correctly', () => {
      const result = decimalToDms(151.2093, false);
      
      expect(result).toContain('151°');
      expect(result).toContain('E');
    });

    it('converts negative longitude correctly', () => {
      const result = decimalToDms(-115.1398, false);
      
      expect(result).toContain('115°');
      expect(result).toContain('W');
    });

    it('handles zero correctly', () => {
      const latResult = decimalToDms(0, true);
      const lonResult = decimalToDms(0, false);
      
      expect(latResult).toContain('0°');
      expect(lonResult).toContain('0°');
    });

    it('formats minutes and seconds correctly', () => {
      // 36.5 degrees = 36° 30' 0"
      const result = decimalToDms(36.5, true);
      
      expect(result).toContain('36°');
      expect(result).toContain("30'");
    });
  });

  describe('coordinateToMgrs', () => {
    it('converts valid coordinates to MGRS', () => {
      // Las Vegas area
      const result = coordinateToMgrs(-115.1398, 36.1699);
      
      expect(result).toMatch(/^\d{1,2}[A-Z]\s?[A-Z]{2}\s?\d+$/);
    });

    it('handles coordinates at MGRS boundary', () => {
      // Near equator
      const result = coordinateToMgrs(0, 0);
      
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid coordinates');
    });

    it('returns error message for out-of-range latitude', () => {
      // Beyond MGRS range (> 84°N)
      const result = coordinateToMgrs(0, 85);
      
      expect(result).toBe('Outside MGRS range');
    });

    it('returns error message for south polar region', () => {
      // Beyond MGRS range (< 80°S)
      const result = coordinateToMgrs(0, -81);
      
      expect(result).toBe('Outside MGRS range');
    });

    it('respects precision parameter', () => {
      const lowPrecision = coordinateToMgrs(-115.1398, 36.1699, 1);
      const highPrecision = coordinateToMgrs(-115.1398, 36.1699, 5);
      
      // Higher precision should have more digits
      expect(highPrecision.length).toBeGreaterThan(lowPrecision.length);
    });
  });

  describe('mgrsToCoordinate', () => {
    it('converts valid MGRS to coordinates', () => {
      // Test with a known MGRS string
      const result = mgrsToCoordinate('11SQA1234567890');
      
      expect(result).not.toBeNull();
      expect(result?.lon).toBeDefined();
      expect(result?.lat).toBeDefined();
    });

    it('returns null for invalid MGRS', () => {
      const result = mgrsToCoordinate('INVALID');
      
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = mgrsToCoordinate('');
      
      expect(result).toBeNull();
    });
  });

  describe('formatCoordinate', () => {
    const testLon = -115.1398;
    const testLat = 36.1699;

    it('formats decimal coordinates correctly', () => {
      const result = formatCoordinate(testLon, testLat, 'decimal');
      
      expect(result.primary).toContain('36.1699');
      expect(result.primary).toContain('-115.1398');
    });

    it('formats DMS coordinates correctly', () => {
      const result = formatCoordinate(testLon, testLat, 'dms');
      
      expect(result.primary).toContain('N');
      expect(result.primary).toContain('W');
      expect(result.primary).toContain('°');
    });

    it('formats MGRS coordinates correctly', () => {
      const result = formatCoordinate(testLon, testLat, 'mgrs');
      
      expect(result.primary).toBeTruthy();
      // MGRS should also include secondary decimal coordinates
      expect(result.secondary).toBeTruthy();
    });

    it('respects precision parameter', () => {
      const lowPrecision = formatCoordinate(testLon, testLat, 'decimal', 2);
      const highPrecision = formatCoordinate(testLon, testLat, 'decimal', 6);
      
      expect(lowPrecision.primary).toContain('36.17');
      expect(highPrecision.primary).toContain('36.169900');
    });
  });
});

// ============================================================================
// ELEVATION DECODING TESTS
// ============================================================================

describe('Elevation Decoding', () => {
  describe('decodeTerrainumRgb', () => {
    it('decodes sea level correctly', () => {
      // Sea level in Terrarium encoding: R=128, G=0, B=0
      // elevation = (128 * 256 + 0 + 0/256) - 32768 = 0
      const result = decodeTerrainumRgb(128, 0, 0);
      
      expect(result).toBeCloseTo(0, 1);
    });

    it('decodes positive elevation correctly', () => {
      // 1000m elevation
      // 1000 = (R * 256 + G + B/256) - 32768
      // R * 256 + G = 33768
      // R = 131, G = 232 (approximately)
      const result = decodeTerrainumRgb(131, 232, 0);
      
      expect(result).toBeCloseTo(1000, 0);
    });

    it('decodes negative elevation correctly', () => {
      // -100m (below sea level)
      // -100 = (R * 256 + G + B/256) - 32768
      // R * 256 + G = 32668
      // R = 127, G = 156
      const result = decodeTerrainumRgb(127, 156, 0);
      
      expect(result).toBeCloseTo(-100, 0);
    });

    it('handles minimum possible value', () => {
      const result = decodeTerrainumRgb(0, 0, 0);
      
      expect(result).toBe(-32768);
    });

    it('handles maximum possible value', () => {
      const result = decodeTerrainumRgb(255, 255, 255);
      
      expect(result).toBeCloseTo(32767 + 255/256, 0);
    });

    it('includes blue channel for sub-meter precision', () => {
      const withoutBlue = decodeTerrainumRgb(128, 0, 0);
      const withBlue = decodeTerrainumRgb(128, 0, 128);
      
      expect(withBlue - withoutBlue).toBeCloseTo(0.5, 2);
    });
  });

  describe('metersToFeet', () => {
    it('converts meters to feet correctly', () => {
      expect(metersToFeet(1)).toBeCloseTo(3.28084, 4);
      expect(metersToFeet(100)).toBeCloseTo(328.084, 2);
      expect(metersToFeet(1000)).toBeCloseTo(3280.84, 1);
    });

    it('handles zero', () => {
      expect(metersToFeet(0)).toBe(0);
    });

    it('handles negative values', () => {
      expect(metersToFeet(-100)).toBeCloseTo(-328.084, 2);
    });
  });

  describe('formatElevation', () => {
    it('formats elevation with both units', () => {
      const result = formatElevation(1000, true);
      
      expect(result).toContain('1000m');
      expect(result).toContain('3281ft');
    });

    it('formats elevation with meters only', () => {
      const result = formatElevation(1000, false);
      
      expect(result).toBe('1000m');
      expect(result).not.toContain('ft');
    });

    it('handles null elevation', () => {
      const result = formatElevation(null);
      
      expect(result).toBe('---');
    });

    it('rounds values appropriately', () => {
      const result = formatElevation(1000.7, true);
      
      expect(result).toContain('1001m');
    });

    it('handles negative elevation', () => {
      const result = formatElevation(-50, true);
      
      expect(result).toContain('-50m');
      expect(result).toContain('-164ft');
    });
  });
});

// ============================================================================
// TILE CACHE TESTS
// ============================================================================

describe('ElevationTileCache', () => {
  let cache: ElevationTileCache;

  beforeEach(() => {
    cache = new ElevationTileCache(3); // Small cache for testing
  });

  it('stores and retrieves entries', () => {
    const mockImageData = new ImageData(256, 256);
    const entry = { data: mockImageData, width: 256, height: 256 };
    
    cache.set('10/123/456', entry);
    
    expect(cache.has('10/123/456')).toBe(true);
    expect(cache.get('10/123/456')).toBe(entry);
  });

  it('returns undefined for missing entries', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('evicts oldest entries when at capacity', () => {
    const mockImageData = new ImageData(256, 256);
    
    cache.set('1', { data: mockImageData, width: 256, height: 256 });
    cache.set('2', { data: mockImageData, width: 256, height: 256 });
    cache.set('3', { data: mockImageData, width: 256, height: 256 });
    
    expect(cache.size).toBe(3);
    
    // Add fourth entry, should evict first
    cache.set('4', { data: mockImageData, width: 256, height: 256 });
    
    expect(cache.size).toBe(3);
    expect(cache.has('1')).toBe(false);
    expect(cache.has('4')).toBe(true);
  });

  it('clears all entries', () => {
    const mockImageData = new ImageData(256, 256);
    
    cache.set('1', { data: mockImageData, width: 256, height: 256 });
    cache.set('2', { data: mockImageData, width: 256, height: 256 });
    
    cache.clear();
    
    expect(cache.size).toBe(0);
    expect(cache.has('1')).toBe(false);
  });

  it('tracks size correctly', () => {
    const mockImageData = new ImageData(256, 256);
    
    expect(cache.size).toBe(0);
    
    cache.set('1', { data: mockImageData, width: 256, height: 256 });
    expect(cache.size).toBe(1);
    
    cache.set('2', { data: mockImageData, width: 256, height: 256 });
    expect(cache.size).toBe(2);
  });
});

// ============================================================================
// SCALE FORMATTING TESTS
// ============================================================================

describe('Scale Formatting', () => {
  describe('formatScaleDistance', () => {
    it('formats meters when distance is small', () => {
      const result = formatScaleDistance(500, false);
      
      expect(result).toBe('500m');
    });

    it('formats kilometers when distance is large', () => {
      const result = formatScaleDistance(5000, false);
      
      expect(result).toBe('5.0 km');
    });

    it('formats nautical miles correctly', () => {
      const result = formatScaleDistance(1852, true); // 1 NM = 1852m
      
      expect(result).toBe('1.0 NM');
    });

    it('formats small NM distances in meters', () => {
      const result = formatScaleDistance(500, true);
      
      expect(result).toContain('m');
    });

    it('rounds appropriately for large distances', () => {
      const result = formatScaleDistance(25000, false);
      
      expect(result).toBe('25 km');
    });
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Constants', () => {
  describe('DEFAULT_BASEMAPS', () => {
    it('contains expected basemap options', () => {
      expect(DEFAULT_BASEMAPS.length).toBeGreaterThan(0);
      
      const ids = DEFAULT_BASEMAPS.map(b => b.id);
      expect(ids).toContain('osm');
      expect(ids).toContain('opentopomap');
    });

    it('has required properties for each basemap', () => {
      DEFAULT_BASEMAPS.forEach(basemap => {
        expect(basemap.id).toBeTruthy();
        expect(basemap.name).toBeTruthy();
        expect(basemap.url).toBeTruthy();
        expect(basemap.attribution).toBeTruthy();
      });
    });

    it('has valid URLs with placeholders', () => {
      DEFAULT_BASEMAPS.forEach(basemap => {
        expect(basemap.url).toContain('{z}');
        expect(basemap.url).toContain('{x}');
        expect(basemap.url).toContain('{y}');
      });
    });
  });

  describe('TERRAIN_TILE_SOURCE', () => {
    it('has correct AWS URL', () => {
      expect(TERRAIN_TILE_SOURCE.url).toContain('s3.amazonaws.com');
      expect(TERRAIN_TILE_SOURCE.url).toContain('elevation-tiles-prod');
      expect(TERRAIN_TILE_SOURCE.url).toContain('terrarium');
    });

    it('has appropriate max zoom', () => {
      expect(TERRAIN_TILE_SOURCE.maxZoom).toBe(15);
    });
  });
});
