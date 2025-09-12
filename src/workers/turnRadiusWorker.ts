// Web Worker for calculating turn radius
// This runs in the background to avoid blocking the main thread

import { ftToNmi, nmihrToMs } from "../core/conversions";
import { degCardinalToDegMath, degToRad, normalize360, radToDeg } from "../core/math";

const GRAVITY_FTS2 = 32.2; // ft/s^2

function calculateNoWindTurnRadius(
  ktas: number,
  maxAngleOfBankDeg: number,
  rollRateDeg: number,
  currentHeading: number,
  windSpeed: number,
  windDirection: number,
  timeAfterTurnStarted: number
) {
  let timeIncrement = 0.5; // seconds
  let currentTime = 0;

  let ktasFtS2 = nmihrToMs(ktas);

  // Convert wind direction from meteorological (direction FROM) to mathematical (direction TO)
  let windDirToMathDeg = (windDirection + 180) % 360;
  let windSpeedFtS = nmihrToMs(windSpeed);

  let xWindFtS = windSpeedFtS * Math.cos(degToRad(windDirToMathDeg));
  let yWindFtS = windSpeedFtS * Math.sin(degToRad(windDirToMathDeg));

  let xWindFtSPerTimeIncrement = xWindFtS * timeIncrement;
  let yWindFtSPerTimeIncrement = yWindFtS * timeIncrement;

  type Point = {
    x: number;
    y: number;
  };

  let points: Point[] = [];

  type State = {
    x: number;
    y: number;
    hdgDeg: number;
    ktas: number;
    angleOfBank: number;
    turnRateDeg: number;
  };

  let currentState: State = {
    x: 0,
    y: 0,
    hdgDeg: currentHeading,
    ktas: ktasFtS2,
    angleOfBank: 0,
    turnRateDeg: 0,
  };

  points.push({
    x: currentState.x,
    y: currentState.y,
  });

  while (currentTime < timeAfterTurnStarted) {
    let newAngleOfBank: number;

    // if the angle of bank is less than the max angle of bank, then we will increase the angle of bank by the roll rate
    if (currentState.angleOfBank < maxAngleOfBankDeg) {
      newAngleOfBank = currentState.angleOfBank + rollRateDeg * timeIncrement;
    } else {
      newAngleOfBank = maxAngleOfBankDeg;
    }

    let turnRateDegSec: number;

    // Turn Rate =  gravity_FTS2 * tan(AOB) / True Airspeed. AOB in radians
    let aobRadians = degToRad(newAngleOfBank);
    turnRateDegSec = radToDeg((GRAVITY_FTS2 * Math.tan(aobRadians)) / ktasFtS2);

    let amountOfTurnAccomplishedDeg = turnRateDegSec * timeIncrement;

    let turnRadiusFt: number;

    if (Math.abs(newAngleOfBank) > 0) {
      turnRadiusFt =
        ktasFtS2 ** 2 / (GRAVITY_FTS2 * Math.tan(Math.abs(aobRadians)));
    } else {
      // protect against division by zero
      turnRadiusFt = 1_000_000;
    }

    // Determine turn direction based on bank angle
    // Left turn: positive bank angle, decrease heading
    // Right turn: negative bank angle, increase heading
    let turnDirection = newAngleOfBank >= 0 ? -1 : 1;
    let newHeadingDeg = normalize360(currentState.hdgDeg + turnDirection * amountOfTurnAccomplishedDeg);

    let distanceTraveledInTimeIncrementFt = ktasFtS2 * timeIncrement;

    // Calculate the angular displacement for this time increment
    let angularDisplacementRad = distanceTraveledInTimeIncrementFt / turnRadiusFt;
    
    // Calculate position change in local coordinates (forward = x, right = y)
    // For a right turn: x = R * sin(θ), y = R * (1 - cos(θ))
    // For a left turn: x = R * sin(θ), y = -R * (1 - cos(θ))
    turnDirection = newAngleOfBank >= 0 ? -1 : 1; // Left = negative, Right = positive
    let xChange1Ft = turnRadiusFt * Math.sin(angularDisplacementRad);
    let yChange1Ft = turnDirection * turnRadiusFt * (1 - Math.cos(angularDisplacementRad));

    // Then, rotate the forward and lateral reference frame to the aircraft's heading
    // xChange2Ft = X*cos(hdgRadiansMath) - Y*sin(hdgRadiansMath)
    // yChange2Ft = X*sin(hdgRadiansMath) + Y*cos(hdgRadiansMath)
    let hdgRadiansMath = degToRad(degCardinalToDegMath(newHeadingDeg));
    let xChange2Ft =
      xChange1Ft * Math.cos(hdgRadiansMath) -
      yChange1Ft * Math.sin(hdgRadiansMath);
    let yChange2Ft =
      xChange1Ft * Math.sin(hdgRadiansMath) +
      yChange1Ft * Math.cos(hdgRadiansMath);

    // Now factor in wind
    let newXPosition = currentState.x + xChange2Ft + xWindFtSPerTimeIncrement;
    let newYPosition = currentState.y + yChange2Ft + yWindFtSPerTimeIncrement;

    let newState: State = {
      x: newXPosition,
      y: newYPosition,
      hdgDeg: newHeadingDeg,
      ktas: currentState.ktas,
      angleOfBank: newAngleOfBank,
      turnRateDeg: turnRateDegSec,
    };

    points.push({
      x: newState.x,
      y: newState.y,
    });

    currentState = newState;
    currentTime += timeIncrement;
  }

  // Convert from feet to nautical miles
  points = points.map((point) => {
    return {
      x: ftToNmi(point.x),
      y: ftToNmi(point.y),
    };
  });

  return points;
}

// Listen for messages from the main thread
self.onmessage = function(e) {
  const { 
    ktas, 
    maxAngleOfBankDeg, 
    rollRateDeg, 
    currentHeading, 
    windSpeed, 
    windDirection, 
    timeAfterTurnStarted 
  } = e.data;

  try {
    const points = calculateNoWindTurnRadius(
      ktas,
      maxAngleOfBankDeg,
      rollRateDeg,
      currentHeading,
      windSpeed,
      windDirection,
      timeAfterTurnStarted
    );

    // Send the result back to the main thread
    self.postMessage({
      success: true,
      points: points
    });
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};
