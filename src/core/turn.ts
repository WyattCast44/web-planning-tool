import { nmihrToKmh, nmihrToKmS } from "./conversions";
import { degToRad } from "./math";

type WindedTurnVectorProps = {
  ktas: number;
  plannedAobDeg: number;
  acStartingAobDeg: number;
  acStartingHeadingDeg: number;
  turnRate: number;
  datalinkDelaySeconds: number;
  windDegCardinal: number;
  windSpeedKts: number;
};

const GRAVITY_ACCELERATION_KMS2 = 0.12661691; // km/s^2 @ 25,000 ft

function calculateWindedTurnVector({
  ktas,
  plannedAobDeg,
  acStartingAobDeg,
  acStartingHeadingDeg,
  turnRate,
  datalinkDelaySeconds,
  windDegCardinal,
  windSpeedKts,
}: WindedTurnVectorProps) {
  let windDegCardinalTo = 180+90-windDegCardinal;
  let windSpeedKmS = nmihrToKmS(windSpeedKts);
  let xWindKmS = windSpeedKmS * Math.cos(degToRad(windDegCardinalTo));
  let yWindKmS = windSpeedKmS * Math.sin(degToRad(windDegCardinalTo));
}

function calculatePositionBankHdgAtEndOfLinkDelay({datalinkDelaySeconds, ktas, xWindKmS, yWindKmS}: {datalinkDelaySeconds: number, ktas: number, xWindKmS: number, yWindKmS: number}) {
    let numPoints = 9;
    // timeInc = 2*DL/(n-1)
    let timeIncrementSeconds = 2 * datalinkDelaySeconds / (numPoints - 1);
    let ktasKmS = nmihrToKmS(ktas);
    let distInOneTimeIncrementKm = ktasKmS * timeIncrementSeconds;
    let xWindKmPerTimeIncrement = xWindKmS * timeIncrementSeconds;
    let yWindKmPerTimeIncrement = yWindKmS * timeIncrementSeconds;
    let xPosKm = 0;
    let yPosKm = 0;

    let previousTimeIncrements = [];
    let time = 0;
    for (let i = 0; i < numPoints/2; i++) {
        previousTimeIncrements.push(time-timeIncrementSeconds);
        time += timeIncrementSeconds;
    }

    
    // first we need to calculate the data from one time increment in the past

}
