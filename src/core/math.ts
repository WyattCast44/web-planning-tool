import * as z from "zod";

export const EARTH_SEMIMAJOR_AXIS = 6378137.0; // semi-major axis of the Earth in meters
export const EARTH_FLATTENING_FACTOR = 1 / 298.257223563; // flattening factor
export const EARTH_SECOND_ECCENTRICITY_SQUARED =
  EARTH_FLATTENING_FACTOR * (2 - EARTH_FLATTENING_FACTOR); // second eccentricity squared
export const EARTH_GEOSTATIONARY_RADIUS = 42164137.0; // geostationary radius from Earth's center in meters

export function round(n: number, decimals: number): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

export function roundWithPadding(n: number, decimals: number): string {
  /**
   * if the number is an integer, add them with 0
   */
  let rounded = round(n, decimals).toString();
  let numberDecimals = rounded.split(".")[1]?.length || 0;

  if (rounded.includes(".")) {
    if (numberDecimals < decimals) {
      return rounded + "0".repeat(decimals - numberDecimals);
    } else {
      return rounded;
    }
  }

  return rounded + "." + "0".repeat(decimals);
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

export function normalize360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function wrap180(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/**
 * Transforms the geodetic coordinates to ECEF coordinates
 *
 * ECEF = Earth-Centered, Earth-Fixed
 *
 * @param lat latitude in radians
 * @param lon longitude in radians
 * @param h_m height in meters
 * @returns { x: number; y: number; z: number }
 */
export function transformGeodeticToECEF(
  lat: number,
  lon: number,
  h_m: number
): { x: number; y: number; z: number } {
  const s = Math.sin(lat);
  const c = Math.cos(lat);
  const N =
    EARTH_SEMIMAJOR_AXIS /
    Math.sqrt(1 - EARTH_SECOND_ECCENTRICITY_SQUARED * s * s);

  return {
    x: (N + h_m) * c * Math.cos(lon),
    y: (N + h_m) * c * Math.sin(lon),
    z: (N * (1 - EARTH_SECOND_ECCENTRICITY_SQUARED) + h_m) * s,
  };
}

/**
 * Transforms the ECEF coordinates to ENU coordinates
 *
 * ECEF = Earth-Centered, Earth-Fixed
 * ENU = East-North-Up
 *
 * @param lat latitude in radians
 * @param lon longitude in radians
 * @param dx x-coordinate in meters
 * @param dy y-coordinate in meters
 * @param dz z-coordinate in meters
 * @returns { e: number; n: number; u: number }
 */
export function transformECEFToENU(
  lat: number,
  lon: number,
  dx: number,
  dy: number,
  dz: number
): { e: number; n: number; u: number } {
  const sL = Math.sin(lon);
  const cL = Math.cos(lon);
  const sB = Math.sin(lat);
  const cB = Math.cos(lat);

  const t = [
    [-sL, cL, 0],
    [-sB * cL, -sB * sL, cB],
    [cB * cL, cB * sL, sB],
  ];

  return {
    e: t[0][0] * dx + t[0][1] * dy + t[0][2] * dz,
    n: t[1][0] * dx + t[1][1] * dy + t[1][2] * dz,
    u: t[2][0] * dx + t[2][1] * dy + t[2][2] * dz,
  };
}

/**
 * Calculates the elevation from the antenna to the satellite
 *
 * Positive elevation means the satellite is above the horizon
 * Negative elevation means the satellite is below the horizon
 *
 * @param lat_deg latitude in degrees
 * @param lon_deg longitude in degrees
 * @param satLon_deg satellite longitude in degrees
 * @param alt_m antenna height in meters
 *
 * @returns elevation in degrees
 */
export function calculateElevationFromAntennaToSatellite(
  lat_deg: number,
  lon_deg: number,
  satLon_deg: number,
  alt_m: number
): number {
  const lat = degToRad(lat_deg);
  const lon = degToRad(lon_deg);
  const satLon = degToRad(satLon_deg);

  // Observer position (with actual altitude)
  const obs = transformGeodeticToECEF(lat, lon, alt_m);

  // Satellite position (at geostationary altitude)
  const sat = {
    x: EARTH_GEOSTATIONARY_RADIUS * Math.cos(satLon),
    y: EARTH_GEOSTATIONARY_RADIUS * Math.sin(satLon),
    z: 0,
  };

  const dx = sat.x - obs.x;
  const dy = sat.y - obs.y;
  const dz = sat.z - obs.z;
  const enu = transformECEFToENU(lat, lon, dx, dy, dz);
  return radToDeg(Math.atan2(enu.u, Math.hypot(enu.e, enu.n)));
}

/**
 * Calculates the aircraft's height above the target altitude
 *
 * Can be negative if the aircraft is below the target altitude
 *
 * @param altKft The aircraft's altitude in thousands of feet
 * @param tgtElevKft The target altitude in thousands of feet
 *
 * @returns The aircraft's height above the target altitude in thousands of feet
 */
export function calculateHeightAboveTarget(
  altKft: number,
  tgtElevKft: number
): number {
  let schema = z.object({
    altKft: z.number().min(0).max(10000).catch(0),
    tgtElevKft: z.number().min(0).max(10000).catch(0),
  });

  let result = schema.parse({ altKft, tgtElevKft });

  return round(result.altKft - result.tgtElevKft, 1);
}

/**
 * Calculates the aircraft's true airspeed from the equivalent airspeed and altitude
 *
 * @param keas The aircraft's equivalent airspeed in knots
 * @param altKft The aircraft's altitude in thousands of feet
 *
 * @returns The aircraft's true airspeed in knots
 */
export function calculateKtasFromKeasAndAltKft(
  keas: number,
  altKft: number
): number {
  let schema = z.object({
    keas: z.number().min(0).max(2000).catch(0),
    altKft: z.number().min(0).max(10000).catch(0),
  });

  let result = schema.parse({ keas, altKft });

  let denominator =
    1.22 +
    -3.39 * 10 ** -5 * (result.altKft * 1000) +
    2.8 * 10 ** -10 * (result.altKft * 1000) ** 2;

  return round(result.keas * Math.sqrt(1.225 / denominator), 2);
}

/**
 * Calculates the headwind or tailwind component from the aircraft's heading and the wind's direction and speed
 *
 * @param hdgDegCardinal The aircraft's heading in degrees
 * @param windDegCardinal The wind's direction in degrees
 * @param windSpeed The wind's speed in knots
 *
 * @returns The headwind or tailwind component in knots
 */
export function calculateHeadwindOrTailwindComponentFromHdgDegCardinalAndWindDegCardinal(
  hdgDegCardinal: number,
  windDegCardinal: number,
  windSpeed: number
): number {
  let schema = z.object({
    hdgDegCardinal: z.number().min(1).max(360).catch(1),
    windDegCardinal: z.number().min(1).max(360).catch(1),
    windSpeed: z.number().min(0).max(1000).catch(0),
  });

  let result = schema.parse({ hdgDegCardinal, windDegCardinal, windSpeed });

  let deltaHdgDegCardinal = Math.abs(
    result.hdgDegCardinal - result.windDegCardinal
  );
  let deltaHdgDegCardinalRadians = degToRad(deltaHdgDegCardinal);

  let headwindOrTailwindComponent = Math.abs(
    Math.cos(deltaHdgDegCardinalRadians) * result.windSpeed
  );

  let componentSchema = z.object({
    value: z.number().min(0).max(1000).catch(0),
  });

  return componentSchema.parse({ value: round(headwindOrTailwindComponent, 2) })
    .value;
}

/**
 * Calculates the crosswind component from the aircraft's heading and the wind's direction and speed
 *
 * @param hdgDegCardinal The aircraft's heading in degrees
 * @param windDegCardinal The wind's direction in degrees
 * @param windSpeed The wind's speed in knots
 *
 * @returns The crosswind component in knots
 */
export function calculateCrosswindComponentFromHdgDegCardinalAndWindDegCardinal(
  hdgDegCardinal: number,
  windDegCardinal: number,
  windSpeed: number
): number {
  let schema = z.object({
    hdgDegCardinal: z.number().min(1).max(360).catch(1),
    windDegCardinal: z.number().min(1).max(360).catch(1),
    windSpeed: z.number().min(0).max(1000).catch(0),
  });

  let result = schema.parse({ hdgDegCardinal, windDegCardinal, windSpeed });

  let deltaHdgDegCardinal = Math.abs(
    result.hdgDegCardinal - result.windDegCardinal
  );
  let deltaHdgDegCardinalRadians = degToRad(deltaHdgDegCardinal);

  let crosswindComponent = Math.abs(
    Math.sin(deltaHdgDegCardinalRadians) * result.windSpeed
  );

  let componentSchema = z.object({
    value: z.number().min(0).max(1000).catch(0),
  });

  return componentSchema.parse({ value: round(crosswindComponent, 2) }).value;
}

/**
 * Determines the wind type from the aircraft's heading and the wind's direction.
 *
 * @param hdgDegCardinal The aircraft's heading in degrees
 * @param windDegCardinal The wind's direction in degrees
 *
 * @returns The wind type (HW = headwind, TW = tailwind)
 */
export function calculateWindTypeFromHdgDegCardinalAndWindDegCardinal(
  hdgDegCardinal: number,
  windDegCardinal: number
): "HW" | "TW" {
  let schema = z.object({
    hdgDegCardinal: z.number().min(1).max(360).catch(1),
    windDegCardinal: z.number().min(1).max(360).catch(1),
  });

  let result = schema.parse({ hdgDegCardinal, windDegCardinal });

  let deltaHdgDegCardinal = Math.abs(
    result.hdgDegCardinal - result.windDegCardinal
  );

  /**
   * If the delta between the aircraft's heading and the wind's direction is 90 degrees, then its a direct crosswind
   * but we will just return HW for now, because its not a headwind or tailwind but the component will be 0
   * so this is really just a label placeholder
   */
  if (deltaHdgDegCardinal === 90) {
    return "HW";
  }

  if (deltaHdgDegCardinal === 180) {
    return "TW";
  }

  let deltaHdgDegCardinalMod = mod(
    result.hdgDegCardinal - result.windDegCardinal + 180,
    360
  );

  if (Math.abs(deltaHdgDegCardinalMod - 180) < 90) {
    return "HW";
  }

  return "TW";
}

/**
 * Calculates the mach number from the aircraft's true airspeed and altitude
 *
 * @param ktas The aircraft's true airspeed in knots
 * @param altKft The aircraft's altitude in thousands of feet
 *
 * @returns The mach number
 */
export function calculateMachFromKtasAndAltKft(
  ktas: number,
  altKft: number
): number {
  let schema = z.object({
    ktas: z.number().min(0).max(1000).catch(0),
    altKft: z.number().min(0).max(10000).catch(0),
  });

  let result = schema.parse({ ktas, altKft });

  return round(result.ktas / ((-1.2188 * result.altKft + 341.59) * 1.944), 2);
}

/**
 * Calculates the wind correction angle from the aircraft's heading, the wind's direction, the wind's speed, and the aircraft's true airspeed
 *
 * @param hdgDegCardinal The aircraft's heading in degrees
 * @param windDegCardinal The wind's direction in degrees
 * @param windSpeed The wind's speed in knots
 * @param ktas The aircraft's true airspeed in knots
 *
 * @returns The wind correction angle in degrees
 */
export function calculateWindCorrectionAngleFromHdgDegCardinalAndWindDegCardinal(
  hdgDegCardinal: number,
  windDegCardinal: number,
  windSpeed: number,
  ktas: number
): number {
  let schema = z.object({
    hdgDegCardinal: z.number().min(1).max(360).catch(1),
    windDegCardinal: z.number().min(1).max(360).catch(1),
    windSpeed: z.number().min(0).max(1000).catch(0),
    ktas: z.number().min(0).max(1000).catch(0),
  });

  let result = schema.parse({
    hdgDegCardinal,
    windDegCardinal,
    windSpeed,
    ktas,
  });

  let windRadians = degToRad(result.windDegCardinal);
  let hdgRadians = degToRad(result.hdgDegCardinal);

  let windCorrectionAngle = Math.asin(
    (Math.sin(windRadians - hdgRadians) * result.windSpeed) /
      (result.ktas === 0 ? 0.001 : result.ktas)
  );

  return round(radToDeg(windCorrectionAngle), 2);
}

/**
 * Calculates the course from the aircraft's heading and the wind correction angle
 *
 * @param hdgDegCardinal The aircraft's heading in degrees
 * @param windCorrectionAngleDeg The wind correction angle in degrees
 *
 * @returns The course in degrees
 */
export function calculateCourseDegCardinalFromHdgDegCardinalAndWindCorrectionAngleDeg(
  hdgDegCardinal: number,
  windCorrectionAngleDeg: number
): number {
  let schema = z.object({
    hdgDegCardinal: z.number().min(1).max(360).catch(1),
    windCorrectionAngleDeg: z.number().min(-360).max(360).catch(0),
  });

  let result = schema.parse({ hdgDegCardinal, windCorrectionAngleDeg });

  return round(
    mod(result.hdgDegCardinal - result.windCorrectionAngleDeg, 360),
    2
  );
}

/**
 * Calculates the ground speed from the aircraft's true airspeed, the wind's speed and direction, and the aircraft's heading
 *
 * @param ktas The aircraft's true airspeed in knots
 * @param windSpeed The wind's speed in knots
 *
 * @returns The ground speed in knots
 */

export function calculateGroundSpeedFromKtasAndWindSpeedAndHdgDegCardinal(
  ktas: number,
  windDegCardinal: number,
  windSpeed: number,
  hdgDegCardinal: number
): number {
  let schema = z.object({
    ktas: z.number().min(0).max(1000).catch(0),
    windDegCardinal: z.number().min(1).max(360).catch(1),
    windSpeed: z.number().min(0).max(1000).catch(0),
    hdgDegCardinal: z.number().min(1).max(360).catch(1),
  });

  let result = schema.parse({
    ktas,
    windDegCardinal,
    windSpeed,
    hdgDegCardinal,
  });

  let windDegCardinalTo = mod(result.windDegCardinal + 180, 360);
  let tasN = result.ktas * Math.cos(degToRad(result.hdgDegCardinal));
  let tasE = result.ktas * Math.sin(degToRad(result.hdgDegCardinal));
  let wsN = result.windSpeed * Math.cos(degToRad(windDegCardinalTo));
  let wsE = result.windSpeed * Math.sin(degToRad(windDegCardinalTo));
  let gsN = tasN + wsN;
  let gsE = tasE + wsE;
  let gs = Math.sqrt(gsN ** 2 + gsE ** 2);

  let gsSchema = z.object({
    value: z.number().min(0).max(1000).catch(0),
  });

  return gsSchema.parse({ value: round(gs, 2) }).value;
}
