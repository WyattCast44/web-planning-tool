import { nmiToFt } from "../../core/conversions";

/**
 * Compute the distance (in nautical miles) where the glideslope path
 * intersects the target elevation.
 * @param alt0_kft Starting altitude in thousands of feet
 * @param fpa_deg Flight path angle in degrees (negative for descent)
 * @param tgt_kft Target elevation in thousands of feet
 * @returns Distance in nautical miles, or Infinity if no intersection
 */
export function rangeToTarget(
  alt0_kft: number,
  fpa_deg: number,
  tgt_kft: number
): number {
  const tan = Math.tan((fpa_deg * Math.PI) / 180);
  if (Math.abs(tan) < 1e-9) return Infinity; // level flight
  const D_nm = (tgt_kft - alt0_kft) * 1000 / (nmiToFt(1) * tan);
  return D_nm >= 0 ? D_nm : Infinity;
}

/**
 * Build an array of points representing the glideslope path for plotting.
 * The glideslope starts from the target elevation at distance 0 and extends backward.
 * @param tgtElev_kft Target elevation in thousands of feet (at distance 0)
 * @param fpa_deg Flight path angle in degrees (negative for descent)
 * @param xmax_nm Maximum distance from target in nautical miles
 * @param step_nm Step size in nautical miles for point generation
 * @returns Array of points with x (NM from target) and y (kft) coordinates
 */
export function buildProfilePoints(
  tgtElev_kft: number,
  fpa_deg: number,
  xmax_nm: number,
  step_nm: number = 0.25
): Array<{ x: number; y: number }> {
  // fpa_deg is negative for descent, so we use the absolute value
  // As we go further from target (x increases), altitude increases
  const tan = Math.tan((Math.abs(fpa_deg) * Math.PI) / 180);
  const pts: Array<{ x: number; y: number }> = [];
  for (let x = 0; x <= xmax_nm + 1e-6; x += step_nm) {
    // At distance x from target, altitude = target elevation + (x * tan * ft_per_nm / 1000)
    const alt_ft = tgtElev_kft * 1000 + x * nmiToFt(1) * tan;
    pts.push({ x, y: Math.max(0, alt_ft / 1000) });
  }
  return pts;
}

/**
 * Calculate the altitude change per nautical mile for a given flight path angle.
 * @param fpa_deg Flight path angle in degrees (negative for descent)
 * @returns Altitude change in feet per nautical mile
 */
export function calculateAltPerNm(fpa_deg: number): number {
  return Math.abs(Math.tan((fpa_deg * Math.PI) / 180) * nmiToFt(1));
}

