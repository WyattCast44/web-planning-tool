import {
  EARTH_SEMIMAJOR_AXIS,
  EARTH_FLATTENING_FACTOR,
  EARTH_SECOND_ECCENTRICITY_SQUARED,
  degToRad,
  radToDeg,
  normalize360,
  wrap180,
} from "./math";

export const EARTH_GEOSTATIONARY_RADIUS = 42164137.0; // geostationary radius from Earth's center in meters

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
 * Calculates the pointing attitude from the antenna to the satellite
 *
 * @param lat_deg latitude in degrees
 * @param lon_deg longitude in degrees
 * @param satLon_deg satellite longitude in degrees
 * @param alt_m antenna height in meters
 * @param hdg_deg heading in degrees
 * @returns { elevDeg: number; azRelDeg: number; azTrueDeg: number }
 */
export function calculatePointingAttitudeFromAntennaToSatellite(
  lat_deg: number,
  lon_deg: number,
  satLon_deg: number,
  alt_m: number,
  hdg_deg: number
): {
  elevDeg: number;
  azRelDeg: number;
  azTrueDeg: number;
} {
  const lat = degToRad(lat_deg);
  const lon = degToRad(lon_deg);
  const satLon = degToRad(satLon_deg);
  const altM = alt_m;
  const hdgDeg = hdg_deg;

  const obs = transformGeodeticToECEF(lat, lon, altM);
  const sat = {
    x: EARTH_GEOSTATIONARY_RADIUS * Math.cos(satLon),
    y: EARTH_GEOSTATIONARY_RADIUS * Math.sin(satLon),
    z: 0,
  };

  const enu = transformECEFToENU(
    lat,
    lon,
    sat.x - obs.x,
    sat.y - obs.y,
    sat.z - obs.z
  );

  const azTrue = normalize360(radToDeg(Math.atan2(enu.e, enu.n))); // 0°=N, CW
  const azRel = wrap180(azTrue - hdgDeg);
  const elevation = radToDeg(Math.atan2(enu.u, Math.hypot(enu.e, enu.n)));

  return {
    elevDeg: elevation,
    azRelDeg: azRel,
    azTrueDeg: azTrue,
  };
}
