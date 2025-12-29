import { InputField } from "../shared/InputField";
import type { SensorSpec, CameraSpec, LensSpec, UnitKey } from "./types";
import { UNITS } from "./types";

interface InputControlsProps {
  groundRange: number;
  setGroundRange: (value: number) => void;
  rangeUnit: UnitKey;
  setRangeUnit: (value: UnitKey) => void;
  sensorAzimuth: number;
  setSensorAzimuth: (value: number) => void;
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
  // Display
  depressionDeg: number;
  slantRangeDisplay: string;
  displayUnit: UnitKey;
}

export function InputControls({
  groundRange,
  setGroundRange,
  rangeUnit,
  setRangeUnit,
  sensorAzimuth,
  setSensorAzimuth,
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
  depressionDeg,
  slantRangeDisplay,
  displayUnit,
}: InputControlsProps) {
  // Get active lens for FOV display
  const activeLens = availableLenses.find((l) => l.id === activeLensId);

  return (
    <div>
      {/* Sensor & Camera Selection */}
      <div className="grid grid-cols-6 divide-x divide-gray-600">
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

        {/* HFOV Display */}
        <InputField
          id="hfov"
          label="HFOV"
          value={
            activeLens
              ? `${(activeLens.hfov / activeZoom).toFixed(2)}°`
              : "---"
          }
          onChange={() => {}}
          disabled
        />

        {/* VFOV Display */}
        <InputField
          id="vfov"
          label="VFOV"
          value={
            activeLens
              ? `${(activeLens.vfov / activeZoom).toFixed(2)}°`
              : "---"
          }
          onChange={() => {}}
          disabled
        />
      </div>

      {/* Range and Azimuth Controls */}
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
              className="flex-1 min-w-0"
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

        <InputField
          id="sensorAzimuth"
          label="REL AZ"
          value={sensorAzimuth}
          onChange={setSensorAzimuth}
          min={-180}
          max={180}
          step={1}
        />

        <InputField
          id="depression"
          label="DEPR"
          value={`${depressionDeg.toFixed(1)}°`}
          onChange={() => {}}
          disabled
        />

        <InputField
          id="slantRange"
          label={`SLANT (${UNITS[displayUnit].label})`}
          value={slantRangeDisplay}
          onChange={() => {}}
          disabled
        />
      </div>
    </div>
  );
}
