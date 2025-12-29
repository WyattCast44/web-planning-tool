import { useState, useMemo } from "react";
import { useAppStore } from "../store";
import { Panel } from "./Panel";
import { InputControls } from "./SensorFootprint/InputControls";
import { DisplayOptions } from "./SensorFootprint/DisplayOptions";
import { GraphCanvas } from "./SensorFootprint/GraphCanvas";
import {
  calculateGeometry,
  calculateFootprint,
  convertToFeet,
  convertFromFeet,
  formatValue,
} from "./SensorFootprint/geometry";
import type {
  SensorConfig,
  FlatLens,
  UnitKey,
  DisplayFootprint,
  CameraSpec,
} from "./SensorFootprint/types";
import { DEFAULT_CONFIG, UNITS } from "./SensorFootprint/types";

/**
 * Get sensor config from window or use default
 */
function getSensorConfig(): SensorConfig {
  return typeof window !== "undefined" && window.SENSOR_CONFIG
    ? window.SENSOR_CONFIG
    : DEFAULT_CONFIG;
}

export function SensorFootprint() {
  const config = getSensorConfig();

  // Global state from store
  const { altKft, tgtElevKft, hdgDegCardinal } = useAppStore();

  // Local state for sensor-specific settings
  const [groundRange, setGroundRange] = useState(5);
  const [rangeUnit, setRangeUnit] = useState<UnitKey>("nmi");
  const [displayUnit, setDisplayUnit] = useState<UnitKey>(
    config.defaults?.units || "nmi"
  );
  const [summaryUnit, setSummaryUnit] = useState<UnitKey>(
    config.defaults?.units || "nmi"
  );
  const [sensorAzimuth, setSensorAzimuth] = useState(45);
  const [scale, setScale] = useState(10);
  const [activeZoom, setActiveZoom] = useState(1);

  // Sensor system selection (e.g., MTS-B, BLOS Pod)
  const [activeSensorId, setActiveSensorId] = useState(
    config.sensors[0]?.id || ""
  );

  // Get active sensor system
  const activeSensor = config.sensors.find((s) => s.id === activeSensorId);

  // Camera selection within the active sensor
  const [activeCameraId, setActiveCameraId] = useState(
    activeSensor?.cameras[0]?.id || ""
  );

  // Get cameras for active sensor
  const availableCameras = activeSensor?.cameras || [];

  // Get active camera
  const activeCamera = availableCameras.find((c) => c.id === activeCameraId);

  // Lens selection within the active camera
  const [activeLensId, setActiveLensId] = useState(
    activeCamera?.lenses[0]?.id || ""
  );

  // Get lenses for active camera
  const availableLenses = activeCamera?.lenses || [];

  // Get active lens
  const activeLens = availableLenses.find((l) => l.id === activeLensId);

  // Build flat lens object for calculations
  const flatLens = useMemo<FlatLens | undefined>(() => {
    if (!activeSensor || !activeCamera || !activeLens) return undefined;

    return {
      sensorId: activeSensor.id,
      sensorName: activeSensor.name,
      cameraId: activeCamera.id,
      cameraName: activeCamera.name,
      lensId: activeLens.id,
      lensName: activeLens.name,
      fullName: `${activeSensor.name} ${activeCamera.name} ${activeLens.name}`,
      hfov: activeLens.hfov,
      vfov: activeLens.vfov,
      digitalZoom: activeCamera.digitalZoom || [1],
      type: activeCamera.type,
    };
  }, [activeSensor, activeCamera, activeLens]);

  // Handle sensor change - reset camera, lens, and zoom
  const handleSensorChange = (sensorId: string) => {
    setActiveSensorId(sensorId);
    const newSensor = config.sensors.find((s) => s.id === sensorId);
    if (newSensor && newSensor.cameras.length > 0) {
      setActiveCameraId(newSensor.cameras[0].id);
      if (newSensor.cameras[0].lenses.length > 0) {
        setActiveLensId(newSensor.cameras[0].lenses[0].id);
      }
    }
    setActiveZoom(1);
  };

  // Handle camera change - reset lens and zoom
  const handleCameraChange = (cameraId: string) => {
    setActiveCameraId(cameraId);
    const newCamera = availableCameras.find((c) => c.id === cameraId);
    if (newCamera && newCamera.lenses.length > 0) {
      setActiveLensId(newCamera.lenses[0].id);
    }
    setActiveZoom(1);
  };

  // Handle lens change - reset zoom
  const handleLensChange = (lensId: string) => {
    setActiveLensId(lensId);
    setActiveZoom(1);
  };

  // Calculate geometry
  const altFt = altKft * 1000;
  const tgtFt = tgtElevKft * 1000;
  const groundRangeFt = convertToFeet(groundRange, rangeUnit);

  const geometry = useMemo(() => {
    return calculateGeometry(altFt, tgtFt, groundRangeFt);
  }, [altFt, tgtFt, groundRangeFt]);

  // Calculate footprints for display
  // Use absolute azimuth (heading + relative azimuth) for footprint calculation
  const absoluteAzimuth = hdgDegCardinal + sensorAzimuth;

  const footprints = useMemo<DisplayFootprint[]>(() => {
    if (!geometry.valid || !flatLens) return [];

    const effectiveHfov = flatLens.hfov / activeZoom;
    const effectiveVfov = flatLens.vfov / activeZoom;

    const footprint = calculateFootprint(
      geometry.slantRange,
      geometry.depression,
      absoluteAzimuth,
      effectiveHfov,
      effectiveVfov,
      geometry.heightAboveTarget
    );

    return [
      {
        lens: { ...flatLens, zoom: activeZoom },
        footprint,
        effectiveHfov,
        effectiveVfov,
      },
    ];
  }, [geometry, flatLens, activeZoom, absoluteAzimuth]);

  // Format slant range for display
  const slantRangeDisplay = geometry.valid
    ? formatValue(convertFromFeet(geometry.slantRange, displayUnit))
    : "---";

  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-b border-gray-600">
        EO/IR Footprint
      </header>

      <InputControls
        groundRange={groundRange}
        setGroundRange={setGroundRange}
        rangeUnit={rangeUnit}
        setRangeUnit={setRangeUnit}
        sensorAzimuth={sensorAzimuth}
        setSensorAzimuth={setSensorAzimuth}
        // Sensor selection
        allSensors={config.sensors}
        activeSensorId={activeSensorId}
        setActiveSensorId={handleSensorChange}
        // Camera selection
        availableCameras={availableCameras}
        activeCameraId={activeCameraId}
        setActiveCameraId={handleCameraChange}
        // Lens selection
        availableLenses={availableLenses}
        activeLensId={activeLensId}
        setActiveLensId={handleLensChange}
        // Zoom
        activeZoom={activeZoom}
        setActiveZoom={setActiveZoom}
        activeCamera={activeCamera}
        // Display
        depressionDeg={geometry.valid ? geometry.depression : 0}
        slantRangeDisplay={slantRangeDisplay}
        displayUnit={displayUnit}
      />

      {/* Error display */}
      {!geometry.valid && (
        <div className="mx-3 mt-2 p-2 border border-red-500/50 bg-red-500/10 text-center rounded">
          <span className="text-red-400 text-xs font-bold font-mono">
            {geometry.error}
          </span>
        </div>
      )}

      <div className="flex justify-between px-3 py-2">
        <GraphCanvas
          footprints={footprints}
          geometry={geometry}
          scale={scale}
          displayUnit={displayUnit}
          sensorAzimuth={sensorAzimuth}
          groundRangeFt={groundRangeFt}
        />
        <DisplayOptions
          scale={scale}
          setScale={setScale}
          displayUnit={displayUnit}
          setDisplayUnit={setDisplayUnit}
          summaryUnit={summaryUnit}
          setSummaryUnit={setSummaryUnit}
          footprints={footprints}
        />
      </div>
    </Panel>
  );
}
