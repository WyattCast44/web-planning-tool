/**
 * Basemap Selector Component
 * 
 * Dropdown for selecting available basemaps.
 */

import { useMapStore } from './mapStore';

export function BasemapSelector() {
  const { activeBasemapId, availableBasemaps, setActiveBasemap } = useMapStore();

  return (
    <div className="flex flex-col">
      <label 
        htmlFor="basemapSelect" 
        className="text-[10px] text-gray-400 uppercase tracking-wider mb-1"
      >
        Basemap
      </label>
      <select
        id="basemapSelect"
        value={activeBasemapId}
        onChange={(e) => setActiveBasemap(e.target.value)}
        className="bg-gray-800 text-gray-200 text-xs border border-gray-600 rounded px-2 py-1.5 min-w-[120px]"
      >
        {availableBasemaps.map((basemap) => (
          <option 
            key={basemap.id} 
            value={basemap.id}
            className="bg-gray-800 text-gray-200"
          >
            {basemap.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Basemap button group (alternative UI)
 */
export function BasemapButtonGroup() {
  const { activeBasemapId, availableBasemaps, setActiveBasemap } = useMapStore();

  // Show only first 4 basemaps as buttons
  const quickBasemaps = availableBasemaps.slice(0, 4);
  const moreBasemaps = availableBasemaps.slice(4);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Basemap</span>
      <div className="flex flex-wrap gap-1">
        {quickBasemaps.map((basemap) => (
          <button
            key={basemap.id}
            onClick={() => setActiveBasemap(basemap.id)}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              activeBasemapId === basemap.id
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
            title={basemap.name}
          >
            {basemap.name.substring(0, 8)}
          </button>
        ))}
        
        {/* More dropdown if there are additional basemaps */}
        {moreBasemaps.length > 0 && (
          <select
            value={moreBasemaps.find(b => b.id === activeBasemapId)?.id ?? ''}
            onChange={(e) => e.target.value && setActiveBasemap(e.target.value)}
            className={`px-2 py-1 text-[10px] rounded transition-colors bg-gray-800 text-gray-400 border border-gray-700 ${
              moreBasemaps.some(b => b.id === activeBasemapId) ? 'border-emerald-500/50' : ''
            }`}
          >
            <option value="" disabled>More...</option>
            {moreBasemaps.map((basemap) => (
              <option key={basemap.id} value={basemap.id}>
                {basemap.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
