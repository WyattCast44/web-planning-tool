/**
 * Unit Conversion Utilities
 * 
 * Provides conversion functions between common units of length and speed.
 * Uses centralized conversion factors for consistency.
 */

// ============================================================================
// LENGTH CONVERSION FACTORS (to/from feet as base unit)
// ============================================================================

const LENGTH_FACTORS: Record<string, number> = {
  ft: 1,
  m: 3.28084,      // 1 meter = 3.28084 feet
  nmi: 6076.115,   // 1 nautical mile = 6076.115 feet
  km: 3280.84,     // 1 kilometer = 3280.84 feet
  yd: 3,           // 1 yard = 3 feet
};

// ============================================================================
// SPEED CONVERSION FACTORS (to/from knots as base unit)
// ============================================================================

const SPEED_FACTORS: Record<string, number> = {
  nmihr: 1,           // knots (nautical miles per hour)
  mph: 1.15078,       // 1 knot = 1.15078 mph
  ms: 0.514444,       // 1 knot = 0.514444 m/s
  fpm: 101.2685,      // 1 knot = 101.2685 feet per minute
  kmh: 1.852,         // 1 knot = 1.852 km/h
};

// ============================================================================
// GENERIC CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert a length value from one unit to another
 */
export function convertLength(value: number, from: string, to: string): number {
  if (from === to) return value;
  const fromFactor = LENGTH_FACTORS[from];
  const toFactor = LENGTH_FACTORS[to];
  if (!fromFactor || !toFactor) return value;
  
  // Convert to feet, then to target unit
  const inFeet = value * fromFactor;
  return inFeet / toFactor;
}

/**
 * Convert a speed value from one unit to another
 */
export function convertSpeed(value: number, from: string, to: string): number {
  if (from === to) return value;
  const fromFactor = SPEED_FACTORS[from];
  const toFactor = SPEED_FACTORS[to];
  if (!fromFactor || !toFactor) return value;
  
  // Convert to knots, then to target unit
  const inKnots = value / fromFactor;
  return inKnots * toFactor;
}

// ============================================================================
// LENGTH CONVERSIONS - Individual functions for API compatibility
// ============================================================================

// From feet
export const ftToM = (ft: number): number => convertLength(ft, "ft", "m");
export const ftToNmi = (ft: number): number => convertLength(ft, "ft", "nmi");
export const ftToKm = (ft: number): number => convertLength(ft, "ft", "km");
export const ftToYd = (ft: number): number => convertLength(ft, "ft", "yd");

// From meters
export const mToFt = (m: number): number => convertLength(m, "m", "ft");
export const mToNmi = (m: number): number => convertLength(m, "m", "nmi");
export const mToKm = (m: number): number => convertLength(m, "m", "km");
export const mToYd = (m: number): number => convertLength(m, "m", "yd");

// From nautical miles
export const nmiToFt = (nmi: number): number => convertLength(nmi, "nmi", "ft");
export const nmiToM = (nmi: number): number => convertLength(nmi, "nmi", "m");
export const nmiToKm = (nmi: number): number => convertLength(nmi, "nmi", "km");
export const nmiToYd = (nmi: number): number => convertLength(nmi, "nmi", "yd");

// From kilometers
export const kmToFt = (km: number): number => convertLength(km, "km", "ft");
export const kmToM = (km: number): number => convertLength(km, "km", "m");
export const kmToNmi = (km: number): number => convertLength(km, "km", "nmi");
export const kmToYd = (km: number): number => convertLength(km, "km", "yd");

// From yards
export const ydToFt = (yd: number): number => convertLength(yd, "yd", "ft");
export const ydToM = (yd: number): number => convertLength(yd, "yd", "m");
export const ydToNmi = (yd: number): number => convertLength(yd, "yd", "nmi");
export const ydToKm = (yd: number): number => convertLength(yd, "yd", "km");

// ============================================================================
// SPEED CONVERSIONS - Individual functions for API compatibility
// ============================================================================

// From mph
export const mphToMs = (mph: number): number => convertSpeed(mph, "mph", "ms");
export const mphToFpm = (mph: number): number => convertSpeed(mph, "mph", "fpm");
export const mphToKmh = (mph: number): number => convertSpeed(mph, "mph", "kmh");
export const mphToNmihr = (mph: number): number => convertSpeed(mph, "mph", "nmihr");

// From m/s
export const msToMph = (ms: number): number => convertSpeed(ms, "ms", "mph");
export const msToFpm = (ms: number): number => convertSpeed(ms, "ms", "fpm");
export const msToKmh = (ms: number): number => convertSpeed(ms, "ms", "kmh");
export const msToNmihr = (ms: number): number => convertSpeed(ms, "ms", "nmihr");

// From feet per minute
export const fpmToMph = (fpm: number): number => convertSpeed(fpm, "fpm", "mph");
export const fpmToMs = (fpm: number): number => convertSpeed(fpm, "fpm", "ms");
export const fpmToKmh = (fpm: number): number => convertSpeed(fpm, "fpm", "kmh");
export const fpmToNmihr = (fpm: number): number => convertSpeed(fpm, "fpm", "nmihr");

// From km/h
export const kmhToMph = (kmh: number): number => convertSpeed(kmh, "kmh", "mph");
export const kmhToMs = (kmh: number): number => convertSpeed(kmh, "kmh", "ms");
export const kmhToFpm = (kmh: number): number => convertSpeed(kmh, "kmh", "fpm");
export const kmhToNmihr = (kmh: number): number => convertSpeed(kmh, "kmh", "nmihr");

// From nautical miles per hour (knots)
export const nmihrToMph = (nmihr: number): number => convertSpeed(nmihr, "nmihr", "mph");
export const nmihrToMs = (nmihr: number): number => convertSpeed(nmihr, "nmihr", "ms");
export const nmihrToFpm = (nmihr: number): number => convertSpeed(nmihr, "nmihr", "fpm");
export const nmihrToKmh = (nmihr: number): number => convertSpeed(nmihr, "nmihr", "kmh");
export const nmihrToFtSec = (nmihr: number): number => nmihrToFpm(nmihr) / 60;
