/**
 * Interactive Map Module
 * 
 * Exports all public components and utilities for the interactive map feature.
 */

// Main component
export { InteractiveMap } from './InteractiveMap';

// Sub-components
export { MapCanvas } from './MapCanvas';
export { CoordinateDisplay, CoordinateDisplayCompact } from './CoordinateDisplay';
export { BasemapSelector, BasemapButtonGroup } from './BasemapSelector';
export { DrawingTools, DrawingToolsCompact } from './DrawingTools';
export { MapControls, FullscreenButton, SettingsPanel } from './MapControls';

// Store
export { 
  useMapStore,
  useMapView,
  useMapCoordinates,
  useMapBasemap,
  useMapDrawing,
  useMapUI,
  type MapState,
  type MapActions,
  type DrawMode,
  type DrawnFeature,
  type MapViewState,
} from './mapStore';

// Services
export { 
  ElevationService,
  getElevationService,
  resetElevationService,
} from './ElevationService';

// Utilities
export {
  // Coordinate conversions
  toWgs84,
  toWebMercator,
  decimalToDms,
  coordinateToMgrs,
  mgrsToCoordinate,
  formatCoordinate,
  
  // Elevation
  decodeTerrainumRgb,
  metersToFeet,
  formatElevation,
  ElevationTileCache,
  
  // GeoJSON Import/Export
  featuresToGeoJSON,
  generateGeoJSON,
  downloadGeoJSON,
  parseGeoJSON,
  importGeoJSONFile,
  
  // Geometry utilities
  calculateDistance,
  calculateLineDistance,
  calculatePolygonArea,
  generateCirclePolygon,
  formatDistance,
  formatArea,
  
  // Basemaps
  DEFAULT_BASEMAPS,
  TERRAIN_TILE_SOURCE,
  
  // Scale
  formatScaleDistance,
  
  // Types
  type CoordinateFormat,
  type Coordinate,
  type FormattedCoordinate,
  type ElevationResult,
  type DrawFeatureProperties,
  type BasemapDefinition,
  type TileCacheEntry,
  type GeoJSONFeature,
  type GeoJSONFeatureCollection,
} from './mapUtils';
