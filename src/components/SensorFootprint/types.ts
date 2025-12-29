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
