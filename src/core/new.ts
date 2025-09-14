import { ftToNmi, nmihrToFtSec } from "./conversions";
import { degToRad, mod, normalize360, radToDeg } from "./math";

export type Params = {
	/**
	 * The aircraft's true airspeed in knots
	 */
	ktas: number;

	/**
	 * The duration of the time to calculate the ground track for
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

export function calculateGroundTrack(params: Params): Point[] {
	// Input validation
	if (params.rollRateDegSec === 0) {
		throw new Error("Roll rate cannot be zero");
	}
	if (params.ktas <= 0) {
		throw new Error("Airspeed must be positive");
	}
	if (params.durationSeconds <= 0) {
		throw new Error("Duration must be positive");
	}
	if (Math.abs(params.maxAngleOfBankDeg) > 89) {
		throw new Error(
			"Maximum bank angle must be between -89 and 89 degrees"
		);
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
		Math.ceil(params.durationSeconds / timeIncrementSeconds) + 1;
	let points: Point[] = new Array(estimatedPoints);
	let pointIndex = 0;

	function computeDerivatives(state: State): Derivatives {
		let targetAngleOfBankDeg = params.maxAngleOfBankDeg;
		// roll rate is the absolute value of the roll rate in degrees per second
		// because the left / right bank is determined elsewhere
		let rollRateDegSec = Math.abs(params.rollRateDegSec);

		let dAngleOfBankRateDegSec;

		if (Math.abs(state.angleOfBankDeg) < Math.abs(targetAngleOfBankDeg)) {
			// we are rolling to the target angle of bank
			dAngleOfBankRateDegSec =
				Math.sign(targetAngleOfBankDeg) * rollRateDegSec;
		} else {
			// we are sustained at the target angle of bank
			dAngleOfBankRateDegSec = 0;
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

	function determineNewPointType(currentAngleOfBankDeg: number): PointType {
		const TOLERANCE = 1e-6;
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

	let t = 0;

	// now we can loop through the time increments and calculate the aircraft's position as a function of time
	while (t < params.durationSeconds) {
		let stepDt = Math.min(timeIncrementSeconds, params.durationSeconds - t);

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
		let k1 = computeDerivatives(currentState);

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
		let k2 = computeDerivatives(midState2);

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
		let k3 = computeDerivatives(midState3);

		// k4
		midState4.x = currentState.x + stepDt * k3.dx;
		midState4.y = currentState.y + stepDt * k3.dy;
		midState4.turnRateDegSec =
			currentState.turnRateDegSec + stepDt * k3.dHdgRateDegSec;
		midState4.angleOfBankDeg =
			currentState.angleOfBankDeg + stepDt * k3.dAngleOfBankRateDegSec;
		midState4.hdgDegCardinal =
			currentState.hdgDegCardinal + stepDt * k3.dHdgRateDegSec;
		let k4 = computeDerivatives(midState4);

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
				currentState.angleOfBankDeg + avgAngleOfBankDeg
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
