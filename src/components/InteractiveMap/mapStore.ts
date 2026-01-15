/**
 * Interactive Map Store
 * 
 * Zustand store for persisting map state across components and sessions.
 */

import { create } from 'zustand';
import type { CoordinateFormat, BasemapDefinition } from './mapUtils';
import { DEFAULT_BASEMAPS } from './mapUtils';

// ============================================================================
// TYPES
// ============================================================================

export type DrawMode = 'none' | 'point' | 'line' | 'polygon' | 'circle' | 'measurement';

export interface DrawnFeature {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'circle' | 'measurement';
  name: string;
  description?: string;
  coordinates: number[] | number[][] | number[][][];
  timestamp: string;
  visible: boolean;
  // Circle-specific properties
  radius?: number; // in meters
  center?: [number, number]; // [lon, lat]
  // Measurement-specific properties
  distance?: number; // in meters
  area?: number; // in square meters
}

export interface MapViewState {
  center: [number, number]; // [lon, lat] in WGS84
  zoom: number;
  rotation: number;
}

export interface MapState {
  // View state
  view: MapViewState;
  
  // Coordinate display
  coordinateFormat: CoordinateFormat;
  mouseCoordinate: [number, number] | null; // [lon, lat]
  mouseElevation: number | null;
  elevationLoading: boolean;
  
  // Basemap
  activeBasemapId: string;
  availableBasemaps: BasemapDefinition[];
  
  // Drawing
  drawMode: DrawMode;
  drawnFeatures: DrawnFeature[];
  selectedFeatureId: string | null;
  
  // UI state
  isFullscreen: boolean;
  showCoordinateDisplay: boolean;
  showElevation: boolean;
  showScaleBar: boolean;
  useNauticalMiles: boolean;
  
  // Sensor footprint overlay
  showSensorFootprint: boolean;
  sensorFootprintCenter: [number, number] | null;
  
  // Offline mode
  offlineMode: boolean;
  localTileUrl: string | null;
}

export interface MapActions {
  // View actions
  setView: (view: Partial<MapViewState>) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  
  // Coordinate display
  setCoordinateFormat: (format: CoordinateFormat) => void;
  setMouseCoordinate: (coord: [number, number] | null) => void;
  setMouseElevation: (elevation: number | null, loading?: boolean) => void;
  
  // Basemap
  setActiveBasemap: (basemapId: string) => void;
  addCustomBasemap: (basemap: BasemapDefinition) => void;
  removeCustomBasemap: (basemapId: string) => void;
  
  // Drawing
  setDrawMode: (mode: DrawMode) => void;
  addFeature: (feature: Omit<DrawnFeature, 'id' | 'timestamp'>) => void;
  updateFeature: (id: string, updates: Partial<DrawnFeature>) => void;
  removeFeature: (id: string) => void;
  clearFeatures: () => void;
  setSelectedFeature: (id: string | null) => void;
  toggleFeatureVisibility: (id: string) => void;
  
  // UI actions
  setFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;
  setShowCoordinateDisplay: (show: boolean) => void;
  setShowElevation: (show: boolean) => void;
  setShowScaleBar: (show: boolean) => void;
  setUseNauticalMiles: (use: boolean) => void;
  
  // Sensor footprint
  setShowSensorFootprint: (show: boolean) => void;
  setSensorFootprintCenter: (center: [number, number] | null) => void;
  
  // Offline mode
  setOfflineMode: (offline: boolean, localUrl?: string | null) => void;
  
  // Import/Export
  exportFeatures: () => DrawnFeature[];
  importFeatures: (features: Omit<DrawnFeature, 'id' | 'timestamp' | 'visible'>[]) => void;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_STATE: MapState = {
  view: {
    center: [-115.1398, 36.1699], // Las Vegas default
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
};

// ============================================================================
// STORE
// ============================================================================

export const useMapStore = create<MapState & MapActions>()((set, get) => ({
  ...DEFAULT_STATE,

  // View actions
  setView: (view) => set((state) => ({
    view: { ...state.view, ...view }
  })),
  
  setCenter: (center) => set((state) => ({
    view: { ...state.view, center }
  })),
  
  setZoom: (zoom) => set((state) => ({
    view: { ...state.view, zoom }
  })),

  // Coordinate display
  setCoordinateFormat: (coordinateFormat) => set({ coordinateFormat }),
  
  setMouseCoordinate: (mouseCoordinate) => set({ mouseCoordinate }),
  
  setMouseElevation: (mouseElevation, loading = false) => set({ 
    mouseElevation, 
    elevationLoading: loading 
  }),

  // Basemap
  setActiveBasemap: (activeBasemapId) => set({ activeBasemapId }),
  
  addCustomBasemap: (basemap) => set((state) => ({
    availableBasemaps: [...state.availableBasemaps, basemap]
  })),
  
  removeCustomBasemap: (basemapId) => set((state) => ({
    availableBasemaps: state.availableBasemaps.filter(b => b.id !== basemapId),
    activeBasemapId: state.activeBasemapId === basemapId ? 'osm' : state.activeBasemapId
  })),

  // Drawing
  setDrawMode: (drawMode) => set({ drawMode }),
  
  addFeature: (feature) => set((state) => ({
    drawnFeatures: [
      ...state.drawnFeatures,
      {
        ...feature,
        id: `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        visible: true,
      }
    ]
  })),
  
  updateFeature: (id, updates) => set((state) => ({
    drawnFeatures: state.drawnFeatures.map(f => 
      f.id === id ? { ...f, ...updates } : f
    )
  })),
  
  removeFeature: (id) => set((state) => ({
    drawnFeatures: state.drawnFeatures.filter(f => f.id !== id),
    selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId
  })),
  
  clearFeatures: () => set({ drawnFeatures: [], selectedFeatureId: null }),
  
  setSelectedFeature: (selectedFeatureId) => set({ selectedFeatureId }),
  
  toggleFeatureVisibility: (id) => set((state) => ({
    drawnFeatures: state.drawnFeatures.map(f =>
      f.id === id ? { ...f, visible: !f.visible } : f
    )
  })),

  // UI actions
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  
  setShowCoordinateDisplay: (showCoordinateDisplay) => set({ showCoordinateDisplay }),
  
  setShowElevation: (showElevation) => set({ showElevation }),
  
  setShowScaleBar: (showScaleBar) => set({ showScaleBar }),
  
  setUseNauticalMiles: (useNauticalMiles) => set({ useNauticalMiles }),

  // Sensor footprint
  setShowSensorFootprint: (showSensorFootprint) => set({ showSensorFootprint }),
  
  setSensorFootprintCenter: (sensorFootprintCenter) => set({ sensorFootprintCenter }),

  // Offline mode
  setOfflineMode: (offlineMode, localTileUrl = null) => set({ 
    offlineMode, 
    localTileUrl 
  }),

  // Import/Export
  exportFeatures: () => get().drawnFeatures.filter(f => f.visible),
  
  importFeatures: (features) => set((state) => ({
    drawnFeatures: [
      ...state.drawnFeatures,
      ...features.map(f => ({
        ...f,
        id: `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        visible: true,
      }))
    ]
  })),
}));

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useMapView = () => useMapStore((state) => state.view);
export const useMapCoordinates = () => useMapStore((state) => ({
  format: state.coordinateFormat,
  mouseCoordinate: state.mouseCoordinate,
  mouseElevation: state.mouseElevation,
  elevationLoading: state.elevationLoading,
}));
export const useMapBasemap = () => useMapStore((state) => ({
  activeId: state.activeBasemapId,
  available: state.availableBasemaps,
}));
export const useMapDrawing = () => useMapStore((state) => ({
  mode: state.drawMode,
  features: state.drawnFeatures,
  selectedId: state.selectedFeatureId,
}));
export const useMapUI = () => useMapStore((state) => ({
  isFullscreen: state.isFullscreen,
  showCoordinateDisplay: state.showCoordinateDisplay,
  showElevation: state.showElevation,
  showScaleBar: state.showScaleBar,
  useNauticalMiles: state.useNauticalMiles,
}));
