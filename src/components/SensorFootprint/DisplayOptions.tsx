import type { UnitKey, DisplayFootprint } from "./types";
import { UNITS } from "./types";
import { convertFromFeet, formatValue } from "./geometry";

interface DisplayOptionsProps {
  scale: number;
  setScale: (value: number) => void;
  displayUnit: UnitKey;
  setDisplayUnit: (value: UnitKey) => void;
  summaryUnit: UnitKey;
  setSummaryUnit: (value: UnitKey) => void;
  footprints: DisplayFootprint[];
}

export function DisplayOptions({
  scale,
  setScale,
  displayUnit,
  setDisplayUnit,
  summaryUnit,
  setSummaryUnit,
  footprints,
}: DisplayOptionsProps) {
  const fp = footprints[0];
  const summaryUnitLabel = UNITS[summaryUnit].label;

  return (
    <div className="flex flex-col gap-2 w-full max-w-[140px]">
      {/* Scale Control with Display Unit */}
      <div className="flex flex-col w-full">
        <label className="font-display" htmlFor="footprintScale">
          SCALE
        </label>
        <div className="flex border border-gray-600">
          <input
            type="number"
            id="footprintScale"
            value={scale}
            min={1}
            max={100}
            step={1}
            className="flex-1 min-w-0 border-0"
            onChange={(e) => setScale(Number(e.target.value))}
          />
          <select
            id="displayUnit"
            className="bg-gray-800 text-gray-300 px-1 border-l border-gray-600"
            value={displayUnit}
            onChange={(e) => setDisplayUnit(e.target.value as UnitKey)}
          >
            {Object.entries(UNITS).map(([key, spec]) => (
              <option key={key} value={key} className="bg-gray-800 text-gray-300">
                {spec.label}
              </option>
            ))}
          </select>
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
            <span className="text-emerald-400">
              {formatValue(convertFromFeet(fp.footprint.farWidth, summaryUnit))}{" "}
              {summaryUnitLabel}
            </span>
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
            <span className="text-emerald-400">
              {formatValue(convertFromFeet(fp.footprint.farGround, summaryUnit))}{" "}
              {summaryUnitLabel}
            </span>
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

