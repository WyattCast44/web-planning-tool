# Interactive Map Component

An OpenLayers-based interactive slippy map for the Web Planning Tool, featuring coordinate display, elevation data, drawing tools, and GeoJSON import/export.

## Features

- **Interactive Slippy Map**: OpenLayers 9+ with smooth panning and zooming via mouse wheel
- **Multiple Basemaps**: OSM, OpenTopoMap, Carto (Light/Dark), ESRI Satellite, Stadia Terrain
- **Coordinate Display**: Switchable between Decimal Degrees, DMS, and MGRS formats
- **Elevation Data**: Real-time elevation on hover using AWS Terrarium RGB-encoded terrain tiles
- **Drawing Tools**: Point, Line, Polygon, Circle, and Measurement drawing with feature management
- **GeoJSON Import/Export**: Import and export drawn features in standard GeoJSON format
- **Measurements**: Measure distances along lines with real-time feedback
- **Circles**: Draw circles by clicking center and edge points
- **Fullscreen Mode**: Expand map to full screen with ESC to exit
- **Offline Support**: Configurable local tile server for air-gapped environments
- **Scale Bar**: NM/KM toggle matching app unit preferences

## Installation

### 1. Install Dependencies

```bash
npm install ol mgrs
# or
yarn add ol mgrs
```

### 2. Install Type Definitions

```bash
npm install -D @types/ol
# Note: mgrs package includes its own types
```

### 3. Add to Your App

```tsx
import { InteractiveMap } from './components/InteractiveMap';

function App() {
  return (
    <div>
      {/* Other components */}
      <InteractiveMap />
    </div>
  );
}
```

### 4. Import Styles

Add to your main CSS or import in your component:

```css
@import 'ol/ol.css';
@import './components/InteractiveMap/map-styles.css';
```

## Configuration

### app-config.js

Add the `interactiveMap` section to your `features` config:

```javascript
window.APP_CONFIG = {
  features: {
    interactiveMap: {
      enabled: true,
      showElevation: true,
      defaultBasemap: "osm",
      defaultCenter: [-115.1398, 36.1699], // [lon, lat]
      defaultZoom: 10,
      
      // Offline mode
      offlineMode: false,
      localTileUrl: null, // e.g., "http://localhost:8080/tiles/{z}/{x}/{y}.png"
      localTerrainUrl: null,
      
      // Custom basemaps
      customBasemaps: [],
      
      // Display settings
      showScaleBar: true,
      useNauticalMiles: true,
      showCoordinateDisplay: true,
      defaultCoordinateFormat: "decimal",
      
      // Features
      enableDrawing: true,
      enableMeasurements: true,
      enableSensorFootprintOverlay: true,
    },
  },
};
```

### Offline/Air-gapped Mode

For environments without internet access:

1. Set up a local tile server (e.g., using `tileserver-gl`, `mbtileserver`, or a simple HTTP server)
2. Download tiles for your area of interest
3. Configure in `app-config.js`:

```javascript
interactiveMap: {
  offlineMode: true,
  localTileUrl: "http://localhost:8080/osm/{z}/{x}/{y}.png",
  localTerrainUrl: "http://localhost:8080/terrain/{z}/{x}/{y}.png",
}
```

## Component API

### InteractiveMap

Main component that renders the full map panel.

```tsx
<InteractiveMap />
```

### MapCanvas

Just the map canvas without controls (for custom layouts).

```tsx
<MapCanvas className="h-96" />
```

### useMapStore

Zustand store for map state.

```tsx
import { useMapStore } from './components/InteractiveMap';

function MyComponent() {
  const { view, setCenter, setZoom } = useMapStore();
  
  const flyTo = (lon: number, lat: number) => {
    setCenter([lon, lat]);
    setZoom(15);
  };
  
  return <button onClick={() => flyTo(-115.17, 36.12)}>Go to Strip</button>;
}
```

### ElevationService

Get elevation data programmatically.

```tsx
import { getElevationService } from './components/InteractiveMap';

const service = getElevationService();
const result = service.getElevation(coordinate);

if (result.status === 'success') {
  console.log(`Elevation: ${result.elevation}m`);
}
```

## Store State

```typescript
interface MapState {
  // View
  view: {
    center: [number, number]; // [lon, lat] WGS84
    zoom: number;
    rotation: number;
  };
  
  // Coordinates
  coordinateFormat: 'decimal' | 'dms' | 'mgrs';
  mouseCoordinate: [number, number] | null;
  mouseElevation: number | null;
  
  // Basemap
  activeBasemapId: string;
  availableBasemaps: BasemapDefinition[];
  
  // Drawing
  drawMode: 'none' | 'point' | 'line' | 'polygon' | 'circle' | 'measurement';
  drawnFeatures: DrawnFeature[];
  selectedFeatureId: string | null;
  
  // UI
  isFullscreen: boolean;
  showCoordinateDisplay: boolean;
  showElevation: boolean;
  showScaleBar: boolean;
  useNauticalMiles: boolean;
}
```

## Elevation Data

Uses Mapzen Terrarium RGB-encoded tiles from AWS Open Data:

- **Source**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- **Encoding**: `elevation = (R × 256 + G + B/256) - 32768` meters
- **Max Zoom**: 15
- **Coverage**: Global
- **No API key required**

### Caching

Elevation tiles are cached in memory (LRU, ~50 tiles / ~12.5MB) for instant lookups after initial load.

## Drawing & Export

### Supported Geometries

- **Point**: Single coordinate marker
- **Line**: LineString with multiple vertices
- **Polygon**: Closed polygon with fill (enclosed arc)
- **Circle**: Circle defined by center point and radius
- **Measurement**: Line with distance calculation overlay

### Drawing Instructions

| Mode | How to Draw |
|------|-------------|
| Point | Click to place |
| Line | Click to add vertices, double-click to finish |
| Polygon | Click to add vertices, double-click to close |
| Circle | Click to set center, click again to set radius |
| Measurement | Click to add points, double-click to finish |

### GeoJSON Export

Drawn features can be exported to GeoJSON:

```tsx
import { downloadGeoJSON } from './components/InteractiveMap';

const features = useMapStore.getState().exportFeatures();
downloadGeoJSON(features, 'my-export');
```

### GeoJSON Import

Import features from a GeoJSON file:

```tsx
import { importGeoJSONFile, parseGeoJSON } from './components/InteractiveMap';

// From file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const features = await importGeoJSONFile(file);
  useMapStore.getState().importFeatures(features);
});

// From string
const geoJsonString = '{"type":"FeatureCollection","features":[...]}';
const features = parseGeoJSON(geoJsonString);
useMapStore.getState().importFeatures(features);
```

### Geometry Utilities

```tsx
import { 
  calculateDistance,
  calculateLineDistance,
  calculatePolygonArea,
  generateCirclePolygon,
  formatDistance,
  formatArea,
} from './components/InteractiveMap';

// Distance between two points (meters)
const dist = calculateDistance([lon1, lat1], [lon2, lat2]);

// Total line distance
const lineLength = calculateLineDistance([[lon1, lat1], [lon2, lat2], [lon3, lat3]]);

// Polygon area (square meters)
const area = calculatePolygonArea([[[lon1, lat1], [lon2, lat2], [lon3, lat3], [lon1, lat1]]]);

// Generate circle as polygon
const circleCoords = generateCirclePolygon([centerLon, centerLat], radiusMeters, 64);

// Format for display
formatDistance(1500, true); // "0.81 NM"
formatDistance(1500, false); // "1.50 km"
formatArea(50000); // "5.00 ha"
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ESC` | Exit fullscreen mode |

## Styling

The component uses Tailwind CSS classes. Custom OpenLayers styling is in `map-styles.css`.

### Theme Colors

- Primary: `emerald-500` (green)
- Secondary: `sky-500` (blue)
- Selected: `amber-500` (yellow/orange)
- Error: `red-500`
- Background: `gray-800/900`

## Integration with Other Tools

### Sensor Footprint Overlay

The map can display EO/IR sensor footprints from the SensorFootprint tool:

```tsx
const { setShowSensorFootprint, setSensorFootprintCenter } = useMapStore();

// Enable overlay
setShowSensorFootprint(true);
setSensorFootprintCenter([-115.17, 36.12]);
```

### Sharing Map State

Map center/zoom is persisted in Zustand store and can be shared with other tools:

```tsx
import { useMapView } from './components/InteractiveMap';

function OtherTool() {
  const { center, zoom } = useMapView();
  // Use map center for calculations
}
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires ES2020+ features (optional chaining, nullish coalescing).

## Troubleshooting

### Tiles Not Loading

1. Check network connectivity
2. Verify CORS headers if using custom tile server
3. Check browser console for errors

### Elevation Shows "Loading..."

Elevation tiles load on-demand. First hover over an area triggers tile fetch. Subsequent hovers in same area are instant.

### MGRS Shows "Outside MGRS range"

MGRS is only valid between 80°S and 84°N latitude.

### Drawing Not Working

Ensure `drawMode` is set to `'point'`, `'line'`, `'polygon'`, `'circle'`, or `'measurement'` (not `'none'`).

### Circle Not Completing

After clicking the center point, click anywhere else to set the radius. The circle preview will show while drawing.

### GeoJSON Import Fails

Ensure the file is valid GeoJSON with a `FeatureCollection` or single `Feature` at the root. Supported geometry types:
- Point
- LineString
- Polygon
