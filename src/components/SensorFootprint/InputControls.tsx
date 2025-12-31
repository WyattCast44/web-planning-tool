import type { SensorSpec, CameraSpec, LensSpec, UnitKey } from "../../types";
import { UNITS } from "../../types";
import type { AtmosphericCondition } from "../../core/niirs";
import { ATMOSPHERIC_LABELS } from "../../core/niirs";

interface InputControlsProps {
  groundRange: number;
  setGroundRange: (value: number) => void;
  rangeUnit: UnitKey;
  setRangeUnit: (value: UnitKey) => void;
  // Sensor selection (e.g., MTS-B, BLOS Pod)
  allSensors: SensorSpec[];
  activeSensorId: string;
  setActiveSensorId: (value: string) => void;
  // Camera selection (e.g., EO, MWIR)
  availableCameras: CameraSpec[];
  activeCameraId: string;
  setActiveCameraId: (value: string) => void;
  // Lens selection (e.g., Wide, Narrow)
  availableLenses: LensSpec[];
  activeLensId: string;
  setActiveLensId: (value: string) => void;
  // Zoom
  activeZoom: number;
  setActiveZoom: (value: number) => void;
  activeCamera: CameraSpec | undefined;
  // Visibility / Atmosphere
  atmosphere: AtmosphericCondition;
  setAtmosphere: (value: AtmosphericCondition) => void;
  // Outputs
  depressionDeg: number;
  slantRangeDisplay: string;
}

export function InputControls({
  groundRange,
  setGroundRange,
  rangeUnit,
  setRangeUnit,
  allSensors,
  activeSensorId,
  setActiveSensorId,
  availableCameras,
  activeCameraId,
  setActiveCameraId,
  availableLenses,
  activeLensId,
  setActiveLensId,
  activeZoom,
  setActiveZoom,
  activeCamera,
  atmosphere,
  setAtmosphere,
  depressionDeg,
  slantRangeDisplay,
}: InputControlsProps) {
  return (
    <div>
      {/* Sensor & Camera Selection */}
      <div className="grid grid-cols-4 divide-x divide-gray-600">
        {/* Sensor System (e.g., MTS-B, BLOS Pod) */}
        <div className="flex flex-col">
          <label className="font-display border-b border-gray-600" htmlFor="sensorSelect">
            SENSOR
          </label>
          <select
            id="sensorSelect"
            className="border-0 flex-1 bg-gray-800 text-gray-300"
            value={activeSensorId}
            onChange={(e) => setActiveSensorId(e.target.value)}
          >
            {allSensors.map((s) => (
              <option key={s.id} value={s.id} className="bg-gray-800 text-gray-300">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Camera (e.g., EO, MWIR, SWIR) */}
        <div className="flex flex-col">
          <label className="font-display border-b border-gray-600" htmlFor="cameraSelect">
            CAMERA
          </label>
          <select
            id="cameraSelect"
            className="border-0 flex-1 bg-gray-800 text-gray-300"
            value={activeCameraId}
            onChange={(e) => setActiveCameraId(e.target.value)}
          >
            {availableCameras.map((c) => (
              <option key={c.id} value={c.id} className="bg-gray-800 text-gray-300">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lens (e.g., Wide, Narrow, Ultra Narrow) */}
        <div className="flex flex-col">
          <label className="font-display border-b border-gray-600" htmlFor="lensSelect">
            LENS
          </label>
          <select
            id="lensSelect"
            className="border-0 flex-1 bg-gray-800 text-gray-300"
            value={activeLensId}
            onChange={(e) => setActiveLensId(e.target.value)}
          >
            {availableLenses.map((l) => (
              <option key={l.id} value={l.id} className="bg-gray-800 text-gray-300">
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Digital Zoom */}
        <div className="flex flex-col">
          <label className="font-display border-b border-gray-600" htmlFor="zoomSelect">
            ZOOM
          </label>
          <select
            id="zoomSelect"
            className="border-0 flex-1 bg-gray-800 text-gray-300"
            value={activeZoom}
            onChange={(e) => setActiveZoom(Number(e.target.value))}
          >
            {(activeCamera?.digitalZoom || [1]).map((z) => (
              <option key={z} value={z} className="bg-gray-800 text-gray-300">
                {z}×
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Range, Visibility, and Output Controls */}
      <div className="grid grid-cols-4 divide-x divide-gray-600 border-y border-gray-600">
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="groundRange">
            GND RNG
          </label>
          <div className="flex">
            <input
              type="number"
              id="groundRange"
              value={groundRange}
              min={0.1}
              max={200}
              step={0.1}
              className="flex-1 min-w-12"
              onChange={(e) => setGroundRange(Number(e.target.value))}
            />
            <select
              id="rangeUnit"
              className="bg-gray-800 text-gray-300 px-1 border-l border-gray-600"
              value={rangeUnit}
              onChange={(e) => setRangeUnit(e.target.value as UnitKey)}
            >
              {Object.entries(UNITS).map(([key, spec]) => (
                <option key={key} value={key} className="bg-gray-800 text-gray-300">
                  {spec.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visibility / Atmospheric Conditions */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="atmosphere">
            VIS
          </label>
          <select
            id="atmosphere"
            className="border-0 flex-1 bg-gray-800 text-gray-300 text-xs"
            value={atmosphere}
            onChange={(e) => setAtmosphere(e.target.value as AtmosphericCondition)}
          >
            {(Object.keys(ATMOSPHERIC_LABELS) as AtmosphericCondition[]).map((key) => (
              <option key={key} value={key} className="bg-gray-800 text-gray-300">
                {ATMOSPHERIC_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        {/* Depression Angle Output */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display">DEPR</label>
          <div className="flex-1 flex items-center justify-center text-emerald-400 font-mono text-sm">
            {depressionDeg.toFixed(1)}°
          </div>
        </div>

        {/* Slant Range Output */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display">SLANT ({UNITS[rangeUnit].label})</label>
          <div className="flex-1 flex items-center justify-center text-emerald-400 font-mono text-sm">
            {slantRangeDisplay}
          </div>
        </div>
      </div>
    </div>
  );
}
