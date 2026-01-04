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
import {
  calculateNiirs,
  getDefaultResolution,
  getSensorType,
  type AtmosphericCondition,
  type NiirsResult,
} from "../core/niirs";
import type {
  FlatLens,
  UnitKey,
  DisplayFootprint,
} from "../types";
import { useSensorConfig, useDisplayConfig, useFeatureConfig } from "../config/store";

export function SensorFootprint() {
  const sensorConfig = useSensorConfig();
  const displayConfig = useDisplayConfig();
  const featureConfig = useFeatureConfig();

  // Global state from store
  const { altKft, tgtElevKft } = useAppStore();

  // Local state for sensor-specific settings
  const [groundRange, setGroundRange] = useState(5);
  const [rangeUnit, setRangeUnit] = useState<UnitKey>(
    displayConfig.defaultDistanceUnit
  );
  const [summaryUnit, setSummaryUnit] = useState<UnitKey>(
    displayConfig.defaultDistanceUnit
  );
  const [activeZoom, setActiveZoom] = useState(1);

  // Atmospheric conditions for NIIRS calculation
  const [atmosphere, setAtmosphere] = useState<AtmosphericCondition>("good");

  // Sensor system selection (e.g., MTS-B, BLOS Pod)
  const [activeSensorId, setActiveSensorId] = useState(
    sensorConfig.sensorSystems[0]?.id || ""
  );

  // Get active sensor system
  const activeSensor = sensorConfig.sensorSystems.find((s) => s.id === activeSensorId);

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
      // Include sensor resolution if available
      sensorWidth: activeCamera.sensorWidth,
      sensorHeight: activeCamera.sensorHeight,
    };
  }, [activeSensor, activeCamera, activeLens]);

  // Handle sensor change - reset camera, lens, and zoom
  const handleSensorChange = (sensorId: string) => {
    setActiveSensorId(sensorId);
    const newSensor = sensorConfig.sensorSystems.find((s) => s.id === sensorId);
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
  // Use azimuth = 0 (sensor looking "north" in local frame) for footprint-centered canvas
  const footprints = useMemo<DisplayFootprint[]>(() => {
    if (!geometry.valid || !flatLens) return [];

    const effectiveHfov = flatLens.hfov / activeZoom;
    const effectiveVfov = flatLens.vfov / activeZoom;

    const footprint = calculateFootprint(
      geometry.depression,
      0, // No azimuth rotation - footprint will be oriented with Y-axis = look direction
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
  }, [geometry, flatLens, activeZoom]);

  // Calculate NIIRS estimate
  const niirsResult = useMemo<NiirsResult | null>(() => {
    if (!geometry.valid || !flatLens) return null;

    const effectiveHfov = flatLens.hfov / activeZoom;
    const effectiveVfov = flatLens.vfov / activeZoom;

    // Get sensor resolution - use camera values if available, otherwise defaults
    let sensorWidth = flatLens.sensorWidth;
    let sensorHeight = flatLens.sensorHeight;

    if (!sensorWidth || !sensorHeight) {
      const defaultRes = getDefaultResolution(flatLens.type);
      sensorWidth = sensorWidth || defaultRes.width;
      sensorHeight = sensorHeight || defaultRes.height;
    }

    return calculateNiirs({
      slantRangeFt: geometry.slantRange,
      hfovDeg: effectiveHfov,
      vfovDeg: effectiveVfov,
      sensorWidthPx: sensorWidth,
      sensorHeightPx: sensorHeight,
      sensorType: getSensorType(flatLens.type),
      atmosphere,
      digitalZoom: activeZoom,
      depressionDeg: geometry.depression,
    });
  }, [geometry, flatLens, activeZoom, atmosphere]);

  // Format slant range for display
  const slantRangeDisplay = geometry.valid
    ? formatValue(convertFromFeet(geometry.slantRange, rangeUnit))
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
        // Sensor selection
        allSensors={sensorConfig.sensorSystems}
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
        // Visibility
        atmosphere={atmosphere}
        setAtmosphere={setAtmosphere}
        // Outputs
        depressionDeg={geometry.valid ? geometry.depression : 0}
        slantRangeDisplay={slantRangeDisplay}
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
          displayUnit={rangeUnit}
          altitudeFt={altKft * 1000}
        />
        <DisplayOptions
          summaryUnit={summaryUnit}
          setSummaryUnit={setSummaryUnit}
          footprints={footprints}
          niirsResult={featureConfig.sensorFootprint.showNIIRS ? niirsResult : null}
        />
      </div>
    </Panel>
  );
}