interface AppState {
  altKft: number;
  hdgDegCardinal: number;
  keas: number;
  tgtElevKft: number;
  windDegCardinal: number;
  windKts: number;

  /**
   * Derived values
   */
  hat: number;
  ktas: number;
  mach: number;
  gs: number;
  
  // wind data
  windType: 'HW' | 'TW'; // HW = headwind, TW = tailwind
  headwindOrTailwindComponent: number;
  crosswindComponent: number;
  windCorrectionAngleDeg: number;
  courseDegCardinal: number;
}

export type { AppState };

// Lens/FOV specification within a camera
export interface LensSpec {
  id: string;
  name: string;
  hfov: number;
  vfov: number;
}

// Camera within a sensor system
export interface CameraSpec {
  id: string;
  name: string;
  type: string;
  lenses: LensSpec[];
  digitalZoom: number[];
  // Optional sensor resolution for NIIRS calculation
  // If not provided, defaults will be used based on camera type
  sensorWidth?: number;  // pixels
  sensorHeight?: number; // pixels
}

// Sensor system (e.g., MTS-B, BLOS Pod)
export interface SensorSpec {
  id: string;
  name: string;
  cameras: CameraSpec[];
}

export interface TurretSpec {
  minAzimuth: number;
  maxAzimuth: number;
  minDepression: number;
  maxDepression: number;
}

export interface SensorConfig {
  turret: TurretSpec;
  sensors: SensorSpec[];
  defaults?: {
    units?: UnitKey;
  };
}

// Flattened lens for UI display
export interface FlatLens {
  sensorId: string;
  sensorName: string;
  cameraId: string;
  cameraName: string;
  lensId: string;
  lensName: string;
  fullName: string;
  hfov: number;
  vfov: number;
  digitalZoom: number[];
  type: string;
  // Optional resolution from camera
  sensorWidth?: number;
  sensorHeight?: number;
}

// Geometry calculation results
export interface GeometryResult {
  slantRange: number;
  depression: number;
  heightAboveTarget: number;
  centralAngle: number;
  valid: boolean;
  error?: string;
}

// Footprint corner coordinates
export interface Point2D {
  x: number;
  y: number;
}

export interface FootprintResult {
  corners: Point2D[];
  nearWidth: number;
  farWidth: number;
  nearGround: number;
  farGround: number;
  nearRange: number;
  farRange: number;
  centerGround: number;
  centerWidth: number;
  // Horizon tracking
  farEdgeAtHorizon: boolean; // True if far edge depression <= 0°
  farEdgeDepression: number; // Actual far edge depression angle
}

// Display footprint with lens info
export interface DisplayFootprint {
  lens: FlatLens & { zoom: number };
  footprint: FootprintResult;
  effectiveHfov: number;
  effectiveVfov: number;
}

// Unit conversions
export type UnitKey = "nmi" | "km" | "m" | "ft";

export interface UnitSpec {
  label: string;
  toFeet: number;
  fromFeet: number;
}

// Default config if sensor-config.js is not loaded
export const DEFAULT_CONFIG: SensorConfig = {
  turret: { minAzimuth: -180, maxAzimuth: 180, minDepression: 0, maxDepression: 90 },
  sensors: [
    {
      id: "default-sensor",
      name: "Default Sensor",
      cameras: [
        {
          id: "eo",
          name: "EO",
          type: "visible",
          lenses: [{ id: "default", name: "Default", hfov: 20, vfov: 15 }],
          digitalZoom: [1, 2, 4],
          sensorWidth: 1920,
          sensorHeight: 1080,
        },
      ],
    },
  ],
  defaults: { units: "nmi" },
};

// Units lookup
export const UNITS: Record<UnitKey, UnitSpec> = {
  nmi: { label: "NM", toFeet: 6076.115, fromFeet: 1 / 6076.115 },
  km: { label: "KM", toFeet: 3280.84, fromFeet: 1 / 3280.84 },
  m: { label: "M", toFeet: 3.28084, fromFeet: 1 / 3.28084 },
  ft: { label: "FT", toFeet: 1, fromFeet: 1 },
};

declare global {
  interface Window {
    SENSOR_CONFIG?: SensorConfig;
  }
}
