/**
 * Map Store Tests
 * 
 * Tests for Zustand store state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMapStore } from './mapStore';
import { DEFAULT_BASEMAPS } from './mapUtils';

describe('Map Store', () => {
  // Reset store before each test
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

  // ============================================================================
  // VIEW STATE TESTS
  // ============================================================================

  describe('View State', () => {
    it('has correct initial view state', () => {
      const state = useMapStore.getState();
      
      expect(state.view.center).toEqual([-115.1398, 36.1699]);
      expect(state.view.zoom).toBe(10);
      expect(state.view.rotation).toBe(0);
    });

    it('updates view with setView', () => {
      const { setView } = useMapStore.getState();
      
      setView({ center: [-120, 40], zoom: 15 });
      
      const state = useMapStore.getState();
      expect(state.view.center).toEqual([-120, 40]);
      expect(state.view.zoom).toBe(15);
      expect(state.view.rotation).toBe(0); // Unchanged
    });

    it('updates only center with setCenter', () => {
      const { setCenter } = useMapStore.getState();
      
      setCenter([-100, 30]);
      
      const state = useMapStore.getState();
      expect(state.view.center).toEqual([-100, 30]);
      expect(state.view.zoom).toBe(10); // Unchanged
    });

    it('updates only zoom with setZoom', () => {
      const { setZoom } = useMapStore.getState();
      
      setZoom(18);
      
      const state = useMapStore.getState();
      expect(state.view.zoom).toBe(18);
      expect(state.view.center).toEqual([-115.1398, 36.1699]); // Unchanged
    });
  });

  // ============================================================================
  // COORDINATE DISPLAY TESTS
  // ============================================================================

  describe('Coordinate Display', () => {
    it('has correct initial coordinate format', () => {
      const state = useMapStore.getState();
      
      expect(state.coordinateFormat).toBe('decimal');
    });

    it('changes coordinate format', () => {
      const { setCoordinateFormat } = useMapStore.getState();
      
      setCoordinateFormat('mgrs');
      
      expect(useMapStore.getState().coordinateFormat).toBe('mgrs');
      
      setCoordinateFormat('dms');
      
      expect(useMapStore.getState().coordinateFormat).toBe('dms');
    });

    it('updates mouse coordinate', () => {
      const { setMouseCoordinate } = useMapStore.getState();
      
      setMouseCoordinate([-115.5, 36.5]);
      
      expect(useMapStore.getState().mouseCoordinate).toEqual([-115.5, 36.5]);
    });

    it('clears mouse coordinate with null', () => {
      const { setMouseCoordinate } = useMapStore.getState();
      
      setMouseCoordinate([-115.5, 36.5]);
      setMouseCoordinate(null);
      
      expect(useMapStore.getState().mouseCoordinate).toBeNull();
    });

    it('updates elevation with loading state', () => {
      const { setMouseElevation } = useMapStore.getState();
      
      setMouseElevation(null, true);
      
      let state = useMapStore.getState();
      expect(state.mouseElevation).toBeNull();
      expect(state.elevationLoading).toBe(true);
      
      setMouseElevation(1500, false);
      
      state = useMapStore.getState();
      expect(state.mouseElevation).toBe(1500);
      expect(state.elevationLoading).toBe(false);
    });
  });

  // ============================================================================
  // BASEMAP TESTS
  // ============================================================================

  describe('Basemap Management', () => {
    it('has correct initial basemap', () => {
      const state = useMapStore.getState();
      
      expect(state.activeBasemapId).toBe('osm');
      expect(state.availableBasemaps.length).toBeGreaterThan(0);
    });

    it('changes active basemap', () => {
      const { setActiveBasemap } = useMapStore.getState();
      
      setActiveBasemap('opentopomap');
      
      expect(useMapStore.getState().activeBasemapId).toBe('opentopomap');
    });

    it('adds custom basemap', () => {
      const { addCustomBasemap } = useMapStore.getState();
      const initialCount = useMapStore.getState().availableBasemaps.length;
      
      addCustomBasemap({
        id: 'custom-test',
        name: 'Custom Test',
        url: 'http://test/{z}/{x}/{y}.png',
        attribution: 'Test',
      });
      
      const state = useMapStore.getState();
      expect(state.availableBasemaps.length).toBe(initialCount + 1);
      expect(state.availableBasemaps.find(b => b.id === 'custom-test')).toBeTruthy();
    });

    it('removes custom basemap', () => {
      const { addCustomBasemap, removeCustomBasemap } = useMapStore.getState();
      
      addCustomBasemap({
        id: 'to-remove',
        name: 'To Remove',
        url: 'http://test/{z}/{x}/{y}.png',
        attribution: 'Test',
      });
      
      const countBefore = useMapStore.getState().availableBasemaps.length;
      
      removeCustomBasemap('to-remove');
      
      const state = useMapStore.getState();
      expect(state.availableBasemaps.length).toBe(countBefore - 1);
      expect(state.availableBasemaps.find(b => b.id === 'to-remove')).toBeUndefined();
    });

    it('resets to OSM when active basemap is removed', () => {
      const { addCustomBasemap, setActiveBasemap, removeCustomBasemap } = useMapStore.getState();
      
      addCustomBasemap({
        id: 'temp-basemap',
        name: 'Temp',
        url: 'http://test/{z}/{x}/{y}.png',
        attribution: 'Test',
      });
      
      setActiveBasemap('temp-basemap');
      expect(useMapStore.getState().activeBasemapId).toBe('temp-basemap');
      
      removeCustomBasemap('temp-basemap');
      
      expect(useMapStore.getState().activeBasemapId).toBe('osm');
    });
  });

  // ============================================================================
  // DRAWING TESTS
  // ============================================================================

  describe('Drawing Management', () => {
    it('has correct initial draw state', () => {
      const state = useMapStore.getState();
      
      expect(state.drawMode).toBe('none');
      expect(state.drawnFeatures).toEqual([]);
      expect(state.selectedFeatureId).toBeNull();
    });

    it('changes draw mode', () => {
      const { setDrawMode } = useMapStore.getState();
      
      setDrawMode('point');
      expect(useMapStore.getState().drawMode).toBe('point');
      
      setDrawMode('line');
      expect(useMapStore.getState().drawMode).toBe('line');
      
      setDrawMode('polygon');
      expect(useMapStore.getState().drawMode).toBe('polygon');
      
      setDrawMode('none');
      expect(useMapStore.getState().drawMode).toBe('none');
    });

    it('adds feature with generated id and timestamp', () => {
      const { addFeature } = useMapStore.getState();
      
      addFeature({
        type: 'point',
        name: 'Test Point',
        coordinates: [-115, 36],
        visible: true,
      });
      
      const state = useMapStore.getState();
      expect(state.drawnFeatures.length).toBe(1);
      
      const feature = state.drawnFeatures[0];
      expect(feature.id).toMatch(/^feature-/);
      expect(feature.timestamp).toBeTruthy();
      expect(feature.name).toBe('Test Point');
      expect(feature.type).toBe('point');
      expect(feature.visible).toBe(true);
    });

    it('updates existing feature', () => {
      const { addFeature, updateFeature } = useMapStore.getState();
      
      addFeature({
        type: 'point',
        name: 'Original Name',
        coordinates: [-115, 36],
        visible: true,
      });
      
      const featureId = useMapStore.getState().drawnFeatures[0].id;
      
      updateFeature(featureId, { name: 'Updated Name', description: 'New desc' });
      
      const feature = useMapStore.getState().drawnFeatures[0];
      expect(feature.name).toBe('Updated Name');
      expect(feature.description).toBe('New desc');
      expect(feature.coordinates).toEqual([-115, 36]); // Unchanged
    });

    it('removes feature', () => {
      const { addFeature, removeFeature } = useMapStore.getState();
      
      addFeature({ type: 'point', name: 'Point 1', coordinates: [0, 0], visible: true });
      addFeature({ type: 'point', name: 'Point 2', coordinates: [1, 1], visible: true });
      
      const featureId = useMapStore.getState().drawnFeatures[0].id;
      
      removeFeature(featureId);
      
      const state = useMapStore.getState();
      expect(state.drawnFeatures.length).toBe(1);
      expect(state.drawnFeatures[0].name).toBe('Point 2');
    });

    it('clears selected feature when removed', () => {
      const { addFeature, setSelectedFeature, removeFeature } = useMapStore.getState();
      
      addFeature({ type: 'point', name: 'Test', coordinates: [0, 0], visible: true });
      
      const featureId = useMapStore.getState().drawnFeatures[0].id;
      setSelectedFeature(featureId);
      
      expect(useMapStore.getState().selectedFeatureId).toBe(featureId);
      
      removeFeature(featureId);
      
      expect(useMapStore.getState().selectedFeatureId).toBeNull();
    });

    it('clears all features', () => {
      const { addFeature, setSelectedFeature, clearFeatures } = useMapStore.getState();
      
      addFeature({ type: 'point', name: 'Point 1', coordinates: [0, 0], visible: true });
      addFeature({ type: 'line', name: 'Line 1', coordinates: [[0, 0], [1, 1]], visible: true });
      
      const featureId = useMapStore.getState().drawnFeatures[0].id;
      setSelectedFeature(featureId);
      
      clearFeatures();
      
      const state = useMapStore.getState();
      expect(state.drawnFeatures).toEqual([]);
      expect(state.selectedFeatureId).toBeNull();
    });

    it('toggles feature visibility', () => {
      const { addFeature, toggleFeatureVisibility } = useMapStore.getState();
      
      addFeature({ type: 'point', name: 'Test', coordinates: [0, 0], visible: true });
      
      const featureId = useMapStore.getState().drawnFeatures[0].id;
      
      toggleFeatureVisibility(featureId);
      expect(useMapStore.getState().drawnFeatures[0].visible).toBe(false);
      
      toggleFeatureVisibility(featureId);
      expect(useMapStore.getState().drawnFeatures[0].visible).toBe(true);
    });

    it('exports only visible features', () => {
      const { addFeature, toggleFeatureVisibility, exportFeatures } = useMapStore.getState();
      
      addFeature({ type: 'point', name: 'Visible', coordinates: [0, 0], visible: true });
      addFeature({ type: 'point', name: 'Hidden', coordinates: [1, 1], visible: true });
      
      const hiddenId = useMapStore.getState().drawnFeatures[1].id;
      toggleFeatureVisibility(hiddenId);
      
      const exported = exportFeatures();
      
      expect(exported.length).toBe(1);
      expect(exported[0].name).toBe('Visible');
    });
  });

  // ============================================================================
  // UI STATE TESTS
  // ============================================================================

  describe('UI State', () => {
    it('has correct initial UI state', () => {
      const state = useMapStore.getState();
      
      expect(state.isFullscreen).toBe(false);
      expect(state.showCoordinateDisplay).toBe(true);
      expect(state.showElevation).toBe(true);
      expect(state.showScaleBar).toBe(true);
      expect(state.useNauticalMiles).toBe(true);
    });

    it('toggles fullscreen', () => {
      const { toggleFullscreen, setFullscreen } = useMapStore.getState();
      
      toggleFullscreen();
      expect(useMapStore.getState().isFullscreen).toBe(true);
      
      toggleFullscreen();
      expect(useMapStore.getState().isFullscreen).toBe(false);
      
      setFullscreen(true);
      expect(useMapStore.getState().isFullscreen).toBe(true);
    });

    it('toggles display options', () => {
      const { 
        setShowCoordinateDisplay, 
        setShowElevation, 
        setShowScaleBar,
        setUseNauticalMiles,
      } = useMapStore.getState();
      
      setShowCoordinateDisplay(false);
      expect(useMapStore.getState().showCoordinateDisplay).toBe(false);
      
      setShowElevation(false);
      expect(useMapStore.getState().showElevation).toBe(false);
      
      setShowScaleBar(false);
      expect(useMapStore.getState().showScaleBar).toBe(false);
      
      setUseNauticalMiles(false);
      expect(useMapStore.getState().useNauticalMiles).toBe(false);
    });
  });

  // ============================================================================
  // SENSOR FOOTPRINT TESTS
  // ============================================================================

  describe('Sensor Footprint', () => {
    it('has correct initial sensor footprint state', () => {
      const state = useMapStore.getState();
      
      expect(state.showSensorFootprint).toBe(false);
      expect(state.sensorFootprintCenter).toBeNull();
    });

    it('enables sensor footprint with center', () => {
      const { setShowSensorFootprint, setSensorFootprintCenter } = useMapStore.getState();
      
      setShowSensorFootprint(true);
      setSensorFootprintCenter([-115.2, 36.2]);
      
      const state = useMapStore.getState();
      expect(state.showSensorFootprint).toBe(true);
      expect(state.sensorFootprintCenter).toEqual([-115.2, 36.2]);
    });
  });

  // ============================================================================
  // OFFLINE MODE TESTS
  // ============================================================================

  describe('Offline Mode', () => {
    it('has correct initial offline state', () => {
      const state = useMapStore.getState();
      
      expect(state.offlineMode).toBe(false);
      expect(state.localTileUrl).toBeNull();
    });

    it('enables offline mode with local URL', () => {
      const { setOfflineMode } = useMapStore.getState();
      
      setOfflineMode(true, 'http://localhost:8080/tiles/{z}/{x}/{y}.png');
      
      const state = useMapStore.getState();
      expect(state.offlineMode).toBe(true);
      expect(state.localTileUrl).toBe('http://localhost:8080/tiles/{z}/{x}/{y}.png');
    });

    it('disables offline mode', () => {
      const { setOfflineMode } = useMapStore.getState();
      
      setOfflineMode(true, 'http://localhost:8080/tiles/{z}/{x}/{y}.png');
      setOfflineMode(false);
      
      const state = useMapStore.getState();
      expect(state.offlineMode).toBe(false);
      expect(state.localTileUrl).toBeNull();
    });
  });
});
