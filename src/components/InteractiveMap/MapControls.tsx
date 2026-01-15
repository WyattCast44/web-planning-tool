/**
 * Map Controls Component
 * 
 * UI controls for fullscreen toggle, display settings, etc.
 */

import { useMapStore } from './mapStore';

export function MapControls() {
  const {
    isFullscreen,
    showCoordinateDisplay,
    showElevation,
    showScaleBar,
    useNauticalMiles,
    toggleFullscreen,
    setShowCoordinateDisplay,
    setShowElevation,
    setShowScaleBar,
    setUseNauticalMiles,
  } = useMapStore();

  return (
    <div className="flex flex-col gap-2">
      {/* Display Toggles */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Display</span>
        <div className="flex flex-wrap gap-1">
          <ToggleButton
            active={showCoordinateDisplay}
            onClick={() => setShowCoordinateDisplay(!showCoordinateDisplay)}
            label="Coords"
            title="Show coordinate display"
          />
          <ToggleButton
            active={showElevation}
            onClick={() => setShowElevation(!showElevation)}
            label="Elev"
            title="Show elevation data"
          />
          <ToggleButton
            active={showScaleBar}
            onClick={() => setShowScaleBar(!showScaleBar)}
            label="Scale"
            title="Show scale bar"
          />
        </div>
      </div>

      {/* Units Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <span className="text-[10px] text-gray-400">Scale Units:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setUseNauticalMiles(true)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              useNauticalMiles
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            NM
          </button>
          <button
            onClick={() => setUseNauticalMiles(false)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              !useNauticalMiles
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            KM
          </button>
        </div>
      </div>

      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className="w-full px-3 py-2 text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
      >
        <span>{isFullscreen ? '⊡' : '⛶'}</span>
        <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
      </button>
    </div>
  );
}

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  title?: string;
}

function ToggleButton({ active, onClick, label, title }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-[10px] rounded transition-colors ${
        active
          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
      }`}
      title={title}
    >
      {label}
    </button>
  );
}

/**
 * Fullscreen toggle button for map overlay
 */
export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useMapStore();

  return (
    <button
      onClick={toggleFullscreen}
      className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm border border-gray-600 rounded text-gray-300 hover:bg-gray-800 transition-colors"
      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
    >
      {isFullscreen ? '⊡' : '⛶'}
    </button>
  );
}

/**
 * Settings panel that can be toggled
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const {
    showCoordinateDisplay,
    showElevation,
    showScaleBar,
    useNauticalMiles,
    offlineMode,
    setShowCoordinateDisplay,
    setShowElevation,
    setShowScaleBar,
    setUseNauticalMiles,
  } = useMapStore();

  return (
    <div className="absolute top-12 right-2 z-20 bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg p-3 w-48 shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
        <span className="text-xs text-gray-300 font-medium">Map Settings</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <SettingsToggle
          checked={showCoordinateDisplay}
          onChange={setShowCoordinateDisplay}
          label="Show Coordinates"
        />
        <SettingsToggle
          checked={showElevation}
          onChange={setShowElevation}
          label="Show Elevation"
        />
        <SettingsToggle
          checked={showScaleBar}
          onChange={setShowScaleBar}
          label="Show Scale Bar"
        />
        
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">Scale Units</span>
            <select
              value={useNauticalMiles ? 'nm' : 'km'}
              onChange={(e) => setUseNauticalMiles(e.target.value === 'nm')}
              className="bg-gray-800 text-gray-300 text-[10px] border border-gray-600 rounded px-1 py-0.5"
            >
              <option value="nm">Nautical Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </div>
        </div>

        {offlineMode && (
          <div className="pt-2 border-t border-gray-700">
            <span className="text-[10px] text-amber-400">⚠ Offline Mode</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SettingsToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

function SettingsToggle({ checked, onChange, label }: SettingsToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-[10px] text-gray-400 group-hover:text-gray-300 transition-colors">
        {label}
      </span>
      <div
        className={`relative w-8 h-4 rounded-full transition-colors ${
          checked ? 'bg-emerald-500/50' : 'bg-gray-700'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
            checked ? 'left-4 bg-emerald-400' : 'left-0.5 bg-gray-400'
          }`}
        />
      </div>
    </label>
  );
}
