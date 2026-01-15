/**
 * Interactive Map Component
 * 
 * Main component that assembles the map with all controls and overlays.
 * Supports fullscreen mode, coordinate display, drawing tools, and more.
 */

import { useState, useEffect, useCallback } from 'react';
import { Panel } from '../Panel';
import { MapCanvas } from './MapCanvas';
import { CoordinateDisplay } from './CoordinateDisplay';
import { BasemapSelector } from './BasemapSelector';
import { DrawingTools, DrawingToolsCompact } from './DrawingTools';
import { FullscreenButton, SettingsPanel } from './MapControls';
import { useMapStore } from './mapStore';
import { useFeatureConfig } from '../../config/store';

export function InteractiveMap() {
  const features = useFeatureConfig();
  const { 
    isFullscreen, 
    showCoordinateDisplay,
    setFullscreen,
  } = useMapStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);

  // Check if feature is enabled
  if (!features.interactiveMap?.enabled) {
    return null;
  }

  // Handle escape key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, setFullscreen]);

  // Handle fullscreen change from browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen, setFullscreen]);

  // Fullscreen wrapper
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900">
        <MapCanvas className="w-full h-full" />
        
        {/* Floating toolbar */}
        <div className="absolute top-2 left-2 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-600 rounded-lg p-2">
          <div className="flex items-center gap-3">
            <BasemapSelector />
            <div className="w-px h-8 bg-gray-600" />
            <DrawingToolsCompact />
            <div className="w-px h-8 bg-gray-600" />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              ⚙
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}

        {/* Coordinate display */}
        {showCoordinateDisplay && <CoordinateDisplay />}

        {/* Fullscreen button */}
        <FullscreenButton />
      </div>
    );
  }

  // Normal panel view
  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-b border-gray-600">
        Interactive Map
      </header>

      {/* Toolbar */}
      <div className="border-b border-gray-600">
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className="w-full px-3 py-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-between"
        >
          <span className="uppercase tracking-wider">Tools</span>
          <span>{showToolbar ? '▲' : '▼'}</span>
        </button>
        
        {showToolbar && (
          <div className="px-3 py-2 grid grid-cols-3 gap-3">
            <BasemapSelector />
            <DrawingTools />
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Options</span>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-2 py-1.5 text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
              >
                Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative" style={{ height: '400px' }}>
        <MapCanvas />
        
        {/* Coordinate display overlay */}
        {showCoordinateDisplay && <CoordinateDisplay />}

        {/* Fullscreen button overlay */}
        <FullscreenButton />

        {/* Settings panel overlay */}
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </div>
    </Panel>
  );
}

// Export all sub-components for flexibility
export { MapCanvas } from './MapCanvas';
export { CoordinateDisplay } from './CoordinateDisplay';
export { BasemapSelector } from './BasemapSelector';
export { DrawingTools } from './DrawingTools';
export { MapControls, FullscreenButton, SettingsPanel } from './MapControls';
export { useMapStore } from './mapStore';
export { getElevationService } from './ElevationService';
export * from './mapUtils';
