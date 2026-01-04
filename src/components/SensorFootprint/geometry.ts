import { degToRad, radToDeg } from "../../core/math";
import type { GeometryResult, FootprintResult, UnitKey, Point2D } from "../../types";
import { UNITS } from "../../types";

const EARTH_RADIUS_FT = 20902231; // feet (mean radius)

/**
 * Convert from feet to specified unit
 */
export function convertFromFeet(valueFt: number, toUnit: UnitKey): number {
  return valueFt * UNITS[toUnit].fromFeet;
}

/**
 * Convert to feet from specified unit
 */
export function convertToFeet(value: number, fromUnit: UnitKey): number {
  return value * UNITS[fromUnit].toFeet;
}

/**
 * Format a value for display
 */
export function formatValue(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toExponential(1);
  }
  return value.toFixed(decimals);
}

/**
 * Calculate slant range and depression angle given:
 * - Aircraft altitude MSL (feet)
 * - Target elevation MSL (feet)
 * - Ground range (feet) - curved earth surface distance
 *
 * Uses spherical earth model for simplicity (accurate enough for sensor planning)
 */
// ============================================================================
// CORE GEOMETRY - FORWARD CALCULATION
// ============================================================================

/**
 * Calculate slant range, depression angle, and related geometry from ground range.
 * 
 * This is the PRIMARY geometry function. All other functions must produce
 * results consistent with this one.
 * 
 * Uses spherical earth model with law of cosines.
 * 
 * @param altMslFt - Aircraft altitude MSL in feet
 * @param tgtElevFt - Target elevation in feet
 * @param groundRangeFt - Ground range to target in feet
 * @returns Geometry result with slant range, depression, etc.
 */
export function calculateGeometry(
  altMslFt: number,
  tgtElevFt: number,
  groundRangeFt: number
): GeometryResult {
  const heightAboveTarget = altMslFt - tgtElevFt;

  // Validate inputs
  if (heightAboveTarget <= 0) {
    return {
      slantRange: 0,
      depression: 0,
      heightAboveTarget: 0,
      centralAngle: 0,
      valid: false,
      error: "Aircraft must be above target",
    };
  }

  if (groundRangeFt < 0) {
    return {
      slantRange: 0,
      depression: 0,
      heightAboveTarget,
      centralAngle: 0,
      valid: false,
      error: "Ground range must be non-negative",
    };
  }

  // Handle zero ground range (directly overhead)
  if (groundRangeFt === 0) {
    return {
      slantRange: heightAboveTarget,
      depression: 90,
      heightAboveTarget,
      centralAngle: 0,
      valid: true,
    };
  }

  const R = EARTH_RADIUS_FT;
  const rAircraft = R + altMslFt;
  const rTarget = R + tgtElevFt;

  // Central angle from ground range (arc length / radius)
  const centralAngle = groundRangeFt / R;

  // Law of cosines for slant range
  // slantRange² = rAircraft² + rTarget² - 2·rAircraft·rTarget·cos(centralAngle)
  const slantRangeSq =
    rAircraft * rAircraft +
    rTarget * rTarget -
    2 * rAircraft * rTarget * Math.cos(centralAngle);
  
  const slantRange = Math.sqrt(Math.max(0, slantRangeSq));

  // Depression angle calculation
  // Use the sine rule to find the angle at the aircraft
  // sin(angleAtAircraft) / rTarget = sin(centralAngle) / slantRange
  const sinAngleAtAircraft = (rTarget * Math.sin(centralAngle)) / slantRange;
  const angleAtAircraft = Math.asin(Math.max(-1, Math.min(1, sinAngleAtAircraft)));
  
  // Depression is 90° minus the angle from vertical
  // The angle from nadir to target = angleAtAircraft
  // Depression from horizontal = 90° - angleAtAircraft (in a flat earth sense)
  // But we need to account for earth curvature
  
  // More direct approach: depression = atan2(vertical_drop, horizontal_distance)
  // where we account for earth curvature in the vertical drop
  // Vertical drop (accounting for curvature): h + (rTarget - rTarget*cos(centralAngle))
  // Horizontal distance: rTarget * sin(centralAngle)
  
  const verticalDrop = heightAboveTarget + rTarget * (1 - Math.cos(centralAngle));
  const horizontalDist = rTarget * Math.sin(centralAngle);
  
  const depressionRad = Math.atan2(verticalDrop, horizontalDist);
  const depression = depressionRad * (180 / Math.PI);

  return {
    slantRange,
    depression: Math.max(0, Math.min(90, depression)),
    heightAboveTarget,
    centralAngle,
    valid: true,
  };
}

// ============================================================================
// INVERSE CALCULATIONS - FROM SLANT RANGE
// ============================================================================

export interface RangeConversionResult {
  groundRangeFt: number;
  slantRangeFt: number;
  depressionDeg: number;
  valid: boolean;
  error?: string;
}

/**
 * Calculate ground range and depression from slant range.
 * 
 * Uses iterative refinement to ensure consistency with calculateGeometry().
 * 
 * @param altMslFt - Aircraft altitude MSL in feet
 * @param tgtElevFt - Target elevation in feet  
 * @param slantRangeFt - Slant range to target in feet
 * @returns Ground range and depression consistent with calculateGeometry
 */
export function calculateFromSlantRange(
  altMslFt: number,
  tgtElevFt: number,
  slantRangeFt: number
): RangeConversionResult {
  const heightAboveTarget = altMslFt - tgtElevFt;

  // Validate inputs
  if (heightAboveTarget <= 0) {
    return {
      groundRangeFt: 0,
      slantRangeFt: 0,
      depressionDeg: 0,
      valid: false,
      error: "Aircraft must be above target",
    };
  }

  if (slantRangeFt <= 0) {
    return {
      groundRangeFt: 0,
      slantRangeFt: 0,
      depressionDeg: 0,
      valid: false,
      error: "Slant range must be positive",
    };
  }

  if (slantRangeFt < heightAboveTarget) {
    return {
      groundRangeFt: 0,
      slantRangeFt,
      depressionDeg: 0,
      valid: false,
      error: "Slant range cannot be less than height above target",
    };
  }

  const R = EARTH_RADIUS_FT;
  const rAircraft = R + altMslFt;
  const rTarget = R + tgtElevFt;

  // Solve for central angle using law of cosines
  // slantRange² = rAircraft² + rTarget² - 2·rAircraft·rTarget·cos(centralAngle)
  // cos(centralAngle) = (rAircraft² + rTarget² - slantRange²) / (2·rAircraft·rTarget)
  const cosNumerator = rAircraft * rAircraft + rTarget * rTarget - slantRangeFt * slantRangeFt;
  const cosDenominator = 2 * rAircraft * rTarget;
  const cosCentralAngle = cosNumerator / cosDenominator;

  // Check if solution is valid (cosine must be in [-1, 1])
  if (cosCentralAngle < -1 || cosCentralAngle > 1) {
    return {
      groundRangeFt: 0,
      slantRangeFt,
      depressionDeg: 0,
      valid: false,
      error: "No valid geometry for given parameters",
    };
  }

  const centralAngle = Math.acos(cosCentralAngle);
  const groundRangeFt = centralAngle * R;

  // Now use calculateGeometry to get the depression (ensures consistency)
  const geometry = calculateGeometry(altMslFt, tgtElevFt, groundRangeFt);

  return {
    groundRangeFt,
    slantRangeFt: geometry.slantRange, // Use the forward calculation's slant range
    depressionDeg: geometry.depression,
    valid: true,
  };
}

// ============================================================================
// INVERSE CALCULATIONS - FROM DEPRESSION
// ============================================================================

/**
 * Calculate ground range and slant range from depression angle.
 * 
 * Uses iterative refinement to ensure consistency with calculateGeometry().
 * 
 * @param altMslFt - Aircraft altitude MSL in feet
 * @param tgtElevFt - Target elevation in feet
 * @param depressionDeg - Depression angle in degrees
 * @returns Ground range and slant range consistent with calculateGeometry
 */
export function calculateFromDepression(
  altMslFt: number,
  tgtElevFt: number,
  depressionDeg: number
): RangeConversionResult {
  const heightAboveTarget = altMslFt - tgtElevFt;

  // Validate inputs
  if (heightAboveTarget <= 0) {
    return {
      groundRangeFt: 0,
      slantRangeFt: 0,
      depressionDeg: 0,
      valid: false,
      error: "Aircraft must be above target",
    };
  }

  if (depressionDeg <= 0) {
    return {
      groundRangeFt: 0,
      slantRangeFt: 0,
      depressionDeg: 0,
      valid: false,
      error: "Depression must be greater than 0°",
    };
  }

  if (depressionDeg >= 90) {
    // Directly overhead
    return {
      groundRangeFt: 0,
      slantRangeFt: heightAboveTarget,
      depressionDeg: 90,
      valid: true,
    };
  }

  // Initial estimate using flat earth approximation
  const depressionRad = depressionDeg * (Math.PI / 180);
  let groundRangeFt = heightAboveTarget / Math.tan(depressionRad);

  // Iterative refinement to match calculateGeometry's depression output
  // Binary search for the ground range that produces the target depression
  let low = 0;
  let high = groundRangeFt * 3; // Upper bound (will be more than enough)
  
  const targetDepression = depressionDeg;
  const tolerance = 0.0001; // Degrees
  
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const geometry = calculateGeometry(altMslFt, tgtElevFt, mid);
    
    if (!geometry.valid) {
      high = mid;
      continue;
    }
    
    const error = geometry.depression - targetDepression;
    
    if (Math.abs(error) < tolerance) {
      groundRangeFt = mid;
      break;
    }
    
    // Higher depression = lower ground range
    if (error > 0) {
      // Current depression too high, need more ground range
      low = mid;
    } else {
      // Current depression too low, need less ground range
      high = mid;
    }
    
    groundRangeFt = mid;
  }

  // Get final values from calculateGeometry to ensure perfect consistency
  const finalGeometry = calculateGeometry(altMslFt, tgtElevFt, groundRangeFt);

  return {
    groundRangeFt,
    slantRangeFt: finalGeometry.slantRange,
    depressionDeg: finalGeometry.depression,
    valid: finalGeometry.valid,
    error: finalGeometry.error,
  };
}

// ============================================================================
// FOOTPRINT CALCULATIONS
// ============================================================================

/**
 * Calculate visual horizon distance from a given altitude
 * This is the maximum distance at which an object on the ground can be seen
 */
export function calculateHorizonDistance(altitudeFt: number): number {
  // Horizon distance = sqrt(2 * R * h) where R is earth radius and h is height
  // This gives the distance along the earth's surface to the horizon
  return Math.sqrt(2 * EARTH_RADIUS_FT * altitudeFt);
}

/**
 * Calculate FOV footprint corners on the ground
 * Returns 4 corners in local ENU coordinates (feet) relative to aircraft position
 * 
 * Note: Slant ranges to near/far edges are calculated internally from height and
 * depression angles, not passed in, since each edge has a different slant range.
 */
export function calculateFootprint(
  depressionDeg: number,
  azimuthDeg: number,
  hfovDeg: number,
  vfovDeg: number,
  heightAboveTargetFt: number
): FootprintResult {
  const azRad = degToRad(azimuthDeg);
  const hfovRad = degToRad(hfovDeg / 2);

  // Maximum practical range for footprint calculation (100nm in feet)
  const maxRange = 100 * 6076.115;

  // Calculate depression angles to near and far edges of footprint
  const depNear = depressionDeg + vfovDeg / 2;
  const depFar = depressionDeg - vfovDeg / 2;

  // Calculate near range (always valid since depNear > depressionDeg > 0)
  const nearRange = Math.min(
    heightAboveTargetFt / Math.sin(degToRad(Math.max(1, depNear))),
    maxRange
  );

  // Calculate far range with smooth clamping for low depression angles
  let farRange: number;
  if (depFar <= 1) {
    // For very low depression angles (<=1°), cap at max range
    // This prevents discontinuities as depression approaches horizon
    farRange = maxRange;
  } else if (depFar <= 5) {
    // Gradual transition zone between 1° and 5°
    // Blend between calculated value and max to smooth the transition
    const calculated = heightAboveTargetFt / Math.sin(degToRad(depFar));
    const blendFactor = (depFar - 1) / 4; // 0 at 1°, 1 at 5°
    farRange = Math.min(calculated, maxRange + (calculated - maxRange) * blendFactor * 0.5);
    farRange = Math.min(farRange, maxRange);
  } else {
    // Normal case: depression well above horizon
    farRange = Math.min(
      heightAboveTargetFt / Math.sin(degToRad(depFar)),
      maxRange
    );
  }

  return calculateFootprintCorners(
    nearRange,
    farRange,
    azRad,
    hfovRad,
    depNear,
    depFar,
    heightAboveTargetFt,
    depFar <= 0 // farEdgeAtHorizon
  );
}

function calculateFootprintCorners(
  nearRange: number,
  farRange: number,
  azRad: number,
  hfovRad: number,
  depNear: number,
  depFar: number,
  h: number,
  farEdgeAtHorizon: boolean
): FootprintResult {
  // Maximum range for ground distance calculations
  const maxGroundRange = 100 * 6076.115; // 100nm in feet

  // Ground distances from aircraft (clamped to prevent extreme values)
  const nearGround = Math.min(
    h / Math.tan(degToRad(Math.max(1, depNear))),
    maxGroundRange
  );
  const farGround = Math.min(
    h / Math.tan(degToRad(Math.max(1, depFar))),
    maxGroundRange
  );

  // Widths at near and far edges (ranges already clamped in calculateFootprint)
  const nearWidth = 2 * nearRange * Math.tan(hfovRad);
  const farWidth = 2 * farRange * Math.tan(hfovRad);

  // Corner positions in local frame (x = east, y = north relative to aircraft)
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);

  // Near edge corners (closer to aircraft)
  const nearLeft: Point2D = {
    x: nearGround * sinAz - (nearWidth / 2) * cosAz,
    y: nearGround * cosAz + (nearWidth / 2) * sinAz,
  };
  const nearRight: Point2D = {
    x: nearGround * sinAz + (nearWidth / 2) * cosAz,
    y: nearGround * cosAz - (nearWidth / 2) * sinAz,
  };

  // Far edge corners
  const farLeft: Point2D = {
    x: farGround * sinAz - (farWidth / 2) * cosAz,
    y: farGround * cosAz + (farWidth / 2) * sinAz,
  };
  const farRight: Point2D = {
    x: farGround * sinAz + (farWidth / 2) * cosAz,
    y: farGround * cosAz - (farWidth / 2) * sinAz,
  };

  return {
    corners: [nearLeft, nearRight, farRight, farLeft], // clockwise from near-left
    nearWidth,
    farWidth,
    nearGround,
    farGround,
    nearRange,
    farRange,
    centerGround: (nearGround + farGround) / 2,
    centerWidth: (nearWidth + farWidth) / 2,
    farEdgeAtHorizon,
    farEdgeDepression: depFar,
  };
}

