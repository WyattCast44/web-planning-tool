/**
 * Drawing Tools Component
 * 
 * Tools for drawing points, lines, polygons, circles, and measurements on the map.
 * Includes feature management and GeoJSON import/export.
 */

import { useState, useRef } from 'react';
import { useMapStore, type DrawMode } from './mapStore';
import { 
  downloadGeoJSON, 
  importGeoJSONFile, 
  type DrawFeatureProperties,
  formatDistance,
  formatArea,
} from './mapUtils';

const DRAW_MODES: { mode: DrawMode; label: string; icon: string }[] = [
  { mode: 'none', label: 'Select', icon: '↖' },
  { mode: 'point', label: 'Point', icon: '📍' },
  { mode: 'line', label: 'Line', icon: '📏' },
  { mode: 'polygon', label: 'Polygon', icon: '⬡' },
  { mode: 'circle', label: 'Circle', icon: '◯' },
  { mode: 'measurement', label: 'Measure', icon: '📐' },
];

export function DrawingTools() {
  const { 
    drawMode, 
    drawnFeatures, 
    selectedFeatureId,
    useNauticalMiles,
    setDrawMode, 
    removeFeature,
    clearFeatures,
    setSelectedFeature,
    toggleFeatureVisibility,
    exportFeatures,
    importFeatures,
  } = useMapStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showFeatureList, setShowFeatureList] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const features = exportFeatures();
      if (features.length === 0) {
        alert('No features to export');
        return;
      }

      const featuresToExport: DrawFeatureProperties[] = features.map(f => ({
        id: f.id,
        type: f.type,
        name: f.name,
        description: f.description,
        coordinates: f.coordinates,
        timestamp: f.timestamp,
        radius: f.radius,
        center: f.center,
        distance: f.distance,
        area: f.area,
      }));

      downloadGeoJSON(featuresToExport, `map-export-${Date.now()}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. See console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const features = await importGeoJSONFile(file);
      
      if (features.length === 0) {
        setImportError('No valid features found in file');
        return;
      }

      importFeatures(features.map(f => ({
        type: f.type,
        name: f.name,
        description: f.description,
        coordinates: f.coordinates,
        radius: f.radius,
        center: f.center,
        distance: f.distance,
        area: f.area,
      })));

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportError('Failed to import file. Ensure it is valid GeoJSON.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClear = () => {
    if (drawnFeatures.length === 0) return;
    if (confirm('Clear all drawn features? This cannot be undone.')) {
      clearFeatures();
    }
  };

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'point': return '📍';
      case 'line': return '📏';
      case 'polygon': return '⬡';
      case 'circle': return '◯';
      case 'measurement': return '📐';
      default: return '📍';
    }
  };

  const getFeatureDetails = (feature: typeof drawnFeatures[0]) => {
    if (feature.type === 'measurement' && feature.distance !== undefined) {
      return formatDistance(feature.distance, useNauticalMiles);
    }
    if (feature.type === 'circle' && feature.radius !== undefined) {
      return `r=${formatDistance(feature.radius, useNauticalMiles)}`;
    }
    if (feature.type === 'polygon' && feature.area !== undefined) {
      return formatArea(feature.area);
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Draw Mode Buttons */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Draw</span>
        <div className="flex flex-wrap gap-1">
          {DRAW_MODES.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setDrawMode(mode)}
              className={`px-2 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${
                drawMode === mode
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
              title={label}
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drawing Mode Instructions */}
      {drawMode !== 'none' && (
        <div className="text-[10px] text-gray-500 italic px-1">
          {drawMode === 'point' && 'Click to place a point'}
          {drawMode === 'line' && 'Click points, double-click to finish'}
          {drawMode === 'polygon' && 'Click vertices, double-click to close'}
          {drawMode === 'circle' && 'Click center, then click to set radius'}
          {drawMode === 'measurement' && 'Click points to measure, double-click to finish'}
        </div>
      )}

      {/* Feature Count & Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={() => setShowFeatureList(!showFeatureList)}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          {drawnFeatures.length} feature{drawnFeatures.length !== 1 ? 's' : ''} 
          <span className="ml-1">{showFeatureList ? '▲' : '▼'}</span>
        </button>
        
        <div className="flex gap-1">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".geojson,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="px-2 py-1 text-[10px] bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 rounded hover:bg-indigo-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Import GeoJSON"
          >
            {isImporting ? '...' : 'Import'}
          </button>
          <button
            onClick={handleExport}
            disabled={drawnFeatures.length === 0 || isExporting}
            className="px-2 py-1 text-[10px] bg-sky-600/30 text-sky-300 border border-sky-500/50 rounded hover:bg-sky-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Export to GeoJSON"
          >
            {isExporting ? '...' : 'Export'}
          </button>
          <button
            onClick={handleClear}
            disabled={drawnFeatures.length === 0}
            className="px-2 py-1 text-[10px] bg-red-600/30 text-red-300 border border-red-500/50 rounded hover:bg-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Clear all features"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Import Error */}
      {importError && (
        <div className="text-[10px] text-red-400 px-1">
          {importError}
        </div>
      )}

      {/* Feature List */}
      {showFeatureList && drawnFeatures.length > 0 && (
        <div className="max-h-40 overflow-y-auto bg-gray-900/50 rounded border border-gray-700 p-1">
          {drawnFeatures.map((feature) => (
            <div
              key={feature.id}
              onClick={() => setSelectedFeature(feature.id)}
              className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                selectedFeatureId === feature.id
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-500 flex-shrink-0">
                  {getFeatureIcon(feature.type)}
                </span>
                <span className={`truncate ${!feature.visible ? 'line-through opacity-50' : ''}`}>
                  {feature.name}
                </span>
                {getFeatureDetails(feature) && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    ({getFeatureDetails(feature)})
                  </span>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFeatureVisibility(feature.id);
                  }}
                  className="px-1 text-gray-500 hover:text-gray-300"
                  title={feature.visible ? 'Hide' : 'Show'}
                >
                  {feature.visible ? '👁' : '👁‍🗨'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFeature(feature.id);
                  }}
                  className="px-1 text-red-500 hover:text-red-400"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact drawing toolbar for inline use
 */
export function DrawingToolsCompact() {
  const { drawMode, drawnFeatures, setDrawMode } = useMapStore();

  return (
    <div className="flex items-center gap-1">
      {DRAW_MODES.map(({ mode, icon }) => (
        <button
          key={mode}
          onClick={() => setDrawMode(mode)}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            drawMode === mode
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
          }`}
          title={mode === 'none' ? 'Select' : mode.charAt(0).toUpperCase() + mode.slice(1)}
        >
          {icon}
        </button>
      ))}
      {drawnFeatures.length > 0 && (
        <span className="ml-1 text-[10px] text-gray-500">
          ({drawnFeatures.length})
        </span>
      )}
    </div>
  );
}
