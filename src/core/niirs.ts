/**
 * NIIRS (National Imagery Interpretability Rating Scale) Estimation
 * 
 * Uses a simplified General Image Quality Equation (GIQE 4.0) approach
 * optimized for mission planning with airborne EO/IR sensors.
 * 
 * Includes corrections for:
 * - Oblique viewing angles (GSD elongation)
 * - Atmospheric visibility conditions
 * - Sensor type differences (EO vs IR bands)
 * - Digital zoom degradation
 * 
 * Reference: GIQE 4.0, empirical airborne sensor data
 */

// ============================================================================
// TYPES
// ============================================================================

export type AtmosphericCondition = 
  | "excellent"   // Very clear, >10nm visibility
  | "good"        // Clear, 7-10nm visibility
  | "moderate"    // Light haze, 4-7nm visibility
  | "poor"        // Haze/light fog, 2-4nm visibility
  | "veryPoor";   // Heavy haze/fog, <2nm visibility

export type SensorType = "visible" | "mwir" | "swir" | "lwir";

export interface NiirsInput {
  /** Slant range to target in feet */
  slantRangeFt: number;
  /** Horizontal field of view in degrees (effective, after zoom) */
  hfovDeg: number;
  /** Vertical field of view in degrees (effective, after zoom) */
  vfovDeg: number;
  /** Sensor horizontal resolution in pixels */
  sensorWidthPx: number;
  /** Sensor height resolution in pixels */
  sensorHeightPx: number;
  /** Sensor type for baseline adjustments */
  sensorType: SensorType;
  /** Atmospheric conditions */
  atmosphere: AtmosphericCondition;
  /** Digital zoom factor (1 = no zoom) */
  digitalZoom: number;
  /** Depression angle in degrees (90 = nadir, 0 = horizon) */
  depressionDeg: number;
}

export interface NiirsResult {
  /** Estimated NIIRS value (0-9 scale) */
  niirs: number;
  /** Effective Ground Sample Distance in inches (includes oblique correction) */
  gsdInches: number;
  /** Effective Ground Sample Distance in feet */
  gsdFeet: number;
  /** Effective Ground Sample Distance in meters */
  gsdMeters: number;
  /** Atmospheric degradation factor applied */
  atmosphericFactor: number;
  /** Sensor type adjustment applied */
  sensorTypeFactor: number;
  /** Digital zoom degradation applied */
  zoomDegradation: number;
  /** Oblique angle GSD elongation factor (1.0 = nadir) */
  obliqueElongation: number;
  /** Whether the estimate is valid */
  valid: boolean;
  /** Warning or info message */
  message?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum depression angle for NIIRS estimation (degrees)
 * Below this angle, estimates become unreliable even for large targets
 */
export const MIN_DEPRESSION_ANGLE_DEG = 5;

/**
 * Depression angle thresholds for graduated warnings
 */
export const DEPRESSION_WARNING_THRESHOLDS = {
  CAUTION: 10,    // 5-10°: "Very low depression - estimate may be optimistic"
  WARNING: 15,    // 10-15°: "Low depression - increased uncertainty"
  NORMAL: 30,     // 15-30°: Normal operations, no warning needed
} as const;

/**
 * Default sensor resolutions for common camera types
 * Used when specific sensor data is not available
 */
export const DEFAULT_SENSOR_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  // EO cameras typically have higher resolution
  visible: { width: 1920, height: 1080 },  // HD default
  eo: { width: 1920, height: 1080 },
  // IR cameras typically have lower resolution
  mwir: { width: 640, height: 512 },
  swir: { width: 640, height: 512 },
  lwir: { width: 640, height: 480 },
  ir: { width: 640, height: 512 },
  // High-res options
  "visible-4k": { width: 3840, height: 2160 },
  "mwir-hd": { width: 1280, height: 1024 },
};

/**
 * Atmospheric degradation factors
 * These reduce the effective NIIRS based on visibility conditions
 */
export const ATMOSPHERIC_FACTORS: Record<AtmosphericCondition, number> = {
  excellent: 0.0,    // No degradation
  good: 0.2,         // Slight degradation
  moderate: 0.5,     // Noticeable degradation
  poor: 1.0,         // Significant degradation
  veryPoor: 1.8,     // Severe degradation
};

/**
 * Atmospheric condition display labels
 */
export const ATMOSPHERIC_LABELS: Record<AtmosphericCondition, string> = {
  excellent: "Excellent (>10nm)",
  good: "Good (7-10nm)",
  moderate: "Moderate (4-7nm)",
  poor: "Poor (2-4nm)",
  veryPoor: "Very Poor (<2nm)",
};

/**
 * Sensor type baseline adjustments
 * IR sensors generally have slightly lower interpretability than EO
 * at equivalent GSD due to lower contrast and resolution
 */
export const SENSOR_TYPE_FACTORS: Record<SensorType, number> = {
  visible: 0.0,   // Baseline - no adjustment
  swir: 0.1,      // SWIR close to visible performance
  mwir: 0.3,      // MWIR slight degradation
  lwir: 0.5,      // LWIR more degradation due to lower resolution/contrast
};

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate the GSD elongation factor due to oblique viewing
 * 
 * At oblique angles, pixels project as elongated rectangles on the ground.
 * Using the standard geometric mean approximation:
 * 
 * GSD_effective = GSD_nadir × √(1 / sin(depression_angle))
 * 
 * This returns the multiplier to apply to nadir GSD.
 * 
 * @param depressionDeg Depression angle in degrees (= grazing angle in our system)
 * @returns GSD multiplier (>= 1.0)
 */
export function calculateGsdElongationFactor(depressionDeg: number): number {
  if (depressionDeg <= 0) return Infinity;
  if (depressionDeg >= 90) return 1.0;
  
  const depressionRad = (depressionDeg * Math.PI) / 180;
  const sinDepression = Math.sin(depressionRad);
  
  // Standard geometric mean factor: √(1 / sin(depression))
  return Math.sqrt(1 / sinDepression);
}

/**
 * Calculate Ground Sample Distance (GSD) at nadir
 * 
 * GSD = Slant_Range × pixel_IFOV
 * where pixel_IFOV = FOV (radians) / number of pixels
 * 
 * @param slantRangeFt - Slant range in feet
 * @param fovDeg - Field of view in degrees
 * @param sensorPixels - Number of pixels across the FOV
 * @returns GSD in feet
 */
export function calculateNadirGSD(
  slantRangeFt: number,
  fovDeg: number,
  sensorPixels: number
): number {
  if (sensorPixels <= 0 || slantRangeFt <= 0 || fovDeg <= 0) {
    return 0;
  }
  
  // Convert FOV to radians
  const fovRad = fovDeg * (Math.PI / 180);
  
  // Pixel IFOV = FOV / number of pixels
  const pixelIfov = fovRad / sensorPixels;
  
  // GSD = slant range × pixel IFOV
  return slantRangeFt * pixelIfov;
}

/**
 * Calculate NIIRS estimate using simplified GIQE 4.0 with oblique corrections
 * 
 * Base formula: NIIRS = 10.251 - 3.32 × log10(GSD_effective_inches)
 * 
 * With adjustments for:
 * - Oblique viewing (GSD elongation via √(1/sin(depression)))
 * - Atmospheric conditions (visibility-based penalty)
 * - Sensor type (EO vs IR)
 * - Digital zoom degradation
 * 
 * @param input - NIIRS calculation parameters
 * @returns NIIRS result with GSD and adjustment factors
 */
export function calculateNiirs(input: NiirsInput): NiirsResult {
  const {
    slantRangeFt,
    hfovDeg,
    vfovDeg,
    sensorWidthPx,
    sensorHeightPx,
    sensorType,
    atmosphere,
    digitalZoom,
    depressionDeg,
  } = input;

  // Check for shallow angle - return invalid result
  if (depressionDeg < MIN_DEPRESSION_ANGLE_DEG) {
    return {
      niirs: 0,
      gsdInches: 0,
      gsdFeet: 0,
      gsdMeters: 0,
      atmosphericFactor: 0,
      sensorTypeFactor: 0,
      zoomDegradation: 0,
      obliqueElongation: 0,
      valid: false,
      message: `Depression angle too shallow (<${MIN_DEPRESSION_ANGLE_DEG}°)`,
    };
  }

  // Validate inputs
  if (slantRangeFt <= 0) {
    return {
      niirs: 0,
      gsdInches: 0,
      gsdFeet: 0,
      gsdMeters: 0,
      atmosphericFactor: 0,
      sensorTypeFactor: 0,
      zoomDegradation: 0,
      obliqueElongation: 0,
      valid: false,
      message: "Invalid slant range",
    };
  }

  if (sensorWidthPx <= 0 || sensorHeightPx <= 0) {
    return {
      niirs: 0,
      gsdInches: 0,
      gsdFeet: 0,
      gsdMeters: 0,
      atmosphericFactor: 0,
      sensorTypeFactor: 0,
      zoomDegradation: 0,
      obliqueElongation: 0,
      valid: false,
      message: "Invalid sensor resolution",
    };
  }

  // Calculate nadir GSD for both horizontal and vertical
  const nadirGsdHorizontalFt = calculateNadirGSD(slantRangeFt, hfovDeg, sensorWidthPx);
  const nadirGsdVerticalFt = calculateNadirGSD(slantRangeFt, vfovDeg, sensorHeightPx);
  
  // Use geometric mean for effective nadir GSD (standard GIQE practice)
  const nadirGsdFt = Math.sqrt(nadirGsdHorizontalFt * nadirGsdVerticalFt);
  
  // Apply oblique elongation factor to get effective GSD
  const elongationFactor = calculateGsdElongationFactor(depressionDeg);
  const gsdFeet = nadirGsdFt * elongationFactor;
  
  // Convert to inches for GIQE formula
  const gsdInches = gsdFeet * 12;
  const gsdMeters = gsdFeet * 0.3048;

  if (gsdInches <= 0) {
    return {
      niirs: 0,
      gsdInches: 0,
      gsdFeet: 0,
      gsdMeters: 0,
      atmosphericFactor: 0,
      sensorTypeFactor: 0,
      zoomDegradation: 0,
      obliqueElongation: 0,
      valid: false,
      message: "GSD calculation error",
    };
  }

  // Base NIIRS from GIQE 4.0 using effective (oblique-corrected) GSD
  // NIIRS = 10.251 - 3.32 × log10(GSD_inches)
  let niirs = 10.251 - 3.32 * Math.log10(gsdInches);

  // Apply atmospheric degradation (visibility-based)
  const atmosphericFactor = ATMOSPHERIC_FACTORS[atmosphere] || 0;
  niirs -= atmosphericFactor;

  // Apply sensor type adjustment
  const sensorTypeFactor = SENSOR_TYPE_FACTORS[sensorType] || 0;
  niirs -= sensorTypeFactor;

  // Apply digital zoom degradation
  // Formula: 1.66 × log10(zoom) ≈ 0.5 × log2(zoom)
  // Each 2× digital zoom reduces NIIRS by ~0.5
  let zoomDegradation = 0;
  if (digitalZoom > 1) {
    zoomDegradation = 1.66 * Math.log10(digitalZoom);
    niirs -= zoomDegradation;
  }

  // Clamp NIIRS to valid range (0-9)
  niirs = Math.max(0, Math.min(9, niirs));

  // Generate message with graduated warnings for depression angle
  let message: string | undefined;
  
  // Depression angle warnings (priority order - most severe first)
  if (depressionDeg < DEPRESSION_WARNING_THRESHOLDS.CAUTION) {
    // 5-10°: Very low depression
    message = "Very low depression - estimate may be optimistic";
  } else if (depressionDeg < DEPRESSION_WARNING_THRESHOLDS.WARNING) {
    // 10-15°: Low depression
    message = "Low depression - increased uncertainty";
  } else if (niirs >= 8.5) {
    message = "Exceptional quality - verify conditions";
  } else if (niirs <= 1) {
    message = "Very low quality - consider adjustments";
  } else if (digitalZoom > 4) {
    message = "High digital zoom - quality degraded";
  } else if (elongationFactor > 1.3) {
    message = `Oblique elongation: ${elongationFactor.toFixed(2)}×`;
  }

  return {
    niirs: Math.round(niirs * 10) / 10, // Round to 1 decimal
    gsdInches,
    gsdFeet,
    gsdMeters,
    atmosphericFactor,
    sensorTypeFactor,
    zoomDegradation: Math.round(zoomDegradation * 100) / 100,
    obliqueElongation: Math.round(elongationFactor * 100) / 100,
    valid: true,
    message,
  };
}

/**
 * Get default sensor resolution based on camera type
 */
export function getDefaultResolution(
  cameraType: string
): { width: number; height: number } {
  const normalizedType = cameraType.toLowerCase();
  
  // Try exact match first
  if (DEFAULT_SENSOR_RESOLUTIONS[normalizedType]) {
    return DEFAULT_SENSOR_RESOLUTIONS[normalizedType];
  }
  
  // Try partial matches
  if (normalizedType.includes("mwir") || normalizedType.includes("mid")) {
    return DEFAULT_SENSOR_RESOLUTIONS.mwir;
  }
  if (normalizedType.includes("lwir") || normalizedType.includes("long") || normalizedType.includes("thermal")) {
    return DEFAULT_SENSOR_RESOLUTIONS.lwir;
  }
  if (normalizedType.includes("swir") || normalizedType.includes("short")) {
    return DEFAULT_SENSOR_RESOLUTIONS.swir;
  }
  if (normalizedType.includes("ir")) {
    return DEFAULT_SENSOR_RESOLUTIONS.ir;
  }
  
  // Default to visible/EO
  return DEFAULT_SENSOR_RESOLUTIONS.visible;
}

/**
 * Map camera type string to SensorType enum
 */
export function getSensorType(cameraType: string): SensorType {
  const normalizedType = cameraType.toLowerCase();
  
  if (normalizedType.includes("mwir") || normalizedType.includes("mid")) {
    return "mwir";
  }
  if (normalizedType.includes("lwir") || normalizedType.includes("long") || normalizedType.includes("thermal")) {
    return "lwir";
  }
  if (normalizedType.includes("swir") || normalizedType.includes("short")) {
    return "swir";
  }
  
  return "visible";
}

// ============================================================================
// NIIRS LEVEL DESCRIPTIONS
// ============================================================================

/**
 * NIIRS level descriptions for reference
 * Useful for displaying what can be detected/identified at each level
 */
export const NIIRS_DESCRIPTIONS: Record<number, string> = {
  0: "Interpretability precluded by obscuration or degradation",
  1: "Detect large facilities (airfields, harbors)",
  2: "Detect large buildings, identify road patterns",
  3: "Detect individual buildings, vehicles as point targets",
  4: "Identify trucks vs cars, count rail cars",
  5: "Identify vehicle types, detect aircraft components",
  6: "Identify aircraft type, detect vehicle features",
  7: "Identify aircraft variants, read vehicle markings",
  8: "Identify equipment details, read license plates",
  9: "Identify rivets, count wire strands",
};

/**
 * Get NIIRS description for a given value
 */
export function getNiirsDescription(niirs: number): string {
  const level = Math.floor(Math.max(0, Math.min(9, niirs)));
  return NIIRS_DESCRIPTIONS[level] || "Unknown";
}

/**
 * Get a color for NIIRS value (for UI display)
 * Green = good, Yellow = moderate, Red = poor
 */
export function getNiirsColor(niirs: number): string {
  if (niirs >= 6) return "rgba(52, 211, 153, 1)";  // emerald-400 - good
  if (niirs >= 4) return "rgba(251, 191, 36, 1)";  // amber-400 - moderate
  if (niirs >= 2) return "rgba(251, 146, 60, 1)";  // orange-400 - fair
  return "rgba(248, 113, 113, 1)";                  // red-400 - poor
}