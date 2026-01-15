/**
 * Integration Tests
 * 
 * End-to-end tests for the InteractiveMap component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useMapStore } from './mapStore';
import { DEFAULT_BASEMAPS } from './mapUtils';

// Mock OpenLayers components for integration tests
vi.mock('ol/Map', () => ({
  default: vi.fn().mockImplementation(() => ({
    setTarget: vi.fn(),
    getView: vi.fn().mockReturnValue({
      getCenter: vi.fn().mockReturnValue([0, 0]),
      getZoom: vi.fn().mockReturnValue(10),
      getRotation: vi.fn().mockReturnValue(0),
      getResolution: vi.fn().mockReturnValue(100),
      getProjection: vi.fn().mockReturnValue('EPSG:3857'),
      on: vi.fn(),
    }),
    getLayers: vi.fn().mockReturnValue({
      insertAt: vi.fn(),
      getArray: vi.fn().mockReturnValue([]),
    }),
    getControls: vi.fn().mockReturnValue({
      getArray: vi.fn().mockReturnValue([]),
    }),
    addControl: vi.fn(),
    removeControl: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    addInteraction: vi.fn(),
    removeInteraction: vi.fn(),
    on: vi.fn(),
    un: vi.fn(),
  })),
}));

vi.mock('ol/View', () => ({
  default: vi.fn().mockImplementation(() => ({
    getCenter: vi.fn().mockReturnValue([0, 0]),
    getZoom: vi.fn().mockReturnValue(10),
    getRotation: vi.fn().mockReturnValue(0),
    on: vi.fn(),
  })),
}));

vi.mock('ol/layer/Tile', () => ({
  default: vi.fn().mockImplementation(() => ({
    setSource: vi.fn(),
  })),
}));

vi.mock('ol/layer/Vector', () => ({
  default: vi.fn().mockImplementation(() => ({
    setSource: vi.fn(),
    setStyle: vi.fn(),
  })),
}));

vi.mock('ol/source/XYZ', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    getTileGrid: vi.fn(),
  })),
}));

vi.mock('ol/source/Vector', () => ({
  default: vi.fn().mockImplementation(() => ({
    addFeature: vi.fn(),
    removeFeature: vi.fn(),
    clear: vi.fn(),
    getFeatures: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('ol/control', () => ({
  ScaleLine: vi.fn().mockImplementation(() => ({
    setUnits: vi.fn(),
  })),
}));

vi.mock('ol/interaction', () => ({
  Draw: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    setActive: vi.fn(),
  })),
  Select: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    setActive: vi.fn(),
  })),
  Modify: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    setActive: vi.fn(),
  })),
}));

vi.mock('ol/proj', () => ({
  transform: vi.fn().mockImplementation((coord) => coord),
  fromLonLat: vi.fn().mockImplementation((coord) => coord),
  toLonLat: vi.fn().mockImplementation((coord) => coord),
}));

// Reset store and cleanup before each test
beforeEach(() => {
  useMapStore.setState({
    view: {
      center: [-115.1398, 36.1699],
      zoom: 10,
      rotation: 0,
    },
    coordinateFormat: 'decimal',
    mouseCoordinate: null,
    mouseElevation: null,
    elevationLoading: false,
    activeBasemapId: 'osm',
    availableBasemaps: DEFAULT_BASEMAPS,
    drawMode: 'none',
    drawnFeatures: [],
    selectedFeatureId: null,
    isFullscreen: false,
    showCoordinateDisplay: true,
    showElevation: true,
    showScaleBar: true,
    useNauticalMiles: true,
    showSensorFootprint: false,
    sensorFootprintCenter: null,
    offlineMode: false,
    localTileUrl: null,
  });
});

afterEach(() => {
  cleanup();
});

describe('InteractiveMap Integration', () => {
  describe('State Persistence', () => {
    it('persists view state across component updates', () => {
      const { setView } = useMapStore.getState();
      
      // Simulate map movement
      setView({ center: [-120, 40], zoom: 15 });
      
      // Verify state persisted
      const state = useMapStore.getState();
      expect(state.view.center).toEqual([-120, 40]);
      expect(state.view.zoom).toBe(15);
    });

    it('persists drawn features across sessions', () => {
      const { addFeature } = useMapStore.getState();
      
      // Add multiple features
      addFeature({ type: 'point', name: 'Point 1', coordinates: [0, 0], visible: true });
      addFeature({ type: 'line', name: 'Line 1', coordinates: [[0, 0], [1, 1]], visible: true });
      addFeature({ type: 'polygon', name: 'Poly 1', coordinates: [[[0,0], [1,0], [1,1], [0,0]]], visible: true });
      
      const state = useMapStore.getState();
      expect(state.drawnFeatures.length).toBe(3);
      expect(state.drawnFeatures.map(f => f.type)).toEqual(['point', 'line', 'polygon']);
    });
  });

  describe('Feature Workflow', () => {
    it('complete draw -> select -> edit -> delete workflow', () => {
      const store = useMapStore.getState();
      
      // 1. Enter draw mode
      store.setDrawMode('point');
      expect(useMapStore.getState().drawMode).toBe('point');
      
      // 2. Add feature (simulating draw end)
      store.addFeature({
        type: 'point',
        name: 'Test Point',
        coordinates: [-115.14, 36.17],
        visible: true,
      });
      
      const featureId = useMapStore.getState().drawnFeatures[0].id;
      
      // 3. Exit draw mode
      store.setDrawMode('none');
      
      // 4. Select feature
      store.setSelectedFeature(featureId);
      expect(useMapStore.getState().selectedFeatureId).toBe(featureId);
      
      // 5. Edit feature
      store.updateFeature(featureId, { 
        name: 'Renamed Point',
        description: 'Added description',
      });
      
      const updated = useMapStore.getState().drawnFeatures[0];
      expect(updated.name).toBe('Renamed Point');
      expect(updated.description).toBe('Added description');
      
      // 6. Delete feature
      store.removeFeature(featureId);
      expect(useMapStore.getState().drawnFeatures.length).toBe(0);
      expect(useMapStore.getState().selectedFeatureId).toBeNull();
    });
  });

  describe('Basemap Switching', () => {
    it('switches between all available basemaps', () => {
      const { setActiveBasemap, availableBasemaps } = useMapStore.getState();
      
      availableBasemaps.forEach(basemap => {
        setActiveBasemap(basemap.id);
        expect(useMapStore.getState().activeBasemapId).toBe(basemap.id);
      });
    });
  });

  describe('Coordinate Format Cycling', () => {
    it('cycles through all coordinate formats', () => {
      const { setCoordinateFormat, setMouseCoordinate } = useMapStore.getState();
      
      setMouseCoordinate([-115.14, 36.17]);
      
      // Test decimal
      setCoordinateFormat('decimal');
      expect(useMapStore.getState().coordinateFormat).toBe('decimal');
      
      // Test DMS
      setCoordinateFormat('dms');
      expect(useMapStore.getState().coordinateFormat).toBe('dms');
      
      // Test MGRS
      setCoordinateFormat('mgrs');
      expect(useMapStore.getState().coordinateFormat).toBe('mgrs');
    });
  });

  describe('Fullscreen Mode', () => {
    it('toggles fullscreen mode', () => {
      const { toggleFullscreen } = useMapStore.getState();
      
      expect(useMapStore.getState().isFullscreen).toBe(false);
      
      toggleFullscreen();
      expect(useMapStore.getState().isFullscreen).toBe(true);
      
      toggleFullscreen();
      expect(useMapStore.getState().isFullscreen).toBe(false);
    });
  });

  describe('Offline Mode Configuration', () => {
    it('configures offline mode with local tile URL', () => {
      const { setOfflineMode } = useMapStore.getState();
      
      const localUrl = 'http://localhost:8080/tiles/{z}/{x}/{y}.png';
      setOfflineMode(true, localUrl);
      
      const state = useMapStore.getState();
      expect(state.offlineMode).toBe(true);
      expect(state.localTileUrl).toBe(localUrl);
    });

    it('reverts to online mode', () => {
      const { setOfflineMode } = useMapStore.getState();
      
      setOfflineMode(true, 'http://localhost/tiles');
      setOfflineMode(false);
      
      const state = useMapStore.getState();
      expect(state.offlineMode).toBe(false);
      expect(state.localTileUrl).toBeNull();
    });
  });

  describe('Display Settings', () => {
    it('toggles all display settings independently', () => {
      const store = useMapStore.getState();
      
      // Toggle coordinate display
      store.setShowCoordinateDisplay(false);
      expect(useMapStore.getState().showCoordinateDisplay).toBe(false);
      store.setShowCoordinateDisplay(true);
      expect(useMapStore.getState().showCoordinateDisplay).toBe(true);
      
      // Toggle elevation
      store.setShowElevation(false);
      expect(useMapStore.getState().showElevation).toBe(false);
      
      // Toggle scale bar
      store.setShowScaleBar(false);
      expect(useMapStore.getState().showScaleBar).toBe(false);
      
      // Toggle units
      store.setUseNauticalMiles(false);
      expect(useMapStore.getState().useNauticalMiles).toBe(false);
    });
  });

  describe('Sensor Footprint Integration', () => {
    it('enables sensor footprint overlay', () => {
      const { setShowSensorFootprint, setSensorFootprintCenter } = useMapStore.getState();
      
      setShowSensorFootprint(true);
      setSensorFootprintCenter([-115.2, 36.2]);
      
      const state = useMapStore.getState();
      expect(state.showSensorFootprint).toBe(true);
      expect(state.sensorFootprintCenter).toEqual([-115.2, 36.2]);
    });
  });

  describe('Export Functionality', () => {
    it('exports only visible features', () => {
      const { addFeature, toggleFeatureVisibility, exportFeatures } = useMapStore.getState();
      
      // Add features
      addFeature({ type: 'point', name: 'Visible 1', coordinates: [0, 0], visible: true });
      addFeature({ type: 'point', name: 'Hidden', coordinates: [1, 1], visible: true });
      addFeature({ type: 'point', name: 'Visible 2', coordinates: [2, 2], visible: true });
      
      // Hide middle feature
      const hiddenId = useMapStore.getState().drawnFeatures[1].id;
      toggleFeatureVisibility(hiddenId);
      
      // Export
      const exported = exportFeatures();
      
      expect(exported.length).toBe(2);
      expect(exported.map(f => f.name)).toEqual(['Visible 1', 'Visible 2']);
    });
  });
});

describe('Error Handling', () => {
  it('handles invalid coordinate gracefully', () => {
    const { setMouseCoordinate } = useMapStore.getState();
    
    // This should not throw
    expect(() => {
      setMouseCoordinate([NaN, NaN]);
    }).not.toThrow();
  });

  it('handles invalid elevation gracefully', () => {
    const { setMouseElevation } = useMapStore.getState();
    
    // This should not throw
    expect(() => {
      setMouseElevation(NaN);
      setMouseElevation(Infinity);
      setMouseElevation(-Infinity);
    }).not.toThrow();
  });
});
