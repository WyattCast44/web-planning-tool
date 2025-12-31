import { degToRad, radToDeg } from "../../core/math";
import type { GeometryResult, FootprintResult, UnitKey, Point2D } from "../../types";
import { UNITS } from "../../types";

const EARTH_RADIUS_FT = 20902231; // feet (mean radius)

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
export function formatValue(value: number, decimals: number = 1): string {
  if (Math.abs(value) < 0.01) return value.toExponential(1);
  if (Math.abs(value) < 10) return value.toFixed(decimals + 1);
  if (Math.abs(value) < 100) return value.toFixed(decimals);
  return Math.round(value).toLocaleString();
}

/**
 * Calculate slant range and depression angle given:
 * - Aircraft altitude MSL (feet)
 * - Target elevation MSL (feet)
 * - Ground range (feet) - curved earth surface distance
 *
 * Uses spherical earth model for simplicity (accurate enough for sensor planning)
 */
export function calculateGeometry(
  altMslFt: number,
  tgtElevFt: number,
  groundRangeFt: number
): GeometryResult {
  const h = altMslFt - tgtElevFt; // Height above target

  if (h <= 0) {
    return {
      slantRange: 0,
      depression: 0,
      heightAboveTarget: 0,
      centralAngle: 0,
      valid: false,
      error: "Aircraft below target",
    };
  }

  // For curved earth: use law of cosines
  const R = EARTH_RADIUS_FT;
  const r_aircraft = R + altMslFt;
  const r_target = R + tgtElevFt;

  // Central angle (radians) = ground range / earth radius
  const centralAngle = groundRangeFt / R;

  // Law of cosines to find slant range
  const slantRangeSq =
    r_aircraft * r_aircraft +
    r_target * r_target -
    2 * r_aircraft * r_target * Math.cos(centralAngle);

  const slantRange = Math.sqrt(slantRangeSq);

  // Calculate depression angle using flat earth approximation with curvature correction
  const flatDepression = radToDeg(Math.atan2(h, groundRangeFt));

  // Blend: use flat earth for short ranges, curved for long
  const blendFactor = Math.min(1, groundRangeFt / (50 * 6076.115)); // blend over 50nm
  const finalDepression = flatDepression * (1 - blendFactor * 0.1);

  return {
    slantRange,
    depression: Math.max(0, Math.min(90, finalDepression)),
    heightAboveTarget: h,
    centralAngle: radToDeg(centralAngle),
    valid: true,
  };
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

