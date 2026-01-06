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

// Legacy SensorConfig interface (for backward compatibility)
export interface SensorConfig {
  turret: TurretSpec;
  sensors: SensorSpec[];
  defaults?: {
    units?: UnitKey;
  };
}

// New comprehensive AppConfig structure
export type ClassificationLevel = "U" | "CUI" | "S" | "TS";

export interface ClassificationConfig {
  bannerEnabled: boolean;
  level: ClassificationLevel;
  sar: boolean;
  bannerText: string;
}

export interface SensorsConfig {
  turret: TurretSpec;
  sensorSystems: SensorSpec[];
}

export interface DisplayConfig {
  defaultDistanceUnit: UnitKey;
  decimalPlaces: {
    distance: number;
    speed: number;
    angle: number;
    altitude: number;
  };
}

export interface FeatureConfig {
  sensorFootprint: {
    enabled: boolean;
    showNIIRS: boolean;
  };
  satcomAssessor: {
    enabled: boolean;
  };
  windedVector: {
    enabled: boolean;
  };
  airDeconfliction: {
    enabled: boolean;
  };
}

export interface PerformanceConfig {
  canvas: {
    maxFps: number;
    enableAntialiasing: boolean;
  };
  enableCaching: boolean;
  cacheSize: number;
}

export interface AppConfig {
  classification: ClassificationConfig;
  sensors: SensorsConfig;
  display: DisplayConfig;
  features: FeatureConfig;
  performance: PerformanceConfig;
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

// Default sensor config (legacy, for backward compatibility)
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

// Default app config if app-config.js is not loaded
export const DEFAULT_APP_CONFIG: AppConfig = {
  classification: {
    bannerEnabled: true,
    level: "U",
    sar: false,
    bannerText: "",
  },
  sensors: {
    turret: { minAzimuth: -180, maxAzimuth: 180, minDepression: 0, maxDepression: 90 },
    sensorSystems: [
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
  },
  display: {
    defaultDistanceUnit: "nmi",
    decimalPlaces: {
      distance: 2,
      speed: 1,
      angle: 1,
      altitude: 1,
    },
  },
  features: {
    sensorFootprint: {
      enabled: true,
      showNIIRS: true,
    },
    satcomAssessor: {
      enabled: true,
    },
    windedVector: {
      enabled: true,
    },
    airDeconfliction: {
      enabled: true,
    },
  },
  performance: {
    canvas: {
      maxFps: 60,
      enableAntialiasing: true,
    },
    enableCaching: true,
    cacheSize: 1000,
  },
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
    // Legacy support for sensor-config.js
    SENSOR_CONFIG?: SensorConfig;
    // New app config
    APP_CONFIG?: AppConfig;
  }
}
