import { ftToNmi, nmihrToFtSec } from "./conversions";
import { degToRad, mod, normalize360, radToDeg } from "./math";

export type Params = {
	/**
	 * The aircraft's true airspeed in knots
	 */
	ktas: number;

	/**
	 * The duration of the time to calculate the ground track for
	 * Only used when headingChangeDeg is not provided
	 */
	durationSeconds: number;

	/**
	 * The average roll rate in degrees per second
	 */
	rollRateDegSec: number;

	/**
	 * The aircraft's starting heading in degrees cardinal
	 */
	startingHdgDegCardinal: number;

	/**
	 * The angle of bank at the start of the turn in degrees
	 */
	startingAngleOfBankDeg: number;

	/**
	 * The maximum angle of bank in degrees
	 */
	maxAngleOfBankDeg: number;

	/**
	 * The wind direction in degrees cardinal or meteorological
	 */
	windDegCardinal: number;

	/**
	 * The wind speed in knots
	 */
	windSpeedKts: number;

	/**
	 * The gravity at aircraft altitude in ft/s^2
	 */
	gravityFtSecS2: number;

	startingPosition: {
		x: number;
		y: number;
	};

	/**
	 * Optional: Desired heading change in degrees
	 * Positive = right turn, negative = left turn
	 * When provided, algorithm calculates optimal rollout timing
	 * and ignores durationSeconds
	 */
	headingChangeDeg?: number;
};

export type PointType =
	| "start"
	| "rollingToMaxBank"
	| "sustainedMaxBank"
	| "rollingToZeroBank"
	| "sustainedZeroBank"
	| "end";

export type State = {
	/**
	 * x position in feet, east
	 */
	x: number;
	/**
	 * y position in feet, north
	 */
	y: number;
	/**
	 * The current turn rate in degrees per second
	 */
	turnRateDegSec: number;
	/**
	 * The current angle of bank in degrees
	 */
	angleOfBankDeg: number;

	/**
	 * The current heading in degrees cardinal
	 */
	hdgDegCardinal: number;

	/**
	 * The type of point
	 */
	pointType?: PointType;
};

export type Point = {
	x: number;
	y: number;
	type: PointType;
};

interface Derivatives {
	dx: number; // East velocity
	dy: number; // North velocity
	dHdgRateDegSec: number; // Heading rate
	dAngleOfBankRateDegSec: number; // Bank angle rate
}

export type TurnPhases = {
	rollInTimeSeconds: number;
	sustainedTurnTimeSeconds: number;
	rollOutTimeSeconds: number;
	totalTimeSeconds: number;
	targetBankAngleDeg: number;
	turnRateDegSec: number;
};

/**
 * Calculate the timing for each phase of a turn to achieve a specific heading change
 */
export function calculateTurnPhases(
	headingChangeDeg: number,
	ktas: number,
	rollRateDegSec: number,
	maxAngleOfBankDeg: number,
	startingAngleOfBankDeg: number,
	gravityFtSecS2: number
): TurnPhases {
	// Heading change is now always absolute (positive)
	// Turn direction is inferred from the AOB sign
	const absoluteHeadingChangeDeg = Math.abs(headingChangeDeg);
	const turnDirection = Math.sign(maxAngleOfBankDeg);
	
	// The target bank angle uses the AOB sign and magnitude
	const targetBankAngleDeg = maxAngleOfBankDeg;
	
	// Calculate turn rate at maximum bank
	const ktasFtSec = nmihrToFtSec(ktas);
	const turnRateRadSec = (gravityFtSecS2 * Math.tan(degToRad(Math.abs(maxAngleOfBankDeg)))) / ktasFtSec;
	const turnRateDegSec = radToDeg(turnRateRadSec) * turnDirection;
	
	// Calculate roll-in time - ensure we're rolling in the correct direction
	const bankAngleDifference = targetBankAngleDeg - startingAngleOfBankDeg;
	const rollInTimeSeconds = Math.abs(bankAngleDifference) / rollRateDegSec;
	
	// Calculate sustained turn time using absolute heading change
	const sustainedTurnTimeSeconds = absoluteHeadingChangeDeg / Math.abs(turnRateDegSec);
	
	// Calculate roll-out time (from max bank to level flight)
	const rollOutTimeSeconds = Math.abs(targetBankAngleDeg) / rollRateDegSec;
	
	// Total time
	const totalTimeSeconds = rollInTimeSeconds + sustainedTurnTimeSeconds + rollOutTimeSeconds;
	
	return {
		rollInTimeSeconds,
		sustainedTurnTimeSeconds,
		rollOutTimeSeconds,
		totalTimeSeconds,
		targetBankAngleDeg,
		turnRateDegSec
	};
}

/**
 * Validate that a heading change is achievable with the given aircraft parameters
 */
export function validateHeadingChange(
	headingChangeDeg: number,
	ktas: number,
	rollRateDegSec: number,
	maxAngleOfBankDeg: number,
	startingAngleOfBankDeg: number,
	gravityFtSecS2: number,
	maxDurationSeconds: number = 360 // 5 minutes default max
): { isValid: boolean; error?: string; turnPhases?: TurnPhases } {
	try {
		const turnPhases = calculateTurnPhases(
			headingChangeDeg,
			ktas,
			rollRateDegSec,
			maxAngleOfBankDeg,
			startingAngleOfBankDeg,
			gravityFtSecS2
		);

		// Check if the turn can be completed within reasonable time
		if (turnPhases.totalTimeSeconds > maxDurationSeconds) {
			return {
				isValid: false,
				error: `Turn would take ${turnPhases.totalTimeSeconds.toFixed(1)}s, exceeding maximum duration of ${maxDurationSeconds}s`
			};
		}

		// Check for minimum turn radius constraints
		const ktasFtSec = nmihrToFtSec(ktas);
		const minTurnRadiusFt = (ktasFtSec * ktasFtSec) / (gravityFtSecS2 * Math.tan(degToRad(Math.abs(maxAngleOfBankDeg))));
		const minTurnRadiusNmi = ftToNmi(minTurnRadiusFt);
		
		// Check if heading change is too small to be meaningful
		const absoluteHeadingChange = Math.abs(headingChangeDeg);
		if (absoluteHeadingChange < 0.1) {
			return {
				isValid: false,
				error: "Heading change is too small to be meaningful (minimum 0.1 degrees)"
			};
		}

		return {
			isValid: true,
			turnPhases
		};
	} catch (error) {
		return {
			isValid: false,
			error: error instanceof Error ? error.message : "Unknown validation error"
		};
	}
}

export function calculateGroundTrack(params: Params): Point[] {
	// Input validation
	if (params.rollRateDegSec === 0) {
		throw new Error("Roll rate cannot be zero");
	}
	if (params.ktas <= 0) {
		throw new Error("Airspeed must be positive");
	}
	if (Math.abs(params.maxAngleOfBankDeg) > 89) {
		throw new Error(
			"Maximum bank angle must be between -89 and 89 degrees"
		);
	}

	// Determine duration and turn phases
	let durationSeconds: number;
	let turnPhases: TurnPhases | null = null;

	if (params.headingChangeDeg !== undefined) {
		// Validate heading change is achievable
		const validation = validateHeadingChange(
			params.headingChangeDeg,
			params.ktas,
			params.rollRateDegSec,
			params.maxAngleOfBankDeg,
			params.startingAngleOfBankDeg,
			params.gravityFtSecS2
		);
		
		if (!validation.isValid) {
			throw new Error(`Invalid heading change: ${validation.error}`);
		}
		
		// Calculate turn phases for desired heading change
		turnPhases = validation.turnPhases!;
		durationSeconds = turnPhases.totalTimeSeconds;
	} else {
		// Use provided duration (backward compatibility)
		if (params.durationSeconds <= 0) {
			throw new Error("Duration must be positive");
		}
		durationSeconds = params.durationSeconds;
	}

	// Precompute constants for performance
	const timeIncrementSeconds = 1;
	const ktasFtSec = nmihrToFtSec(params.ktas);
	const distanceTraveledInTimeIncrementFt = ktasFtSec * timeIncrementSeconds;
	const timeToAchieveBankAngleDegSec =
		Math.abs(params.startingAngleOfBankDeg - params.maxAngleOfBankDeg) /
		params.rollRateDegSec;

	// Wind calculations - precomputed once
	const windToDirectionDegCardinal = mod(180 + params.windDegCardinal, 360);
	const windToDirectionDegMath = mod(windToDirectionDegCardinal - 90, 360);
	const windSpeedFtSec = nmihrToFtSec(params.windSpeedKts);
	const windXComponentFtSec =
		windSpeedFtSec * Math.cos(degToRad(windToDirectionDegMath));
	const windYComponentFtSec =
		windSpeedFtSec * Math.sin(degToRad(windToDirectionDegMath));

	// RK4 constants
	const RK4_WEIGHTS = [1, 2, 2, 1];
	const RK4_FACTOR = 1 / 6;

	// Helper function to clamp bank angle to target
	function clampBankAngle(
		currentBank: number,
		targetBank: number,
		rollRate: number,
		dt: number
	): number {
		const targetSign = Math.sign(targetBank);

		if (targetSign > 0) {
			// Right turn - clamp to maximum positive bank angle
			return Math.min(Math.max(currentBank, 0), targetBank);
		} else if (targetSign < 0) {
			// Left turn - clamp to maximum negative bank angle
			return Math.max(Math.min(currentBank, 0), targetBank);
		} else {
			// Target is zero - roll to level flight
			return (
				Math.sign(currentBank) *
				Math.min(Math.abs(currentBank), Math.abs(rollRate) * dt)
			);
		}
	}

	// this is the starting turn rate in degrees per second, needed because the starting angle of bank could be not zero
	let startingTurnRateDegSec = radToDeg(
		(params.gravityFtSecS2 *
			Math.tan(degToRad(params.startingAngleOfBankDeg))) /
			ktasFtSec
	);

	let currentState: State = {
		x: params.startingPosition.x,
		y: params.startingPosition.y,
		turnRateDegSec: startingTurnRateDegSec,
		angleOfBankDeg: params.startingAngleOfBankDeg,
		hdgDegCardinal: normalize360(params.startingHdgDegCardinal),
		pointType: "start",
	};

	// Pre-allocate points array for better performance
	const estimatedPoints =
		Math.ceil(durationSeconds / timeIncrementSeconds) + 1;
	let points: Point[] = new Array(estimatedPoints);
	let pointIndex = 0;

	function computeDerivatives(state: State, currentTime: number): Derivatives {
		let targetAngleOfBankDeg: number;
		let rollRateDegSec = Math.abs(params.rollRateDegSec);
		let dAngleOfBankRateDegSec: number;

		if (turnPhases) {
			// Use calculated turn phases for heading change mode
			const { rollInTimeSeconds, sustainedTurnTimeSeconds, rollOutTimeSeconds, targetBankAngleDeg } = turnPhases;
			
			if (currentTime < rollInTimeSeconds) {
				// Phase 1: Rolling to max bank
				targetAngleOfBankDeg = targetBankAngleDeg;
				// Roll rate direction should match the direction from current to target bank
				const bankAngleDifference = targetBankAngleDeg - state.angleOfBankDeg;
				dAngleOfBankRateDegSec = Math.sign(bankAngleDifference) * rollRateDegSec;
			} else if (currentTime < rollInTimeSeconds + sustainedTurnTimeSeconds) {
				// Phase 2: Sustained turn at max bank
				targetAngleOfBankDeg = targetBankAngleDeg;
				dAngleOfBankRateDegSec = 0;
			} else {
				// Phase 3: Rolling out to level flight
				targetAngleOfBankDeg = 0;
				// Roll rate direction should be towards zero (opposite of current bank sign)
				dAngleOfBankRateDegSec = -Math.sign(state.angleOfBankDeg) * rollRateDegSec;
			}
		} else {
			// Original behavior for duration-based mode
			targetAngleOfBankDeg = params.maxAngleOfBankDeg;
			
			if (Math.abs(state.angleOfBankDeg) < Math.abs(targetAngleOfBankDeg)) {
				// we are rolling to the target angle of bank
				dAngleOfBankRateDegSec = Math.sign(targetAngleOfBankDeg) * rollRateDegSec;
			} else {
				// we are sustained at the target angle of bank
				dAngleOfBankRateDegSec = 0;
			}
		}

		let currentAngleOfBankRad = degToRad(state.angleOfBankDeg);
		let turnRateRadSec =
			(params.gravityFtSecS2 * Math.tan(currentAngleOfBankRad)) /
			ktasFtSec;

		// heading rate is the turn rate in degrees per second
		// positive turn rate is a right turn
		// negative turn rate is a left turn
		let dHdgRateDegSec = radToDeg(turnRateRadSec);
		let hdgRad = degToRad(state.hdgDegCardinal);

		// airspeed components
		// east component = x component
		let vEast = ktasFtSec * Math.sin(hdgRad);
		// north component = y component
		let vNorth = ktasFtSec * Math.cos(hdgRad);

		// ground speed components
		let gsEast = vEast + windXComponentFtSec;
		let gsNorth = vNorth + windYComponentFtSec;

		return {
			dx: gsEast,
			dy: gsNorth,
			dHdgRateDegSec,
			dAngleOfBankRateDegSec,
		};
	}

	function determineNewPointType(currentAngleOfBankDeg: number, currentTime: number): PointType {
		const TOLERANCE = 1e-6;
		
		if (turnPhases) {
			// Use calculated turn phases for heading change mode
			const { rollInTimeSeconds, sustainedTurnTimeSeconds, rollOutTimeSeconds } = turnPhases;
			const currentBankAbs = Math.abs(currentAngleOfBankDeg);
			
			if (currentTime < rollInTimeSeconds) {
				return "rollingToMaxBank";
			} else if (currentTime < rollInTimeSeconds + sustainedTurnTimeSeconds) {
				return "sustainedMaxBank";
			} else if (currentTime < rollInTimeSeconds + sustainedTurnTimeSeconds + rollOutTimeSeconds) {
				return "rollingToZeroBank";
			} else {
				return "sustainedZeroBank";
			}
		} else {
			// Original behavior for duration-based mode
			const maxBankAbs = Math.abs(params.maxAngleOfBankDeg);
			const currentBankAbs = Math.abs(currentAngleOfBankDeg);

			if (currentBankAbs < maxBankAbs - TOLERANCE) {
				return "rollingToMaxBank";
			} else if (currentBankAbs > maxBankAbs + TOLERANCE) {
				return "rollingToZeroBank";
			} else if (Math.abs(currentBankAbs - maxBankAbs) <= TOLERANCE) {
				return "sustainedMaxBank";
			} else if (currentBankAbs <= TOLERANCE) {
				return "sustainedZeroBank";
			}

			return "end";
		}
	}

	let t = 0;

	// now we can loop through the time increments and calculate the aircraft's position as a function of time
	while (t < durationSeconds) {
		let stepDt = Math.min(timeIncrementSeconds, durationSeconds - t);

		// Numerical stability check
		if (stepDt < 1e-10) {
			console.warn("Step size too small, breaking integration");
			break;
		}

		// Apply bank angle clamping BEFORE RK4 integration for state consistency
		currentState.angleOfBankDeg = clampBankAngle(
			currentState.angleOfBankDeg,
			params.maxAngleOfBankDeg,
			params.rollRateDegSec,
			stepDt
		);

		/**
		 * RK4 numerical integration steps
		 *
		 * 1. k1 = derivative at t
		 * 2. k2 = derivative at t + stepDt/2 using k1
		 * 3. k3 = derivative at t + stepDt/2 using k2
		 * 4. k4 = derivative at t + stepDt using k3
		 *
		 * 5. take weighted average of k1, k2, k3, k4
		 * 6. store result as the new state
		 */

		// Reuse state objects for better performance
		const midState2: State = { ...currentState };
		const midState3: State = { ...currentState };
		const midState4: State = { ...currentState };

		// k1
		let k1 = computeDerivatives(currentState, t);

		// k2
		midState2.x = currentState.x + 0.5 * stepDt * k1.dx;
		midState2.y = currentState.y + 0.5 * stepDt * k1.dy;
		midState2.turnRateDegSec =
			currentState.turnRateDegSec + 0.5 * stepDt * k1.dHdgRateDegSec;
		midState2.angleOfBankDeg =
			currentState.angleOfBankDeg +
			0.5 * stepDt * k1.dAngleOfBankRateDegSec;
		midState2.hdgDegCardinal =
			currentState.hdgDegCardinal + 0.5 * stepDt * k1.dHdgRateDegSec;
		let k2 = computeDerivatives(midState2, t + 0.5 * stepDt);

		// k3
		midState3.x = currentState.x + 0.5 * stepDt * k2.dx;
		midState3.y = currentState.y + 0.5 * stepDt * k2.dy;
		midState3.turnRateDegSec =
			currentState.turnRateDegSec + 0.5 * stepDt * k2.dHdgRateDegSec;
		midState3.angleOfBankDeg =
			currentState.angleOfBankDeg +
			0.5 * stepDt * k2.dAngleOfBankRateDegSec;
		midState3.hdgDegCardinal =
			currentState.hdgDegCardinal + 0.5 * stepDt * k2.dHdgRateDegSec;
		let k3 = computeDerivatives(midState3, t + 0.5 * stepDt);

		// k4
		midState4.x = currentState.x + stepDt * k3.dx;
		midState4.y = currentState.y + stepDt * k3.dy;
		midState4.turnRateDegSec =
			currentState.turnRateDegSec + stepDt * k3.dHdgRateDegSec;
		midState4.angleOfBankDeg =
			currentState.angleOfBankDeg + stepDt * k3.dAngleOfBankRateDegSec;
		midState4.hdgDegCardinal =
			currentState.hdgDegCardinal + stepDt * k3.dHdgRateDegSec;
		let k4 = computeDerivatives(midState4, t + stepDt);

		// calculate the weighted average of k1, k2, k3, k4 using precomputed constants
		const weightedFactor = stepDt * RK4_FACTOR;
		let avgDx =
			weightedFactor *
			(RK4_WEIGHTS[0] * k1.dx +
				RK4_WEIGHTS[1] * k2.dx +
				RK4_WEIGHTS[2] * k3.dx +
				RK4_WEIGHTS[3] * k4.dx);
		let avgDy =
			weightedFactor *
			(RK4_WEIGHTS[0] * k1.dy +
				RK4_WEIGHTS[1] * k2.dy +
				RK4_WEIGHTS[2] * k3.dy +
				RK4_WEIGHTS[3] * k4.dy);
		let avgTurnRateDegSec =
			weightedFactor *
			(RK4_WEIGHTS[0] * k1.dHdgRateDegSec +
				RK4_WEIGHTS[1] * k2.dHdgRateDegSec +
				RK4_WEIGHTS[2] * k3.dHdgRateDegSec +
				RK4_WEIGHTS[3] * k4.dHdgRateDegSec);
		let avgAngleOfBankDeg =
			weightedFactor *
			(RK4_WEIGHTS[0] * k1.dAngleOfBankRateDegSec +
				RK4_WEIGHTS[1] * k2.dAngleOfBankRateDegSec +
				RK4_WEIGHTS[2] * k3.dAngleOfBankRateDegSec +
				RK4_WEIGHTS[3] * k4.dAngleOfBankRateDegSec);
		let avgHdgDegCardinal =
			weightedFactor *
			(RK4_WEIGHTS[0] * k1.dHdgRateDegSec +
				RK4_WEIGHTS[1] * k2.dHdgRateDegSec +
				RK4_WEIGHTS[2] * k3.dHdgRateDegSec +
				RK4_WEIGHTS[3] * k4.dHdgRateDegSec);

		let newState: State = {
			x: currentState.x + avgDx,
			y: currentState.y + avgDy,
			turnRateDegSec: currentState.turnRateDegSec + avgTurnRateDegSec,
			angleOfBankDeg: currentState.angleOfBankDeg + avgAngleOfBankDeg,
			hdgDegCardinal: normalize360(
				currentState.hdgDegCardinal + avgHdgDegCardinal
			),
			pointType: determineNewPointType(
				currentState.angleOfBankDeg + avgAngleOfBankDeg,
				t + stepDt
			),
		};

		currentState = newState;

		points[pointIndex++] = {
			x: newState.x,
			y: newState.y,
			type: newState.pointType || "end",
		};

		t += stepDt;
	}

	// Trim array to actual size and convert coordinates
	points.length = pointIndex;
	const result: Point[] = new Array(pointIndex);

	for (let i = 0; i < pointIndex; i++) {
		result[i] = {
			x: ftToNmi(points[i].x),
			y: ftToNmi(points[i].y),
			type: points[i].type,
		};
	}

	return result;
}
