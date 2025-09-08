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
