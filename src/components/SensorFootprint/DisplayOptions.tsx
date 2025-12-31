import type { UnitKey, DisplayFootprint } from "../../types";
import { UNITS } from "../../types";
import { convertFromFeet, formatValue } from "./geometry";
import type { NiirsResult } from "../../core/niirs";
import {
  getNiirsColor,
  getNiirsDescription,
  MIN_DEPRESSION_ANGLE_DEG,
} from "../../core/niirs";

interface DisplayOptionsProps {
  summaryUnit: UnitKey;
  setSummaryUnit: (value: UnitKey) => void;
  footprints: DisplayFootprint[];
  // NIIRS props
  niirsResult: NiirsResult | null;
}

export function DisplayOptions({
  summaryUnit,
  setSummaryUnit,
  footprints,
  niirsResult,
}: DisplayOptionsProps) {
  const fp = footprints[0];
  const summaryUnitLabel = UNITS[summaryUnit].label;

  // Determine if NIIRS is invalid due to shallow angle
  const isShallowAngle = niirsResult && !niirsResult.valid && 
    niirsResult.message?.includes("shallow");

  return (
    <div className="flex flex-col gap-2 w-full max-w-[140px]">
      {/* NIIRS Estimate Display */}
      <div>
        <div className="flex flex-col items-center mb-2">
          <span className="font-display text-xs text-gray-300">NIIRS EST</span>
          {isShallowAngle ? (
            <>
              <span className="text-2xl font-bold font-mono text-gray-500">
                N/A
              </span>
              <span className="text-[8px] text-red-400 text-center leading-tight mt-1">
                Depression &lt;{MIN_DEPRESSION_ANGLE_DEG}° - estimate unreliable
              </span>
            </>
          ) : niirsResult && niirsResult.valid ? (
            <>
              <span
                className="text-2xl font-bold font-mono"
                style={{ color: getNiirsColor(niirsResult.niirs) }}
              >
                {niirsResult.niirs.toFixed(1)}
              </span>
              <span className="text-[8px] text-gray-400 text-center leading-tight mt-1">
                {getNiirsDescription(niirsResult.niirs)}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold font-mono text-gray-500">
                ---
              </span>
              <span className="text-[8px] text-gray-500 text-center leading-tight mt-1">
                {niirsResult?.message || "Invalid geometry"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Footprint Data Summary */}
      {fp && (
        <div className="text-[10px] font-mono space-y-1 text-gray-400 border-t border-gray-600 pt-2">
          {/* Summary Unit Selector */}
          <div className="flex justify-between items-center pb-1">
            <span className="font-display text-xs text-gray-300">DATA</span>
            <select
              id="summaryUnit"
              className="bg-gray-800 text-gray-300 text-[10px] px-1 border border-gray-600 rounded"
              value={summaryUnit}
              onChange={(e) => setSummaryUnit(e.target.value as UnitKey)}
            >
              {Object.entries(UNITS).map(([key, spec]) => (
                <option key={key} value={key} className="bg-gray-800 text-gray-300">
                  {spec.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between">
            <span>NEAR W:</span>
            <span className="text-emerald-400">
              {formatValue(convertFromFeet(fp.footprint.nearWidth, summaryUnit))}{" "}
              {summaryUnitLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span>FAR W:</span>
            {fp.footprint.farEdgeAtHorizon ? (
              <span className="text-orange-400">→ HORIZON</span>
            ) : (
              <span className="text-emerald-400">
                {formatValue(convertFromFeet(fp.footprint.farWidth, summaryUnit))}{" "}
                {summaryUnitLabel}
              </span>
            )}
          </div>
          <div className="flex justify-between">
            <span>CTR W:</span>
            <span className="text-sky-400">
              {formatValue(convertFromFeet(fp.footprint.centerWidth, summaryUnit))}{" "}
              {summaryUnitLabel}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-1">
            <span>NEAR GND:</span>
            <span className="text-emerald-400">
              {formatValue(convertFromFeet(fp.footprint.nearGround, summaryUnit))}{" "}
              {summaryUnitLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span>FAR GND:</span>
            {fp.footprint.farEdgeAtHorizon ? (
              <span className="text-orange-400" title={`Far edge depression: ${fp.footprint.farEdgeDepression.toFixed(1)}°`}>
                → HORIZON
              </span>
            ) : (
              <span className="text-emerald-400">
                {formatValue(convertFromFeet(fp.footprint.farGround, summaryUnit))}{" "}
                {summaryUnitLabel}
              </span>
            )}
          </div>
          <div className="flex justify-between">
            <span>FP DEPTH:</span>
            <span className="text-amber-400">
              {formatValue(
                convertFromFeet(
                  fp.footprint.farGround - fp.footprint.nearGround,
                  summaryUnit
                )
              )}{" "}
              {summaryUnitLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}