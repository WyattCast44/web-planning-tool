/**
 * Aircraft Ground Track Simulation Library
 *
 * Numerically integrates the ground track of an aircraft during a single
 * coordinated turn, including realistic bank angle transitions and constant wind.
 *
 * Coordinate System:
 * - Local flat-Earth approximation
 * - Origin: Starting position = (0, 0)
 * - X-axis: Positive East (nautical miles)
 * - Y-axis: Positive North (nautical miles)
 * - Headings: True (degrees from true north, 0° = North, clockwise, 0–360)
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Turn phase constants
 */
export const TurnPhase = {
	ROLL_IN: "roll_in",
	HOLD: "hold",
	ROLL_OUT: "roll_out",
} as const;

export type TurnPhase = (typeof TurnPhase)[keyof typeof TurnPhase];

/**
 * A single point on the aircraft's ground track
 */
export interface TrackPoint {
	/** Seconds since start (0 at first point) */
	time: number;
	/** East displacement in nautical miles */
	x: number;
	/** North displacement in nautical miles */
	y: number;
	/** Current true heading in degrees (0–360 normalized) */
	heading: number;
	/** Current bank angle in degrees (positive = right bank) */
	bankAngle: number;
	/** East ground speed component in knots */
	groundSpeedX: number;
	/** North ground speed component in knots */
	groundSpeedY: number;
	/** Current phase of the turn */
	phase: TurnPhase;
	/**
	 * Expected heading when wings level if roll-out initiated now.
	 * This is the heading the aircraft will reach after completing a roll-out
	 * from the current bank angle at the configured roll rate.
	 */
	expectedRollOutHeading: number;
}

/**
 * Array of track points sorted by increasing time
 */
export type GroundTrack = TrackPoint[];

/**
 * Result from target-heading simulation, includes roll-out initiation heading
 */
export interface SimulateToHeadingResult {
	/** Array of track points */
	track: GroundTrack;
	/** Heading at which roll-out should be initiated to capture target heading */
	rollOutHeading: number;
	/** Heading change during roll-out phase (degrees) */
	rollOutHeadingChange: number;
}

/**
 * Common turn parameters shared by both simulation modes
 */
export interface TurnParameters {
	/** True Airspeed in knots (constant) */
	ktas: number;
	/** Average roll rate magnitude in degrees/second (always positive) */
	avgRollRate: number;
	/** Starting bank angle in degrees (positive = right bank, negative = left bank) */
	initialBankAngle: number;
	/** Target maximum bank angle in degrees. Sign determines turn direction. */
	maxBankAngle: number;
	/** Starting true heading in degrees (0–360) */
	initialHeading: number;
	/** Wind from direction in degrees true (0–360) */
	windDirection: number;
	/** Constant wind speed in knots */
	windSpeed: number;
}

/**
 * Options for fixed-duration simulation mode
 */
export interface SimulateToTimeOptions extends TurnParameters {
	/** Duration to simulate in seconds */
	durationSeconds: number;
}

/**
 * Options for target-heading simulation mode
 */
export interface SimulateToHeadingOptions extends TurnParameters {
	/** Target heading in degrees true (0–360) */
	targetHeading: number;
}

// ============================================================================
// Internal State and Constants
// ============================================================================

/** Turn rate constant: 1091 = derived from g ≈ 32.17 ft/s² in aviation units */
const TURN_RATE_CONSTANT = 1091;

/** Internal simulation state */
interface SimState {
	x: number; // East position (NM)
	y: number; // North position (NM)
	heading: number; // True heading (degrees)
	bankAngle: number; // Current bank angle (degrees)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

/**
 * Normalize heading to [0, 360)
 */
function normalizeHeading(heading: number): number {
	let h = heading % 360;
	if (h < 0) h += 360;
	return h;
}

/**
 * Calculate turn rate in degrees/second based on bank angle and airspeed
 * turnRate = (1091 * tan(bankAngle)) / ktas
 * Positive = right turn, negative = left turn
 */
function calculateTurnRateInternal(
	bankAngleDeg: number,
	ktas: number
): number {
	if (ktas <= 0) return 0;
	const bankAngleRad = toRadians(bankAngleDeg);
	return (TURN_RATE_CONSTANT * Math.tan(bankAngleRad)) / ktas;
}

/**
 * Calculate ground velocity components given heading, airspeed, and wind
 * Returns [groundSpeedX (East), groundSpeedY (North)] in knots
 *
 * Note: Wind direction is "from" direction, so wind vector points opposite
 */
function calculateGroundVelocity(
	headingDeg: number,
	ktas: number,
	windDirectionDeg: number,
	windSpeed: number
): [number, number] {
	const headingRad = toRadians(headingDeg);
	const windFromRad = toRadians(windDirectionDeg);

	// Aircraft velocity in air mass
	const airVx = ktas * Math.sin(headingRad); // East component
	const airVy = ktas * Math.cos(headingRad); // North component

	// Wind velocity (wind blows FROM windDirection, so it pushes aircraft in opposite direction)
	// Wind "from" 360/0 means wind is coming FROM the north, pushing aircraft south
	const windVx = -windSpeed * Math.sin(windFromRad);
	const windVy = -windSpeed * Math.cos(windFromRad);

	// Ground velocity = air velocity + wind effect
	const groundVx = airVx + windVx;
	const groundVy = airVy + windVy;

	return [groundVx, groundVy];
}

// ============================================================================
// Bank Angle Dynamics
// ============================================================================

/**
 * Determine the current turn phase and calculate bank angle rate of change.
 *
 * @param currentBank Current bank angle (degrees)
 * @param maxBank Target maximum bank angle (degrees, sign indicates turn direction)
 * @param avgRollRate Roll rate magnitude (degrees/second, always positive)
 * @param isRollingOut Whether we're in roll-out phase (target-heading mode only)
 * @returns Bank angle rate of change (degrees/second)
 */
function calculateBankAngleRate(
	currentBank: number,
	maxBank: number,
	avgRollRate: number,
	isRollingOut: boolean
): number {
	const rollRateMag = Math.abs(avgRollRate);

	if (isRollingOut) {
		// Rolling toward zero bank
		if (Math.abs(currentBank) < 0.5) {
			return 0; // Already at zero (within tolerance)
		}
		// Roll toward zero
		return currentBank > 0 ? -rollRateMag : rollRateMag;
	}

	// Rolling in or holding
	const bankDiff = maxBank - currentBank;

	// Use a tolerance that matches the snap tolerance in clampBankAngle
	// This ensures the bank rate goes to 0 when we're close enough to maxBank
	if (Math.abs(bankDiff) <= 3.0) {
		// At max bank - hold
		return 0;
	}

	// Roll toward maxBank
	return bankDiff > 0 ? rollRateMag : -rollRateMag;
}

/**
 * Clamp bank angle during roll-in/hold to not overshoot maxBank.
 * Also snaps to maxBank when within tolerance to avoid RK4 numerical artifacts.
 */
function clampBankAngle(
	bank: number,
	maxBank: number,
	isRollingOut: boolean
): number {
	if (isRollingOut) {
		// During roll-out, clamp toward zero
		if (maxBank > 0) {
			// Right turn rolling out
			return Math.max(0, bank);
		} else {
			// Left turn rolling out
			return Math.min(0, bank);
		}
	}

	// During roll-in/hold:
	// If within snap tolerance of maxBank, snap exactly to maxBank
	// This prevents RK4 numerical artifacts from keeping us stuck below maxBank
	// Use a larger tolerance (3°) to handle various combinations of rollRate and dt
	const snapTolerance = 3.0; // degrees
	if (Math.abs(bank - maxBank) <= snapTolerance) {
		return maxBank;
	}

	// Otherwise clamp to not exceed maxBank
	if (maxBank > 0) {
		// Right turn
		return Math.min(bank, maxBank);
	} else {
		// Left turn
		return Math.max(bank, maxBank);
	}
}

// ============================================================================
// Roll-Out Timing Calculation (for target-heading mode)
// ============================================================================

/**
 * Calculate when to initiate roll-out to capture target heading smoothly.
 *
 * The aircraft needs to begin rolling back toward zero bank early enough
 * that it arrives at zero bank exactly when reaching the target heading.
 *
 * Uses numerical integration for accurate calculation since turn rate
 * is non-linear with bank angle.
 *
 * @returns Heading difference (in turn direction) at which to start roll-out
 */
function calculateRollOutHeadingThreshold(
	maxBank: number,
	avgRollRate: number,
	ktas: number
): number {
	// Time to roll from maxBank to zero
	const rollOutTime = Math.abs(maxBank) / avgRollRate;

	// Numerically integrate heading change during roll-out
	// Bank decreases linearly from |maxBank| to 0
	const numSteps = 100;
	const dt = rollOutTime / numSteps;
	let headingChange = 0;

	for (let i = 0; i < numSteps; i++) {
		// Bank angle at this step (decreasing linearly)
		const t = i * dt + dt / 2; // midpoint of interval
		const fractionComplete = t / rollOutTime;
		const currentBank = maxBank * (1 - fractionComplete);

		// Turn rate at this bank angle
		const turnRate = calculateTurnRateInternal(currentBank, ktas);

		// Accumulate heading change
		headingChange += Math.abs(turnRate) * dt;
	}

	return headingChange;
}

/**
 * Calculate the expected heading when wings level if roll-out is initiated now.
 *
 * This computes the heading change that will occur during a roll-out from
 * the current bank angle to zero bank at the given roll rate.
 *
 * @param currentHeading Current aircraft heading (degrees)
 * @param currentBank Current bank angle (degrees, positive = right)
 * @param avgRollRate Roll rate magnitude (degrees/second)
 * @param ktas True airspeed (knots)
 * @returns Expected heading when wings level (degrees, 0-360 normalized)
 */
function calculateExpectedRollOutHeading(
	currentHeading: number,
	currentBank: number,
	avgRollRate: number,
	ktas: number
): number {
	// If already wings level, expected heading is current heading
	if (Math.abs(currentBank) < 0.01) {
		return normalizeHeading(currentHeading);
	}

	// Time to roll from current bank to zero
	const rollOutTime = Math.abs(currentBank) / avgRollRate;

	// Numerically integrate heading change during roll-out
	const numSteps = Math.max(10, Math.ceil(rollOutTime * 10)); // At least 10 steps, more for longer roll-outs
	const dt = rollOutTime / numSteps;
	let headingChange = 0;

	for (let i = 0; i < numSteps; i++) {
		// Bank angle at this step (decreasing linearly toward zero)
		const t = i * dt + dt / 2; // midpoint of interval
		const fractionComplete = t / rollOutTime;
		// Bank decreases from currentBank toward 0
		const bankAtStep = currentBank * (1 - fractionComplete);

		// Turn rate at this bank angle (positive bank = positive turn rate = right turn)
		const turnRate = calculateTurnRateInternal(bankAtStep, ktas);

		// Accumulate heading change (turn rate is signed)
		headingChange += turnRate * dt;
	}

	return normalizeHeading(currentHeading + headingChange);
}

// ============================================================================
// RK4 Numerical Integration
// ============================================================================

/**
 * State derivative function for RK4 integration.
 * Returns [dx/dt, dy/dt, dHeading/dt, dBankAngle/dt]
 */
function stateDerivatives(
	state: SimState,
	params: TurnParameters,
	isRollingOut: boolean
): [number, number, number, number] {
	const { ktas, avgRollRate, maxBankAngle, windDirection, windSpeed } =
		params;

	// Ground velocity (knots)
	const [groundVx, groundVy] = calculateGroundVelocity(
		state.heading,
		ktas,
		windDirection,
		windSpeed
	);

	// Position rate (NM/second) = velocity (knots) / 3600
	const dxdt = groundVx / 3600;
	const dydt = groundVy / 3600;

	// Heading rate (degrees/second)
	const dHeadingdt = calculateTurnRateInternal(state.bankAngle, ktas);

	// Bank angle rate (degrees/second)
	const dBankdt = calculateBankAngleRate(
		state.bankAngle,
		maxBankAngle,
		avgRollRate,
		isRollingOut
	);

	return [dxdt, dydt, dHeadingdt, dBankdt];
}

/**
 * 4th-order Runge-Kutta integration step
 */
function rk4Step(
	state: SimState,
	params: TurnParameters,
	dt: number,
	isRollingOut: boolean
): SimState {
	// k1
	const [k1x, k1y, k1h, k1b] = stateDerivatives(state, params, isRollingOut);

	// k2
	const state2: SimState = {
		x: state.x + (k1x * dt) / 2,
		y: state.y + (k1y * dt) / 2,
		heading: state.heading + (k1h * dt) / 2,
		bankAngle: state.bankAngle + (k1b * dt) / 2,
	};
	const [k2x, k2y, k2h, k2b] = stateDerivatives(state2, params, isRollingOut);

	// k3
	const state3: SimState = {
		x: state.x + (k2x * dt) / 2,
		y: state.y + (k2y * dt) / 2,
		heading: state.heading + (k2h * dt) / 2,
		bankAngle: state.bankAngle + (k2b * dt) / 2,
	};
	const [k3x, k3y, k3h, k3b] = stateDerivatives(state3, params, isRollingOut);

	// k4
	const state4: SimState = {
		x: state.x + k3x * dt,
		y: state.y + k3y * dt,
		heading: state.heading + k3h * dt,
		bankAngle: state.bankAngle + k3b * dt,
	};
	const [k4x, k4y, k4h, k4b] = stateDerivatives(state4, params, isRollingOut);

	// Weighted average
	const newX = state.x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
	const newY = state.y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
	const newHeading =
		state.heading + (dt / 6) * (k1h + 2 * k2h + 2 * k3h + k4h);
	let newBank =
		state.bankAngle + (dt / 6) * (k1b + 2 * k2b + 2 * k3b + k4b);

	// Clamp bank angle to prevent overshoot
	newBank = clampBankAngle(newBank, params.maxBankAngle, isRollingOut);

	return {
		x: newX,
		y: newY,
		heading: newHeading,
		bankAngle: newBank,
	};
}

// ============================================================================
// Track Point Creation
// ============================================================================

/**
 * Create a TrackPoint from simulation state
 */
function createTrackPoint(
	time: number,
	state: SimState,
	params: TurnParameters,
	phase: TurnPhase
): TrackPoint {
	const [groundSpeedX, groundSpeedY] = calculateGroundVelocity(
		state.heading,
		params.ktas,
		params.windDirection,
		params.windSpeed
	);

	// Calculate expected heading if roll-out initiated now
	const expectedRollOutHeading = calculateExpectedRollOutHeading(
		state.heading,
		state.bankAngle,
		params.avgRollRate,
		params.ktas
	);

	return {
		time,
		x: state.x,
		y: state.y,
		heading: normalizeHeading(state.heading),
		bankAngle: state.bankAngle,
		groundSpeedX,
		groundSpeedY,
		phase,
		expectedRollOutHeading,
	};
}

/**
 * Determine the current turn phase based on bank angle and target
 */
function determineTurnPhase(
	currentBank: number,
	maxBank: number,
	isRollingOut: boolean
): TurnPhase {
	if (isRollingOut) {
		return TurnPhase.ROLL_OUT;
	}

	// Check if we've reached max bank (within tolerance)
	// Use a tolerance of 3.0° to match the snap tolerance in clampBankAngle
	// This ensures consistent phase detection with the bank angle clamping
	const bankDiff = Math.abs(Math.abs(currentBank) - Math.abs(maxBank));
	if (bankDiff <= 3.0) {
		return TurnPhase.HOLD;
	}

	return TurnPhase.ROLL_IN;
}

// ============================================================================
// Public API: Fixed-Duration Mode
// ============================================================================

/**
 * Simulate aircraft turn for a fixed duration.
 *
 * @param options Turn parameters and duration
 * @param dt Time step in seconds (default: 1.0)
 * @returns Array of track points
 */
export function simulateTurnToTime(
	options: SimulateToTimeOptions,
	dt: number = 1.0
): GroundTrack {
	const {
		ktas,
		avgRollRate,
		initialBankAngle,
		maxBankAngle,
		initialHeading,
		windDirection,
		windSpeed,
		durationSeconds,
	} = options;

	// Validate inputs
	if (ktas <= 0) throw new Error("ktas must be positive");
	if (avgRollRate <= 0) throw new Error("avgRollRate must be positive");
	if (durationSeconds < 0)
		throw new Error("durationSeconds must be non-negative");
	if (dt <= 0) throw new Error("dt must be positive");

	const params: TurnParameters = {
		ktas,
		avgRollRate,
		initialBankAngle,
		maxBankAngle,
		initialHeading: normalizeHeading(initialHeading),
		windDirection: normalizeHeading(windDirection),
		windSpeed,
	};

	const track: GroundTrack = [];

	// Initial state
	let state: SimState = {
		x: 0,
		y: 0,
		heading: params.initialHeading,
		bankAngle: initialBankAngle,
	};

	let time = 0;

	// Determine initial phase
	let phase = determineTurnPhase(state.bankAngle, maxBankAngle, false);

	// Record initial point
	track.push(createTrackPoint(time, state, params, phase));

	// Integrate forward in time
	while (time < durationSeconds) {
		// Calculate actual step (may be smaller at end)
		const actualDt = Math.min(dt, durationSeconds - time);

		// No roll-out in fixed-duration mode
		state = rk4Step(state, params, actualDt, false);
		time += actualDt;

		// Update phase
		phase = determineTurnPhase(state.bankAngle, maxBankAngle, false);

		track.push(createTrackPoint(time, state, params, phase));
	}

	return track;
}

// ============================================================================
// Public API: Target-Heading Mode
// ============================================================================

/**
 * Simulate aircraft turn until target heading is reached.
 *
 * Turn direction is forced by the sign of maxBankAngle (positive = right turn,
 * negative = left turn). There is no automatic shortest-turn fallback.
 *
 * @param options Turn parameters and target heading
 * @param dt Time step in seconds (default: 1.0)
 * @returns SimulateToHeadingResult containing track, rollOutHeading, and rollOutHeadingChange
 */
export function simulateTurnToHeading(
	options: SimulateToHeadingOptions,
	dt: number = 1.0
): SimulateToHeadingResult {
	const {
		ktas,
		avgRollRate,
		initialBankAngle,
		maxBankAngle,
		initialHeading,
		windDirection,
		windSpeed,
		targetHeading,
	} = options;

	// Validate inputs
	if (ktas <= 0) throw new Error("ktas must be positive");
	if (avgRollRate <= 0) throw new Error("avgRollRate must be positive");
	if (dt <= 0) throw new Error("dt must be positive");
	if (maxBankAngle === 0)
		throw new Error("maxBankAngle cannot be zero for heading mode");

	const params: TurnParameters = {
		ktas,
		avgRollRate,
		initialBankAngle,
		maxBankAngle,
		initialHeading: normalizeHeading(initialHeading),
		windDirection: normalizeHeading(windDirection),
		windSpeed,
	};

	const normalizedTarget = normalizeHeading(targetHeading);
	const turnDirection = maxBankAngle > 0 ? 1 : -1; // +1 = right, -1 = left

	const track: GroundTrack = [];

	// Initial state
	let state: SimState = {
		x: 0,
		y: 0,
		heading: params.initialHeading,
		bankAngle: initialBankAngle,
	};

	let time = 0;
	let isRollingOut = false;

	// Calculate required heading change (accounting for turn direction)
	let requiredHeadingChange: number;
	if (turnDirection > 0) {
		// Right turn: positive heading change
		requiredHeadingChange = normalizedTarget - params.initialHeading;
		if (requiredHeadingChange <= 0) requiredHeadingChange += 360;
	} else {
		// Left turn: negative heading change
		requiredHeadingChange = params.initialHeading - normalizedTarget;
		if (requiredHeadingChange <= 0) requiredHeadingChange += 360;
	}

	// Calculate roll-out threshold (heading change during roll-out from max bank)
	const fullRollOutHeadingChange = calculateRollOutHeadingThreshold(
		maxBankAngle,
		avgRollRate,
		ktas
	);

	// Calculate roll-in heading change (heading change while rolling to max bank)
	const rollInHeadingChange = calculateRollOutHeadingThreshold(
		maxBankAngle,
		avgRollRate,
		ktas
	);

	// For small heading changes, we may not reach max bank at all
	// Determine the effective max bank and roll-out threshold
	let effectiveMaxBank = maxBankAngle;
	let rollOutHeadingChange = fullRollOutHeadingChange;

	// If the required heading change is less than roll-in + roll-out, 
	// we need to use a reduced bank angle
	const minHeadingForFullBank = rollInHeadingChange + fullRollOutHeadingChange;
	if (requiredHeadingChange < minHeadingForFullBank) {
		// For small turns, calculate the maximum bank we can reach
		// Approximate: bank proportional to heading change ratio
		const ratio = requiredHeadingChange / minHeadingForFullBank;
		effectiveMaxBank = maxBankAngle * Math.sqrt(ratio); // Use sqrt for smoother scaling
		// Ensure minimum bank for any turn
		const minBank = Math.sign(maxBankAngle) * 5;
		if (Math.abs(effectiveMaxBank) < Math.abs(minBank)) {
			effectiveMaxBank = minBank;
		}
		// Recalculate roll-out for reduced bank
		rollOutHeadingChange = calculateRollOutHeadingThreshold(
			effectiveMaxBank,
			avgRollRate,
			ktas
		);
	}

	// Update params with effective max bank for this turn
	const effectiveParams: TurnParameters = {
		...params,
		maxBankAngle: effectiveMaxBank,
	};

	// Calculate the roll-out initiation heading
	let rollOutHeading: number;
	if (turnDirection > 0) {
		// Right turn: roll out heading is target minus the roll-out heading change
		rollOutHeading = normalizeHeading(
			normalizedTarget - rollOutHeadingChange
		);
	} else {
		// Left turn: roll out heading is target plus the roll-out heading change
		rollOutHeading = normalizeHeading(
			normalizedTarget + rollOutHeadingChange
		);
	}

	// Determine initial phase
	let phase = determineTurnPhase(state.bankAngle, effectiveMaxBank, false);

	// Record initial point
	track.push(createTrackPoint(time, state, effectiveParams, phase));

	// Maximum time limit (5 minutes should be plenty for any reasonable turn)
	const maxTimeSeconds = 300;
	// Maximum iterations as backup (at dt=0.5, 5 minutes = 600 iterations)
	const maxIterations = Math.ceil(maxTimeSeconds / dt) + 100;
	let iterations = 0;

	// Track total heading change to determine when we've reached target
	let totalHeadingChange = 0;
	let lastHeading = state.heading;

	// Stall detection - if we're not making progress, exit
	let stuckCounter = 0;
	const maxStuckIterations = 20;

	while (iterations < maxIterations && time < maxTimeSeconds) {
		iterations++;

		// Calculate remaining heading change
		const remainingHeadingChange =
			requiredHeadingChange - totalHeadingChange;

		// Check if we should start roll-out
		if (!isRollingOut && remainingHeadingChange <= rollOutHeadingChange) {
			isRollingOut = true;
		}

		// Check if we've reached or passed the target heading
		if (
			remainingHeadingChange <= 0 ||
			Math.abs(remainingHeadingChange) < 0.5
		) {
			break;
		}

		// Integrate one step
		state = rk4Step(state, effectiveParams, dt, isRollingOut);
		time += dt;

		// Update total heading change
		let deltaHeading = state.heading - lastHeading;
		// Handle wrap-around
		if (turnDirection > 0 && deltaHeading < -180) deltaHeading += 360;
		if (turnDirection < 0 && deltaHeading > 180) deltaHeading -= 360;
		const absDeltaHeading = Math.abs(deltaHeading);
		totalHeadingChange += absDeltaHeading;
		lastHeading = state.heading;

		// Stall detection: if not making progress, increment counter
		if (absDeltaHeading < 0.01) {
			stuckCounter++;
			if (stuckCounter >= maxStuckIterations) {
				// Not making progress, exit early
				break;
			}
		} else {
			stuckCounter = 0;
		}

		// Update phase
		phase = determineTurnPhase(state.bankAngle, effectiveMaxBank, isRollingOut);

		track.push(createTrackPoint(time, state, effectiveParams, phase));

		// Emergency exit if bank angle is essentially zero during roll-out
		if (isRollingOut && Math.abs(state.bankAngle) < 0.5) {
			// We've completed roll-out, exit
			break;
		}
	}

	return {
		track,
		rollOutHeading,
		rollOutHeadingChange,
	};
}

// ============================================================================
// Additional Utility Exports
// ============================================================================

/**
 * Calculate instantaneous turn radius in nautical miles
 */
export function calculateTurnRadius(
	bankAngleDeg: number,
	ktas: number
): number {
	if (Math.abs(bankAngleDeg) < 0.01 || ktas <= 0) return Infinity;
	const turnRate = calculateTurnRateInternal(bankAngleDeg, ktas);
	if (Math.abs(turnRate) < 0.0001) return Infinity;
	// Turn rate in rad/s, velocity in NM/s
	const turnRateRadPerSec = toRadians(turnRate);
	const velocityNMPerSec = ktas / 3600;
	return Math.abs(velocityNMPerSec / turnRateRadPerSec);
}

/**
 * Calculate ground speed magnitude from components
 */
export function calculateGroundSpeedMagnitude(
	groundSpeedX: number,
	groundSpeedY: number
): number {
	return Math.sqrt(
		groundSpeedX * groundSpeedX + groundSpeedY * groundSpeedY
	);
}

/**
 * Calculate ground track angle from ground speed components
 */
export function calculateGroundTrackAngle(
	groundSpeedX: number,
	groundSpeedY: number
): number {
	const trackRad = Math.atan2(groundSpeedX, groundSpeedY);
	return normalizeHeading(trackRad * (180 / Math.PI));
}

/**
 * Predict the heading when wings level if roll-out is initiated now.
 *
 * This is useful for real-time systems to show the pilot what heading
 * they will capture if they begin rolling out immediately.
 *
 * @param currentHeading Current aircraft heading (degrees true)
 * @param currentBank Current bank angle (degrees, positive = right bank)
 * @param avgRollRate Roll rate magnitude (degrees/second, always positive)
 * @param ktas True airspeed (knots)
 * @returns Expected heading when wings level (degrees, 0-360 normalized)
 *
 * @example
 * // Aircraft heading 045°, 30° right bank, 3°/s roll rate, 150 ktas
 * const finalHeading = predictRollOutHeading(45, 30, 3, 150);
 * // Returns approximately 65° (will turn ~20° more during roll-out)
 */
export function predictRollOutHeading(
	currentHeading: number,
	currentBank: number,
	avgRollRate: number,
	ktas: number
): number {
	return calculateExpectedRollOutHeading(
		currentHeading,
		currentBank,
		avgRollRate,
		ktas
	);
}

/**
 * Calculate the heading change that will occur during a roll-out from the
 * given bank angle to wings level.
 *
 * @param currentBank Current bank angle (degrees, positive = right bank)
 * @param avgRollRate Roll rate magnitude (degrees/second, always positive)
 * @param ktas True airspeed (knots)
 * @returns Heading change during roll-out (degrees, positive for right bank, negative for left)
 */
export function calculateRollOutHeadingChange(
	currentBank: number,
	avgRollRate: number,
	ktas: number
): number {
	if (Math.abs(currentBank) < 0.01) return 0;

	// Time to roll from current bank to zero
	const rollOutTime = Math.abs(currentBank) / avgRollRate;

	// Numerically integrate heading change during roll-out
	const numSteps = Math.max(10, Math.ceil(rollOutTime * 10));
	const dt = rollOutTime / numSteps;
	let headingChange = 0;

	for (let i = 0; i < numSteps; i++) {
		const t = i * dt + dt / 2;
		const fractionComplete = t / rollOutTime;
		const bankAtStep = currentBank * (1 - fractionComplete);
		const turnRate = calculateTurnRateInternal(bankAtStep, ktas);
		headingChange += turnRate * dt;
	}

	return headingChange;
}

/**
 * Calculate turn rate in degrees per second at given bank angle and airspeed.
 * Positive bank angle = positive (right) turn rate.
 *
 * @param bankAngleDeg Bank angle in degrees
 * @param ktas True airspeed in knots
 * @returns Turn rate in degrees per second
 */
export function calculateTurnRate(
	bankAngleDeg: number,
	ktas: number
): number {
	return calculateTurnRateInternal(bankAngleDeg, ktas);
}
