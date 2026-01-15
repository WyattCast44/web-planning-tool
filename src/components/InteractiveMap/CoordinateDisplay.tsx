/**
 * Coordinate Display Component
 * 
 * Shows mouse coordinates in selectable formats (Decimal, DMS, MGRS)
 * along with elevation data from terrain tiles.
 */

import { useMapStore } from './mapStore';
import { formatCoordinate, formatElevation, type CoordinateFormat } from './mapUtils';

const FORMAT_OPTIONS: { value: CoordinateFormat; label: string }[] = [
  { value: 'decimal', label: 'Decimal' },
  { value: 'dms', label: 'DMS' },
  { value: 'mgrs', label: 'MGRS' },
];

export function CoordinateDisplay() {
  const {
    coordinateFormat,
    mouseCoordinate,
    mouseElevation,
    elevationLoading,
    showElevation,
    setCoordinateFormat,
  } = useMapStore();

  // Format current coordinate
  const formattedCoord = mouseCoordinate
    ? formatCoordinate(mouseCoordinate[0], mouseCoordinate[1], coordinateFormat)
    : null;

  // Format elevation
  const elevationDisplay = elevationLoading
    ? 'Loading...'
    : formatElevation(mouseElevation, true);

  return (
    <div className="absolute bottom-2 left-2 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-600 rounded px-3 py-2 font-mono text-xs">
      {/* Format Selector */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
        <span className="text-gray-400 text-[10px] uppercase tracking-wider">Format:</span>
        <div className="flex gap-1">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setCoordinateFormat(option.value)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                coordinateFormat === option.value
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coordinate Display */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-12">COORD:</span>
          <span className="text-emerald-400 font-medium">
            {formattedCoord?.primary ?? '---'}
          </span>
        </div>

        {/* Secondary coordinate (e.g., lat/lon when showing MGRS) */}
        {formattedCoord?.secondary && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-12"></span>
            <span className="text-gray-400 text-[10px]">
              {formattedCoord.secondary}
            </span>
          </div>
        )}

        {/* Elevation Display */}
        {showElevation && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-700/50">
            <span className="text-gray-500 w-12">ELEV:</span>
            <span className={`font-medium ${
              elevationLoading ? 'text-yellow-400' : 
              mouseElevation !== null ? 'text-sky-400' : 'text-gray-500'
            }`}>
              {elevationDisplay}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact coordinate display for toolbar
 */
export function CoordinateDisplayCompact() {
  const { coordinateFormat, mouseCoordinate, mouseElevation, showElevation } = useMapStore();

  const formattedCoord = mouseCoordinate
    ? formatCoordinate(mouseCoordinate[0], mouseCoordinate[1], coordinateFormat)
    : null;

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className="text-emerald-400">
        {formattedCoord?.primary ?? '---'}
      </span>
      {showElevation && mouseElevation !== null && (
        <span className="text-sky-400">
          {formatElevation(mouseElevation, true)}
        </span>
      )}
    </div>
  );
}
