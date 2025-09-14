import { create } from "zustand";
import type { AppState } from "./types";
import {
  calculateCourseDegCardinalFromHdgDegCardinalAndWindCorrectionAngleDeg,
  calculateCrosswindComponentFromHdgDegCardinalAndWindDegCardinal,
  calculateGroundSpeedFromKtasAndWindSpeedAndHdgDegCardinal,
  calculateHeadwindOrTailwindComponentFromHdgDegCardinalAndWindDegCardinal,
  calculateHeightAboveTarget,
  calculateKtasFromKeasAndAltKft,
  calculateMachFromKtasAndAltKft,
  calculateWindCorrectionAngleFromHdgDegCardinalAndWindDegCardinal,
  calculateWindTypeFromHdgDegCardinalAndWindDegCardinal,
} from "./core/math";

export const useAppStore = create<AppState>()(() => ({
  /**
   * User's inputs
   */
  altKft: 0,
  hdgDegCardinal: 360,
  keas: 0,
  tgtElevKft: 0,
  windDegCardinal: 360,
  windKts: 0,

  /**
   * Derived values
   */
  hat: 0,
  ktas: 0,
  mach: 0,
  gs: 0,
  windType: "HW",
  headwindOrTailwindComponent: 0,
  crosswindComponent: 0,
  windCorrectionAngleDeg: 0,
  courseDegCardinal: 0,
}));

export const setAltKft = function (altKft: number) {
  useAppStore.setState({ altKft });
};

export const setHdgDegCardinal = function (hdgDegCardinal: number) {
  useAppStore.setState({ hdgDegCardinal });
};

export const setKeas = function (keas: number) {
  useAppStore.setState({ keas });
};

export const setTgtElevKft = function (tgtElevKft: number) {
  useAppStore.setState({ tgtElevKft });
};

export const setWindDegCardinal = function (windDegCardinal: number) {
  useAppStore.setState({ windDegCardinal });
};

export const setWindKts = function (windKts: number) {
  useAppStore.setState({ windKts });
};

/**
 * Calculate the aircraft's height above the target altitude
 */
useAppStore.subscribe(function (state, prevState) {
  if (
    state.altKft !== prevState.altKft ||
    state.tgtElevKft !== prevState.tgtElevKft
  ) {
    useAppStore.setState({
      hat: calculateHeightAboveTarget(state.altKft, state.tgtElevKft),
    });
  }
});

/**
 * Calculate the aircraft's true airspeed
 */
useAppStore.subscribe(function (state, prevState) {
  if (state.keas !== prevState.keas || state.altKft !== prevState.altKft) {
    useAppStore.setState({
      ktas: calculateKtasFromKeasAndAltKft(state.keas, state.altKft),
    });
  }
});

/**
 * Calculate the aircraft's mach number
 */
useAppStore.subscribe(function (state, prevState) {
  if (state.ktas !== prevState.ktas) {
    useAppStore.setState({
      mach: calculateMachFromKtasAndAltKft(state.ktas, state.altKft),
    });
  }
});

/**
 * Calculate the headwind or tailwind component
 */
useAppStore.subscribe(function (state, prevState) {
  if (
    state.hdgDegCardinal !== prevState.hdgDegCardinal ||
    state.windDegCardinal !== prevState.windDegCardinal ||
    state.windKts !== prevState.windKts
  ) {
    useAppStore.setState({
      headwindOrTailwindComponent:
        calculateHeadwindOrTailwindComponentFromHdgDegCardinalAndWindDegCardinal(
          state.hdgDegCardinal,
          state.windDegCardinal,
          state.windKts
        ),
      crosswindComponent:
        calculateCrosswindComponentFromHdgDegCardinalAndWindDegCardinal(
          state.hdgDegCardinal,
          state.windDegCardinal,
          state.windKts
        ),
      windType: calculateWindTypeFromHdgDegCardinalAndWindDegCardinal(
        state.hdgDegCardinal,
        state.windDegCardinal
      ),
    });
  }
});

/**
 * Calculate the wind correction angle
 */
useAppStore.subscribe(function (state, prevState) {
  let inputs = [
    state.hdgDegCardinal,
    state.windDegCardinal,
    state.windKts,
    state.keas,
    state.ktas,
  ];
  let prevInputs = [
    prevState.hdgDegCardinal,
    prevState.windDegCardinal,
    prevState.windKts,
    prevState.keas,
    prevState.ktas,
  ];
  if (inputs.some((input, index) => input !== prevInputs[index])) {
    const newWindCorrectionAngleDeg =
      calculateWindCorrectionAngleFromHdgDegCardinalAndWindDegCardinal(
        state.hdgDegCardinal,
        state.windDegCardinal,
        state.windKts,
        state.ktas
      );
    const newGs = calculateGroundSpeedFromKtasAndWindSpeedAndHdgDegCardinal(
      state.ktas,
      state.windDegCardinal,
      state.windKts,
      state.hdgDegCardinal
    );

    useAppStore.setState({
      gs: newGs,
      windCorrectionAngleDeg: newWindCorrectionAngleDeg,
      courseDegCardinal:
        calculateCourseDegCardinalFromHdgDegCardinalAndWindCorrectionAngleDeg(
          state.hdgDegCardinal,
          newWindCorrectionAngleDeg
        ),
    });
  }
});

setAltKft(30);
setHdgDegCardinal(360);
setKeas(150);
setTgtElevKft(3);
setWindDegCardinal(270);
setWindKts(30);

export default useAppStore;
