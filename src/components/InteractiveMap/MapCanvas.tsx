/**
 * Map Canvas Component
 * 
 * Core OpenLayers map wrapper with all map functionality.
 * Supports drawing points, lines, polygons, circles, and measurements.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import { ScaleLine } from 'ol/control';
import { Draw, Modify, Select } from 'ol/interaction';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import { circular } from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';
import type { DrawEvent } from 'ol/interaction/Draw';
import { getLength, getArea } from 'ol/sphere';
import 'ol/ol.css';

import { useMapStore, type DrawMode } from './mapStore';
import { getElevationService, resetElevationService } from './ElevationService';
import { 
  toWgs84, 
  generateCirclePolygon, 
  calculateLineDistance, 
  calculatePolygonArea,
  formatDistance,
  formatArea,
} from './mapUtils';

// ============================================================================
// STYLES
// ============================================================================

const featureStyle = new Style({
  fill: new Fill({
    color: 'rgba(52, 211, 153, 0.2)',
  }),
  stroke: new Stroke({
    color: 'rgba(52, 211, 153, 0.8)',
    width: 2,
  }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: 'rgba(52, 211, 153, 0.8)' }),
    stroke: new Stroke({ color: 'white', width: 2 }),
  }),
});

const selectedStyle = new Style({
  fill: new Fill({
    color: 'rgba(251, 191, 36, 0.3)',
  }),
  stroke: new Stroke({
    color: 'rgba(251, 191, 36, 1)',
    width: 3,
  }),
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: 'rgba(251, 191, 36, 1)' }),
    stroke: new Stroke({ color: 'white', width: 2 }),
  }),
});

const drawStyle = new Style({
  fill: new Fill({
    color: 'rgba(56, 189, 248, 0.2)',
  }),
  stroke: new Stroke({
    color: 'rgba(56, 189, 248, 0.8)',
    width: 2,
    lineDash: [5, 5],
  }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: 'rgba(56, 189, 248, 0.8)' }),
    stroke: new Stroke({ color: 'white', width: 2 }),
  }),
});

const circleStyle = new Style({
  fill: new Fill({
    color: 'rgba(168, 85, 247, 0.2)',
  }),
  stroke: new Stroke({
    color: 'rgba(168, 85, 247, 0.8)',
    width: 2,
  }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: 'rgba(168, 85, 247, 0.8)' }),
    stroke: new Stroke({ color: 'white', width: 2 }),
  }),
});

const measurementStyle = new Style({
  fill: new Fill({
    color: 'rgba(251, 146, 60, 0.1)',
  }),
  stroke: new Stroke({
    color: 'rgba(251, 146, 60, 0.9)',
    width: 2,
    lineDash: [10, 10],
  }),
  image: new CircleStyle({
    radius: 4,
    fill: new Fill({ color: 'rgba(251, 146, 60, 0.9)' }),
    stroke: new Stroke({ color: 'white', width: 1 }),
  }),
});

// Get style based on feature type
function getFeatureStyle(featureType: string, isSelected: boolean): Style {
  if (isSelected) return selectedStyle;
  
  switch (featureType) {
    case 'circle':
      return circleStyle;
    case 'measurement':
      return measurementStyle;
    default:
      return featureStyle;
  }
}

// Create label style for measurements
function createMeasurementLabelStyle(text: string): Style {
  return new Style({
    text: new Text({
      text,
      font: '12px sans-serif',
      fill: new Fill({ color: '#fff' }),
      stroke: new Stroke({ color: '#000', width: 3 }),
      offsetY: -15,
      textAlign: 'center',
    }),
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

interface MapCanvasProps {
  className?: string;
}

export function MapCanvas({ className = '' }: MapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const basemapLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const scaleLineRef = useRef<ScaleLine | null>(null);
  
  // Circle drawing state
  const [circleCenter, setCircleCenter] = useState<Coordinate | null>(null);
  const [isDrawingCircle, setIsDrawingCircle] = useState(false);

  // Store state
  const {
    view,
    activeBasemapId,
    availableBasemaps,
    drawMode,
    drawnFeatures,
    selectedFeatureId,
    showScaleBar,
    useNauticalMiles,
    showElevation,
    offlineMode,
    localTileUrl,
    setView,
    setMouseCoordinate,
    setMouseElevation,
    addFeature,
    setSelectedFeature,
    updateFeature,
  } = useMapStore();

  // ============================================================================
  // MAP INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Get initial basemap
    const basemap = availableBasemaps.find(b => b.id === activeBasemapId) || availableBasemaps[0];

    // Create basemap layer
    basemapLayerRef.current = new TileLayer({
      source: new XYZ({
        url: basemap.url,
        crossOrigin: basemap.crossOrigin,
        maxZoom: basemap.maxZoom,
        attributions: basemap.attribution,
      }),
    });

    // Create vector source and layer for drawings
    vectorSourceRef.current = new VectorSource();
    vectorLayerRef.current = new VectorLayer({
      source: vectorSourceRef.current,
      style: featureStyle,
    });

    // Create scale line control
    scaleLineRef.current = new ScaleLine({
      units: useNauticalMiles ? 'nautical' : 'metric',
      bar: true,
      steps: 4,
      text: true,
      minWidth: 100,
    });

    // Create map
    mapRef.current = new Map({
      target: mapContainerRef.current,
      layers: [basemapLayerRef.current, vectorLayerRef.current],
      view: new View({
        center: fromLonLat(view.center),
        zoom: view.zoom,
        rotation: view.rotation,
      }),
      controls: showScaleBar ? [scaleLineRef.current] : [],
    });

    // Initialize elevation service
    const elevationService = getElevationService();
    elevationService.initialize(mapRef.current, { offlineMode, localTileUrl: localTileUrl ?? undefined });

    // Setup event handlers
    setupEventHandlers();

    // Cleanup
    return () => {
      resetElevationService();
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
    };
  }, []);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const setupEventHandlers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Pointer move - update coordinates and elevation
    map.on('pointermove', (event) => {
      const coordinate = toLonLat(event.coordinate);
      setMouseCoordinate([coordinate[0], coordinate[1]]);

      // Get elevation
      if (showElevation) {
        const elevationService = getElevationService();
        const result = elevationService.getElevation(event.coordinate);
        setMouseElevation(
          result.elevation,
          result.status === 'tile_not_loaded'
        );
      }
    });

    // View change - sync to store
    map.getView().on('change', () => {
      const mapView = map.getView();
      const center = toLonLat(mapView.getCenter() || [0, 0]);
      const zoom = mapView.getZoom() || 10;
      const rotation = mapView.getRotation();
      
      setView({
        center: [center[0], center[1]],
        zoom,
        rotation,
      });
    });
  }, [setMouseCoordinate, setMouseElevation, setView, showElevation]);

  // ============================================================================
  // BASEMAP UPDATES
  // ============================================================================

  useEffect(() => {
    if (!basemapLayerRef.current) return;

    const basemap = availableBasemaps.find(b => b.id === activeBasemapId);
    if (!basemap) return;

    basemapLayerRef.current.setSource(
      new XYZ({
        url: basemap.url,
        crossOrigin: basemap.crossOrigin,
        maxZoom: basemap.maxZoom,
        attributions: basemap.attribution,
      })
    );
  }, [activeBasemapId, availableBasemaps]);

  // ============================================================================
  // SCALE BAR UPDATES
  // ============================================================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scaleLineRef.current) return;

    if (showScaleBar) {
      if (!map.getControls().getArray().includes(scaleLineRef.current)) {
        map.addControl(scaleLineRef.current);
      }
      scaleLineRef.current.setUnits(useNauticalMiles ? 'nautical' : 'metric');
    } else {
      map.removeControl(scaleLineRef.current);
    }
  }, [showScaleBar, useNauticalMiles]);

  // ============================================================================
  // CIRCLE DRAWING HANDLER
  // ============================================================================

  const handleCircleClick = useCallback((event: any) => {
    const map = mapRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    const clickCoord = event.coordinate;

    if (!circleCenter) {
      // First click - set center
      setCircleCenter(clickCoord);
      setIsDrawingCircle(true);
    } else {
      // Second click - complete circle
      const centerLonLat = toLonLat(circleCenter);
      const edgeLonLat = toLonLat(clickCoord);
      
      // Calculate radius in meters
      const dx = edgeLonLat[0] - centerLonLat[0];
      const dy = edgeLonLat[1] - centerLonLat[1];
      
      // Simple distance calculation (approximate for small distances)
      const R = 6371000; // Earth's radius in meters
      const lat = centerLonLat[1] * Math.PI / 180;
      const metersPerDegLon = R * Math.cos(lat) * Math.PI / 180;
      const metersPerDegLat = R * Math.PI / 180;
      
      const radius = Math.sqrt(
        Math.pow(dx * metersPerDegLon, 2) + 
        Math.pow(dy * metersPerDegLat, 2)
      );

      // Generate circle polygon
      const circleCoords = generateCirclePolygon(
        [centerLonLat[0], centerLonLat[1]] as [number, number],
        radius
      );

      // Generate name
      const count = drawnFeatures.filter(f => f.type === 'circle').length + 1;
      const name = `Circle ${count}`;

      addFeature({
        type: 'circle',
        name,
        coordinates: circleCoords,
        visible: true,
        radius,
        center: [centerLonLat[0], centerLonLat[1]] as [number, number],
      });

      // Reset circle drawing state
      setCircleCenter(null);
      setIsDrawingCircle(false);
    }
  }, [circleCenter, drawnFeatures, addFeature]);

  // ============================================================================
  // DRAWING INTERACTIONS
  // ============================================================================

  useEffect(() => {
    const map = mapRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    // Remove existing draw interaction
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    // Reset circle drawing state when mode changes
    if (drawMode !== 'circle') {
      setCircleCenter(null);
      setIsDrawingCircle(false);
    }

    // Handle circle mode separately (uses click handler)
    if (drawMode === 'circle') {
      map.on('click', handleCircleClick);
      return () => {
        map.un('click', handleCircleClick);
      };
    }

    // Add new draw interaction for other modes
    if (drawMode !== 'none') {
      const typeMap: Record<DrawMode, 'Point' | 'LineString' | 'Polygon'> = {
        none: 'Point',
        point: 'Point',
        line: 'LineString',
        polygon: 'Polygon',
        circle: 'Polygon', // Not used here
        measurement: 'LineString',
      };

      const style = drawMode === 'measurement' ? measurementStyle : drawStyle;

      drawInteractionRef.current = new Draw({
        source: vectorSource,
        type: typeMap[drawMode],
        style,
      });

      drawInteractionRef.current.on('drawend', (event: DrawEvent) => {
        const geometry = event.feature.getGeometry();
        if (!geometry) return;

        let coordinates: number[] | number[][] | number[][][];
        let featureType: 'point' | 'line' | 'polygon' | 'circle' | 'measurement';
        let distance: number | undefined;
        let area: number | undefined;

        if (geometry instanceof Point) {
          const coord = toLonLat(geometry.getCoordinates());
          coordinates = coord;
          featureType = 'point';
        } else if (geometry instanceof LineString) {
          coordinates = geometry.getCoordinates().map(c => toLonLat(c));
          
          if (drawMode === 'measurement') {
            featureType = 'measurement';
            // Calculate distance
            distance = calculateLineDistance(coordinates as number[][]);
          } else {
            featureType = 'line';
          }
        } else if (geometry instanceof Polygon) {
          coordinates = geometry.getCoordinates().map(ring => 
            ring.map(c => toLonLat(c))
          );
          featureType = 'polygon';
          // Calculate area for polygons
          area = calculatePolygonArea(coordinates as number[][][]);
        } else {
          return;
        }

        // Generate name
        const count = drawnFeatures.filter(f => f.type === featureType).length + 1;
        let name: string;
        
        if (featureType === 'measurement' && distance !== undefined) {
          name = `Measurement ${count} (${formatDistance(distance, useNauticalMiles)})`;
        } else {
          name = `${featureType.charAt(0).toUpperCase() + featureType.slice(1)} ${count}`;
        }

        // Store feature ID for later reference
        const featureId = `feature-${Date.now()}`;
        event.feature.setId(featureId);

        addFeature({
          type: featureType,
          name,
          coordinates,
          visible: true,
          distance,
          area,
        });
      });

      map.addInteraction(drawInteractionRef.current);
    }
  }, [drawMode, drawnFeatures, addFeature, handleCircleClick, useNauticalMiles]);

  // ============================================================================
  // SELECT INTERACTION
  // ============================================================================

  useEffect(() => {
    const map = mapRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    // Remove existing select interaction
    if (selectInteractionRef.current) {
      map.removeInteraction(selectInteractionRef.current);
      selectInteractionRef.current = null;
    }

    // Add select interaction when not drawing
    if (drawMode === 'none') {
      selectInteractionRef.current = new Select({
        style: selectedStyle,
      });

      selectInteractionRef.current.on('select', (event) => {
        const selected = event.selected[0];
        if (selected) {
          const featureId = selected.getId() as string;
          setSelectedFeature(featureId);
        } else {
          setSelectedFeature(null);
        }
      });

      map.addInteraction(selectInteractionRef.current);
    }
  }, [drawMode, setSelectedFeature]);

  // ============================================================================
  // SYNC FEATURES FROM STORE
  // ============================================================================

  useEffect(() => {
    const vectorSource = vectorSourceRef.current;
    if (!vectorSource) return;

    // Clear existing features
    vectorSource.clear();

    // Add features from store
    drawnFeatures.forEach((storedFeature) => {
      if (!storedFeature.visible) return;

      let geometry;
      if (storedFeature.type === 'point') {
        const coords = storedFeature.coordinates as number[];
        geometry = new Point(fromLonLat(coords));
      } else if (storedFeature.type === 'line' || storedFeature.type === 'measurement') {
        const coords = (storedFeature.coordinates as number[][]).map(c => fromLonLat(c));
        geometry = new LineString(coords);
      } else if (storedFeature.type === 'polygon' || storedFeature.type === 'circle') {
        const coords = (storedFeature.coordinates as number[][][]).map(ring =>
          ring.map(c => fromLonLat(c))
        );
        geometry = new Polygon(coords);
      }

      if (geometry) {
        const feature = new Feature({ geometry });
        feature.setId(storedFeature.id);
        feature.set('featureType', storedFeature.type);
        
        // Get appropriate style
        const style = getFeatureStyle(storedFeature.type, storedFeature.id === selectedFeatureId);
        
        // For measurements, add label with distance
        if (storedFeature.type === 'measurement' && storedFeature.distance !== undefined) {
          const labelStyle = createMeasurementLabelStyle(
            formatDistance(storedFeature.distance, useNauticalMiles)
          );
          feature.setStyle([style, labelStyle]);
        } else if (storedFeature.type === 'circle' && storedFeature.radius !== undefined) {
          const labelStyle = createMeasurementLabelStyle(
            `r = ${formatDistance(storedFeature.radius, useNauticalMiles)}`
          );
          feature.setStyle([style, labelStyle]);
        } else {
          feature.setStyle(style);
        }
        
        vectorSource.addFeature(feature);
      }
    });
  }, [drawnFeatures, selectedFeatureId, useNauticalMiles]);

  // ============================================================================
  // CIRCLE PREVIEW (during drawing)
  // ============================================================================

  useEffect(() => {
    if (!isDrawingCircle || !circleCenter) return;

    const map = mapRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    // Create a temporary feature for the center point
    const centerFeature = new Feature({
      geometry: new Point(circleCenter),
    });
    centerFeature.setId('temp-circle-center');
    centerFeature.setStyle(new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: 'rgba(168, 85, 247, 0.9)' }),
        stroke: new Stroke({ color: 'white', width: 2 }),
      }),
    }));
    vectorSource.addFeature(centerFeature);

    return () => {
      const tempFeature = vectorSource.getFeatureById('temp-circle-center');
      if (tempFeature) {
        vectorSource.removeFeature(tempFeature);
      }
    };
  }, [isDrawingCircle, circleCenter]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${className}`}
        style={{ minHeight: '300px' }}
      />
      
      {/* Circle drawing instruction overlay */}
      {isDrawingCircle && circleCenter && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-purple-500/50 text-purple-300 text-xs">
          Click to set radius
        </div>
      )}
    </div>
  );
}
