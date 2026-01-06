/**
 * Air Deconfliction calculation utilities
 */

export type SeparationStatus = "red" | "yellow" | "green";

export interface DeconflictionResult {
  ownEta: number;
  trafficEta: number;
  timeSeparation: number;
  firstToArrive: "ownship" | "traffic" | "simultaneous";
  cpaDistanceNm: number;
  cpaTimeSeconds: number;
  status: SeparationStatus;
}

export interface WorstCaseResult {
  trafficEta: number | null;
  worstCaseTrafficGs: number;
}

/**
 * Calculate deconfliction metrics between ownship and traffic
 */
export function calculateDeconfliction(
  ownDistanceNm: number,
  ownSpeedKts: number,
  trafficDistanceNm: number,
  trafficSpeedKts: number
): DeconflictionResult {
  // Calculate ETAs (time = distance / speed, convert hours to seconds)
  const ownEta = (ownDistanceNm / ownSpeedKts) * 3600;
  const trafficEta = (trafficDistanceNm / trafficSpeedKts) * 3600;
  const timeSeparation = Math.abs(ownEta - trafficEta);

  // Determine who arrives first
  let firstToArrive: "ownship" | "traffic" | "simultaneous";
  if (timeSeparation < 1) {
    firstToArrive = "simultaneous";
  } else if (ownEta < trafficEta) {
    firstToArrive = "ownship";
  } else {
    firstToArrive = "traffic";
  }

  // Calculate CPA (closest point of approach)
  const totalDistance = ownDistanceNm + trafficDistanceNm;
  const combinedSpeed = ownSpeedKts + trafficSpeedKts;
  const tCpaHours = totalDistance / combinedSpeed;
  const cpaDistanceNm = Math.abs(ownSpeedKts * tCpaHours - trafficSpeedKts * tCpaHours);
  const cpaTimeSeconds = tCpaHours * 3600;

  // Determine status based on time separation
  const timeSepMinutes = timeSeparation / 60;
  let status: SeparationStatus;
  if (firstToArrive === "simultaneous" || timeSepMinutes < 2) {
    status = "red";
  } else if (timeSepMinutes < 5) {
    status = "yellow";
  } else {
    status = "green";
  }

  return {
    ownEta,
    trafficEta,
    timeSeparation,
    firstToArrive,
    cpaDistanceNm,
    cpaTimeSeconds,
    status,
  };
}

/**
 * Calculate the worst-case traffic speed and ETA based on margin of error
 * 
 * The worst case is the traffic speed within the MOE range that results
 * in the smallest time separation from ownship - i.e., the most dangerous scenario.
 * 
 * This is found by calculating the exact speed that would make traffic arrive
 * at the same time as ownship, then clamping it to the MOE range.
 */
export function calculateWorstCaseTraffic(
  trafficDistanceNm: number,
  trafficGs: number,
  ownEta: number | null,
  moePercent: number
): WorstCaseResult {
  // No valid traffic data
  if (trafficDistanceNm <= 0 || trafficGs <= 0) {
    return { trafficEta: null, worstCaseTrafficGs: trafficGs };
  }

  // No MOE or no ownship data - use base traffic GS
  if (ownEta === null || ownEta <= 0 || moePercent === 0) {
    return {
      trafficEta: (trafficDistanceNm / trafficGs) * 3600,
      worstCaseTrafficGs: trafficGs,
    };
  }

  // Calculate the MOE range bounds
  const gsLow = trafficGs * (1 - moePercent / 100);
  const gsHigh = trafficGs * (1 + moePercent / 100);

  // Calculate the exact speed that would make traffic arrive at ownship's ETA
  // ownEta (seconds) = trafficDistanceNm / matchSpeed * 3600
  // matchSpeed = trafficDistanceNm * 3600 / ownEta
  const matchSpeed = (trafficDistanceNm * 3600) / ownEta;

  // Clamp match speed to MOE range - this gives us the worst case
  let worstCaseSpeed: number;
  if (matchSpeed >= gsLow && matchSpeed <= gsHigh) {
    // The matching speed is within MOE range - use it (worst case = simultaneous)
    worstCaseSpeed = matchSpeed;
  } else if (matchSpeed < gsLow) {
    // Match speed is below range - use low end (closest to matching)
    worstCaseSpeed = gsLow;
  } else {
    // Match speed is above range - use high end (closest to matching)
    worstCaseSpeed = gsHigh;
  }

  return {
    trafficEta: (trafficDistanceNm / worstCaseSpeed) * 3600,
    worstCaseTrafficGs: worstCaseSpeed,
  };
}

/**
 * Format seconds into a human-readable time string
 */
export function formatTime(seconds: number | null): string {
  if (seconds === null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins === 0 ? `${secs}s` : `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

