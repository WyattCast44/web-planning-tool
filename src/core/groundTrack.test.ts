/**
 * Test Suite for Aircraft Ground Track Simulation Library
 */

import { describe, it, expect } from "vitest";
import {
	simulateTurnToTime,
	simulateTurnToHeading,
	calculateTurnRadius,
	calculateGroundSpeedMagnitude,
	calculateGroundTrackAngle,
	predictRollOutHeading,
	calculateRollOutHeadingChange,
	calculateTurnRate,
	TurnPhase,
	type SimulateToTimeOptions,
	type SimulateToHeadingOptions,
} from "./groundTrack";

// ============================================================================
// Test Utilities
// ============================================================================

function assertApproxEqual(
	actual: number,
	expected: number,
	tolerance: number,
	message?: string
): void {
	const diff = Math.abs(actual - expected);
	const errorMsg = message
		? `${message} (expected: ${expected}, actual: ${actual}, diff: ${diff.toFixed(6)})`
		: `Expected ${actual} to be within ${tolerance} of ${expected} (diff: ${diff.toFixed(6)})`;
	expect(diff <= tolerance, errorMsg).toBe(true);
}

function assertHeadingApproxEqual(
	actual: number,
	expected: number,
	tolerance: number,
	message?: string
): void {
	// Handle heading wrap-around
	let diff = Math.abs(actual - expected);
	if (diff > 180) diff = 360 - diff;
	const errorMsg = message
		? `${message} (expected: ${expected}°, actual: ${actual.toFixed(2)}°, diff: ${diff.toFixed(2)}°)`
		: `Expected heading ${actual.toFixed(2)}° to be within ${tolerance}° of ${expected}° (diff: ${diff.toFixed(2)}°)`;
	expect(diff <= tolerance, errorMsg).toBe(true);
}

// ============================================================================
// Test Groups
// ============================================================================

describe("Initial Conditions", () => {
	it("should have correct initial point values", () => {
		const options: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 90,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 0,
		};

		const track = simulateTurnToTime(options);

		expect(track.length).toBeGreaterThanOrEqual(1);
		expect(track[0].time).toBe(0);
		expect(track[0].x).toBe(0);
		expect(track[0].y).toBe(0);
		assertApproxEqual(track[0].heading, 90, 0.01);
		assertApproxEqual(track[0].bankAngle, 0, 0.01);
	});
});

describe("Straight Flight (No Turn)", () => {
	it("should fly straight north with no wind", () => {
		const options: SimulateToTimeOptions = {
			ktas: 180, // 180 knots = 3 NM/minute
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 0, // No turn
			initialHeading: 0, // North
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 60, // 1 minute
		};

		const track = simulateTurnToTime(options);
		const lastPoint = track[track.length - 1];

		assertApproxEqual(lastPoint.time, 60, 0.01);
		assertApproxEqual(lastPoint.y, 3.0, 0.1); // 3 NM north
		assertApproxEqual(lastPoint.x, 0, 0.01);
		assertApproxEqual(lastPoint.heading, 0, 0.1);
	});
});

describe("Straight Flight with Wind", () => {
	it("should drift east with westerly wind", () => {
		const options: SimulateToTimeOptions = {
			ktas: 180,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 0,
			initialHeading: 0, // North
			windDirection: 270, // From west
			windSpeed: 20,
			durationSeconds: 60,
		};

		const track = simulateTurnToTime(options);
		const lastPoint = track[track.length - 1];

		// Should travel north ~3 NM and east due to wind
		assertApproxEqual(lastPoint.y, 3.0, 0.1);
		// Wind from west pushes east
		expect(lastPoint.x).toBeGreaterThan(0.2);
		expect(lastPoint.x).toBeLessThan(0.5);
	});
});

describe("Basic Right Turn", () => {
	it("should turn right with positive bank angle", () => {
		const options: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30, // Right turn
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 60,
		};

		const track = simulateTurnToTime(options, 0.5);
		const midPoint = track[Math.floor(track.length / 2)];

		// Sum up heading changes to account for wrap-around
		let totalHeadingChange = 0;
		for (let i = 1; i < track.length; i++) {
			let delta = track[i].heading - track[i - 1].heading;
			if (delta < -180) delta += 360;
			if (delta > 180) delta -= 360;
			totalHeadingChange += delta;
		}

		expect(totalHeadingChange).toBeGreaterThan(180);
		expect(midPoint.bankAngle).toBeGreaterThan(0);
	});
});

describe("Basic Left Turn", () => {
	it("should turn left with negative bank angle", () => {
		const options: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: -30, // Left turn (negative)
			initialHeading: 180,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 60,
		};

		const track = simulateTurnToTime(options, 0.5);
		const lastPoint = track[track.length - 1];

		expect(lastPoint.bankAngle).toBeLessThan(0);
	});
});

describe("Turn to Target Heading (Right)", () => {
	it("should reach target heading with right turn", () => {
		const options: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 90,
		};

		const result = simulateTurnToHeading(options, 0.5);
		const { track, rollOutHeading, rollOutHeadingChange } = result;
		const lastPoint = track[track.length - 1];

		assertHeadingApproxEqual(lastPoint.heading, 90, 5);
		assertApproxEqual(Math.abs(lastPoint.bankAngle), 0, 15);

		// Test roll-out heading calculation
		expect(rollOutHeadingChange).toBeGreaterThan(0);
		expect(rollOutHeading).toBeLessThan(90);
		expect(rollOutHeading).toBeGreaterThan(0);

		// Verify phase information exists
		expect(track[0].phase).toBe(TurnPhase.ROLL_IN);
	});
});

describe("Turn to Target Heading (Left)", () => {
	it("should reach target heading with left turn", () => {
		const options: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: -30, // Left turn
			initialHeading: 90,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 0,
		};

		const result = simulateTurnToHeading(options, 0.5);
		const { track, rollOutHeading } = result;
		const lastPoint = track[track.length - 1];

		assertHeadingApproxEqual(lastPoint.heading, 0, 5);
		assertApproxEqual(Math.abs(lastPoint.bankAngle), 0, 15);

		// For left turn from 90° to 0°, roll-out heading should be slightly above 0°
		expect(rollOutHeading).toBeGreaterThan(0);
		expect(rollOutHeading).toBeLessThan(90);
	});
});

describe("Turn to Heading with 360° Wrap", () => {
	it("should handle crossing 360/0 boundary", () => {
		const options: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 350,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 20,
		};

		const result = simulateTurnToHeading(options, 0.5);
		const lastPoint = result.track[result.track.length - 1];

		assertHeadingApproxEqual(lastPoint.heading, 20, 10);
	});
});

describe("Roll-In Dynamics", () => {
	it("should roll to max bank at correct rate", () => {
		const options: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3, // 3 deg/s
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 20,
		};

		const track = simulateTurnToTime(options, 1.0);

		// At t=5s, should be ~15° bank (halfway through roll-in)
		const t5 = track.find((p) => Math.abs(p.time - 5) < 0.5);
		if (t5) {
			assertApproxEqual(t5.bankAngle, 15, 3);
		}

		// At t=10s, should be ~30° bank (roll-in complete)
		const t10 = track.find((p) => Math.abs(p.time - 10) < 0.5);
		if (t10) {
			assertApproxEqual(t10.bankAngle, 30, 1);
		}

		// At t=15s, should still be 30° (holding)
		const t15 = track.find((p) => Math.abs(p.time - 15) < 0.5);
		if (t15) {
			assertApproxEqual(t15.bankAngle, 30, 1);
		}
	});
});

describe("Starting with Initial Bank Angle", () => {
	it("should start with non-zero bank angle", () => {
		const options: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 15,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 10,
		};

		const track = simulateTurnToTime(options, 1.0);

		expect(track[0].bankAngle).toBe(15);

		// Should reach 30° in 5 seconds (15° to go at 3°/s)
		const t5 = track.find((p) => Math.abs(p.time - 5) < 0.5);
		if (t5) {
			assertApproxEqual(t5.bankAngle, 30, 1);
		}
	});
});

describe("Turn Rate Physics", () => {
	it("should match expected turn rate formula", () => {
		// Turn rate = 1091 * tan(bank) / ktas
		// At 30° bank, 150 ktas: 1091 * tan(30°) / 150 = ~4.2 deg/s

		const options: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 100, // Fast roll-in
			initialBankAngle: 30,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 10,
		};

		const track = simulateTurnToTime(options, 0.1);
		const lastPoint = track[track.length - 1];

		// Expected: 4.2 deg/s * 10s = 42° heading change
		assertApproxEqual(lastPoint.heading, 42, 2);
	});
});

describe("Wind Effect During Turn", () => {
	it("should drift with wind during turn", () => {
		const optionsNoWind: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 30,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 30,
		};

		const optionsWithWind: SimulateToTimeOptions = {
			...optionsNoWind,
			windDirection: 270, // From west
			windSpeed: 30,
		};

		const trackNoWind = simulateTurnToTime(optionsNoWind, 0.5);
		const trackWithWind = simulateTurnToTime(optionsWithWind, 0.5);

		const lastNoWind = trackNoWind[trackNoWind.length - 1];
		const lastWithWind = trackWithWind[trackWithWind.length - 1];

		// With westerly wind, aircraft should drift east
		expect(lastWithWind.x).toBeGreaterThan(lastNoWind.x);

		// Headings should be same (wind doesn't affect heading in coordinated flight)
		assertApproxEqual(lastWithWind.heading, lastNoWind.heading, 1);
	});
});

describe("Ground Speed Components", () => {
	it("should have correct ground speed components", () => {
		const options: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 0,
			initialHeading: 90, // East
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 1,
		};

		const track = simulateTurnToTime(options, 1.0);
		const point = track[0];

		assertApproxEqual(point.groundSpeedX, 150, 0.1);
		assertApproxEqual(point.groundSpeedY, 0, 0.1);

		// Now with tailwind from west
		const optionsWind: SimulateToTimeOptions = {
			...options,
			windDirection: 270,
			windSpeed: 20,
		};

		const trackWind = simulateTurnToTime(optionsWind, 1.0);
		const pointWind = trackWind[0];

		assertApproxEqual(pointWind.groundSpeedX, 170, 0.1);
	});
});

describe("Turn Radius Utility", () => {
	it("should calculate correct turn radius", () => {
		// At 30° bank, 150 ktas: radius ~0.57 NM
		const radius = calculateTurnRadius(30, 150);
		assertApproxEqual(radius, 0.57, 0.05);

		const radiusZeroBank = calculateTurnRadius(0, 150);
		expect(radiusZeroBank).toBe(Infinity);
	});
});

describe("Ground Speed Utility", () => {
	it("should calculate correct ground speed magnitude", () => {
		const gs = calculateGroundSpeedMagnitude(100, 100);
		assertApproxEqual(gs, 141.4, 0.5);

		const gsSimple = calculateGroundSpeedMagnitude(150, 0);
		assertApproxEqual(gsSimple, 150, 0.1);
	});
});

describe("Ground Track Utility", () => {
	it("should calculate correct ground track angle", () => {
		const track1 = calculateGroundTrackAngle(100, 0); // East
		assertApproxEqual(track1, 90, 0.1);

		const track2 = calculateGroundTrackAngle(0, 100); // North
		assertApproxEqual(track2, 0, 0.1);

		const track3 = calculateGroundTrackAngle(-100, 0); // West
		assertApproxEqual(track3, 270, 0.1);
	});
});

describe("Time Step Precision", () => {
	it("should be consistent across different time steps", () => {
		const optionsCoarse: SimulateToTimeOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			durationSeconds: 30,
		};

		const trackCoarse = simulateTurnToTime(optionsCoarse, 1.0);
		const trackFine = simulateTurnToTime(optionsCoarse, 0.1);

		const lastCoarse = trackCoarse[trackCoarse.length - 1];
		const lastFine = trackFine[trackFine.length - 1];

		// Results should be similar with RK4
		// Tolerance increased to account for bank angle tolerance effects on roll-in timing
		assertApproxEqual(lastCoarse.heading, lastFine.heading, 2);
		assertApproxEqual(lastCoarse.x, lastFine.x, 0.1);
		assertApproxEqual(lastCoarse.y, lastFine.y, 0.1);
	});
});

describe("Input Validation", () => {
	it("should throw on invalid ktas", () => {
		expect(() =>
			simulateTurnToTime({
				ktas: 0,
				avgRollRate: 3,
				initialBankAngle: 0,
				maxBankAngle: 30,
				initialHeading: 0,
				windDirection: 0,
				windSpeed: 0,
				durationSeconds: 10,
			})
		).toThrow();
	});

	it("should throw on invalid avgRollRate", () => {
		expect(() =>
			simulateTurnToTime({
				ktas: 150,
				avgRollRate: 0,
				initialBankAngle: 0,
				maxBankAngle: 30,
				initialHeading: 0,
				windDirection: 0,
				windSpeed: 0,
				durationSeconds: 10,
			})
		).toThrow();
	});

	it("should throw on invalid dt", () => {
		expect(() =>
			simulateTurnToTime(
				{
					ktas: 150,
					avgRollRate: 3,
					initialBankAngle: 0,
					maxBankAngle: 30,
					initialHeading: 0,
					windDirection: 0,
					windSpeed: 0,
					durationSeconds: 10,
				},
				0
			)
		).toThrow();
	});

	it("should throw on zero bank angle for heading mode", () => {
		expect(() =>
			simulateTurnToHeading({
				ktas: 150,
				avgRollRate: 3,
				initialBankAngle: 0,
				maxBankAngle: 0, // Invalid for heading mode
				initialHeading: 0,
				windDirection: 0,
				windSpeed: 0,
				targetHeading: 90,
			})
		).toThrow();
	});
});

describe("360° Turn Completion", () => {
	it("should return close to origin after full circle", () => {
		const options: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 10, // Fast roll
			initialBankAngle: 30,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 359,
		};

		const result = simulateTurnToHeading(options, 0.2);
		const lastPoint = result.track[result.track.length - 1];

		const distFromOrigin = Math.sqrt(
			lastPoint.x ** 2 + lastPoint.y ** 2
		);
		expect(distFromOrigin).toBeLessThan(0.2);
	});
});

describe("Phase Tracking", () => {
	it("should track all phases in correct order", () => {
		const options: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 180,
		};

		const result = simulateTurnToHeading(options, 0.5);
		const { track } = result;

		// Check that we have all three phases
		const phases = new Set(track.map((pt) => pt.phase));
		expect(phases.has(TurnPhase.ROLL_IN)).toBe(true);
		expect(phases.has(TurnPhase.HOLD)).toBe(true);
		expect(phases.has(TurnPhase.ROLL_OUT)).toBe(true);

		// Check phase ordering
		const firstHoldIdx = track.findIndex(
			(pt) => pt.phase === TurnPhase.HOLD
		);
		const firstRollOutIdx = track.findIndex(
			(pt) => pt.phase === TurnPhase.ROLL_OUT
		);
		let lastRollInIdx = -1;
		for (let i = track.length - 1; i >= 0; i--) {
			if (track[i].phase === TurnPhase.ROLL_IN) {
				lastRollInIdx = i;
				break;
			}
		}

		expect(lastRollInIdx).toBeLessThan(firstHoldIdx);
		expect(firstHoldIdx).toBeLessThan(firstRollOutIdx);
	});
});

describe("Roll-Out Heading Calculation", () => {
	it("should calculate correct roll-out heading for right turn", () => {
		const rightOptions: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 90,
		};

		const rightResult = simulateTurnToHeading(rightOptions, 0.5);

		// Roll-out heading should be less than target for right turn
		expect(rightResult.rollOutHeading).toBeLessThan(90);
		expect(rightResult.rollOutHeading).toBeGreaterThan(0);

		// Roll-out heading change should match the difference
		const rightDiff = 90 - rightResult.rollOutHeading;
		assertApproxEqual(rightDiff, rightResult.rollOutHeadingChange, 1);
	});

	it("should calculate correct roll-out heading for left turn", () => {
		const leftOptions: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: -30,
			initialHeading: 90,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 0,
		};

		const leftResult = simulateTurnToHeading(leftOptions, 0.5);

		// Roll-out heading should be greater than target for left turn
		expect(leftResult.rollOutHeading).toBeGreaterThan(0);
		expect(leftResult.rollOutHeading).toBeLessThan(90);
	});
});

describe("Expected Roll-Out Heading", () => {
	it("should calculate expected roll-out heading correctly", () => {
		const options: SimulateToHeadingOptions = {
			ktas: 150,
			avgRollRate: 3,
			initialBankAngle: 0,
			maxBankAngle: 30,
			initialHeading: 0,
			windDirection: 0,
			windSpeed: 0,
			targetHeading: 180,
		};

		const result = simulateTurnToHeading(options, 0.5);
		const { track } = result;

		// At wings level, expected roll-out heading should equal current heading
		const firstPoint = track[0];
		assertApproxEqual(
			firstPoint.expectedRollOutHeading,
			firstPoint.heading,
			0.1
		);

		// Find a point in the sustained turn phase
		const sustainedPoint = track.find((pt) => pt.phase === TurnPhase.HOLD);
		if (sustainedPoint) {
			// Expected roll-out heading should be ahead of current heading (right turn)
			const expectedAhead =
				sustainedPoint.expectedRollOutHeading >
					sustainedPoint.heading ||
				(sustainedPoint.heading > 340 &&
					sustainedPoint.expectedRollOutHeading < 50);
			expect(expectedAhead).toBe(true);
		}

		// Test the utility function directly
		const predicted = predictRollOutHeading(45, 30, 3, 150);
		expect(predicted).toBeGreaterThan(45);
		expect(predicted).toBeLessThan(90);

		// Test roll-out heading change
		const headingChange = calculateRollOutHeadingChange(30, 3, 150);
		assertApproxEqual(headingChange, 20, 2);

		// Negative bank (left turn) should give negative heading change
		const leftHeadingChange = calculateRollOutHeadingChange(-30, 3, 150);
		assertApproxEqual(leftHeadingChange, -20, 2);
	});
});

describe("Turn Rate Calculation", () => {
	it("should calculate turn rate correctly", () => {
		// At 30° bank, 150 ktas: ~4.2 deg/s
		const rate = calculateTurnRate(30, 150);
		assertApproxEqual(rate, 4.2, 0.2);

		// Negative bank should give negative turn rate
		const negRate = calculateTurnRate(-30, 150);
		assertApproxEqual(negRate, -4.2, 0.2);

		// Zero bank should give zero turn rate
		expect(calculateTurnRate(0, 150)).toBe(0);
	});
});

