/**
 * RangeConversion Component
 * 
 * Converts between ground range, slant range, and depression angle
 * for airborne sensor planning. Uses the shared geometry module to ensure
 * consistency across all calculations.
 */

import { useState, useMemo, useCallback } from "react";
import { Panel } from "./Panel";
import { useAppStore } from "../store";
import { 
  calculateGeometry,
  calculateFromSlantRange,
  calculateFromDepression,
  convertToFeet, 
  convertFromFeet,
  formatValue,
} from "./SensorFootprint/geometry";
import type { UnitKey } from "../types";

// ============================================================================
// COMPONENT
// ============================================================================

interface RowData {
  groundRange: string;
  slantRange: string;
  depression: string;
}

export function RangeConversion() {
  const { altKft, tgtElevKft } = useAppStore();
  
  // User inputs
  const [mslOverride, setMslOverride] = useState<string>("");
  const [rangeUnit, setRangeUnit] = useState<UnitKey>("nmi");
  const [groundRangeInput, setGroundRangeInput] = useState<string>("");
  const [slantRangeInput, setSlantRangeInput] = useState<string>("");
  const [depressionInput, setDepressionInput] = useState<string>("");

  // Derived altitude values
  const altMslFt = useMemo(() => {
    const override = parseFloat(mslOverride);
    return (!isNaN(override) && override > 0) ? override * 1000 : altKft * 1000;
  }, [mslOverride, altKft]);

  const tgtElevFt = tgtElevKft * 1000;

  // Calculate row outputs using useMemo - all use shared geometry functions
  const groundRangeRow = useMemo((): RowData => {
    const inputValue = parseFloat(groundRangeInput);
    if (isNaN(inputValue) || inputValue <= 0) {
      return { groundRange: groundRangeInput, slantRange: "—", depression: "—" };
    }

    const groundRangeFt = convertToFeet(inputValue, rangeUnit);
    const geometry = calculateGeometry(altMslFt, tgtElevFt, groundRangeFt);
    
    if (!geometry.valid) {
      return { groundRange: groundRangeInput, slantRange: "—", depression: "—" };
    }

    return {
      groundRange: groundRangeInput,
      slantRange: formatValue(convertFromFeet(geometry.slantRange, rangeUnit)),
      depression: formatValue(geometry.depression, 1),
    };
  }, [groundRangeInput, rangeUnit, altMslFt, tgtElevFt]);

  const slantRangeRow = useMemo((): RowData => {
    const inputValue = parseFloat(slantRangeInput);
    if (isNaN(inputValue) || inputValue <= 0) {
      return { groundRange: "—", slantRange: slantRangeInput, depression: "—" };
    }

    const slantRangeFt = convertToFeet(inputValue, rangeUnit);
    const result = calculateFromSlantRange(altMslFt, tgtElevFt, slantRangeFt);
    
    if (!result.valid) {
      return { groundRange: "—", slantRange: slantRangeInput, depression: "—" };
    }

    return {
      groundRange: formatValue(convertFromFeet(result.groundRangeFt, rangeUnit)),
      slantRange: slantRangeInput,
      depression: formatValue(result.depressionDeg, 1),
    };
  }, [slantRangeInput, rangeUnit, altMslFt, tgtElevFt]);

  const depressionRow = useMemo((): RowData => {
    const inputValue = parseFloat(depressionInput);
    if (isNaN(inputValue) || inputValue <= 0 || inputValue > 90) {
      return { groundRange: "—", slantRange: "—", depression: depressionInput };
    }

    const result = calculateFromDepression(altMslFt, tgtElevFt, inputValue);
    
    if (!result.valid) {
      return { groundRange: "—", slantRange: "—", depression: depressionInput };
    }

    return {
      groundRange: formatValue(convertFromFeet(result.groundRangeFt, rangeUnit)),
      slantRange: formatValue(convertFromFeet(result.slantRangeFt, rangeUnit)),
      depression: depressionInput,
    };
  }, [depressionInput, rangeUnit, altMslFt, tgtElevFt]);

  // Input handlers with validation
  const handleNumericInput = useCallback(
    (setter: (value: string) => void) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow empty, or valid positive numbers (including decimals in progress like "5.")
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setter(value);
      }
    },
    []
  );

  const handleMslBlur = useCallback(() => {
    if (mslOverride === "" || parseFloat(mslOverride) === 0) {
      setMslOverride("");
    } else {
      const value = parseFloat(mslOverride);
      if (!isNaN(value) && value > 0) {
        setMslOverride(value.toFixed(1));
      }
    }
  }, [mslOverride]);

  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-b border-gray-600">
        Range Conversion
      </header>

      <div className="grid grid-cols-5 text-center border-gray-600 overflow-hidden w-full">
        {/* Column Headers */}
        <label htmlFor="mslOverride" className="border-r border-t border-b border-gray-600 py-1.5 font-display text-xs text-gray-400">
          MSL (kft)
        </label>
        <label htmlFor="groundRangeInput" className="border-r border-t border-b border-gray-600 py-1.5 font-display text-xs text-gray-400">
          GND RNG
        </label>
        <label htmlFor="slantRangeInput" className="border-r border-t border-b border-gray-600 py-1.5 font-display text-xs text-gray-400">
          SLNT RNG
        </label>
        <label htmlFor="depressionInput" className="border-r border-t border-b border-gray-600 py-1.5 font-display text-xs text-gray-400">
          DEPR (°)
        </label>
        <label htmlFor="rangeConversionUnit" className="border-t border-b border-gray-600 py-1.5 font-display text-xs text-gray-400">
          UNIT
        </label>

        {/* Row 1: Ground Range Input */}
        <input
          id="mslOverride"
          type="text"
          inputMode="decimal"
          placeholder={altKft.toFixed(1)}
          value={mslOverride}
          onChange={handleNumericInput(setMslOverride)}
          onBlur={handleMslBlur}
          aria-label="MSL altitude override in thousands of feet"
          className="border-r border-b border-gray-600 px-2 py-1 bg-gray-800/50 text-gray-400 text-center"
        />
        <input
          id="groundRangeInput"
          type="text"
          inputMode="decimal"
          value={groundRangeInput}
          onChange={handleNumericInput(setGroundRangeInput)}
          aria-label="Ground range input"
          className="border-r border-b border-gray-600 px-2 py-1 text-center"
        />
        <input
          type="text"
          disabled
          value={groundRangeRow.slantRange}
          className="border-r border-b border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          type="text"
          disabled
          value={groundRangeRow.depression}
          className="border-r border-b border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <select
          id="rangeConversionUnit"
          value={rangeUnit}
          onChange={(e) => setRangeUnit(e.target.value as UnitKey)}
          aria-label="Range unit selection"
            className="border-b border-gray-600 px-1 py-1 bg-gray-800 text-gray-300 text-center"
        >
          <option value="nmi">NM</option>
          <option value="km">KM</option>
          <option value="m">M</option>
          <option value="ft">FT</option>
        </select>

        {/* Row 2: Slant Range Input */}
        <div className="border-r border-b border-gray-600 px-2 py-1 bg-gray-800/50" />
        <input
          type="text"
          disabled
          value={slantRangeRow.groundRange}
          className="border-r border-b border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          id="slantRangeInput"
          type="text"
          inputMode="decimal"
          value={slantRangeInput}
          onChange={handleNumericInput(setSlantRangeInput)}
          aria-label="Slant range input"
          className="border-r border-b border-gray-600 px-2 py-1 text-center"
        />
        <input
          type="text"
          disabled
          value={slantRangeRow.depression}
          className="border-r border-b border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <div className="border-b border-gray-600 px-2 py-1 bg-gray-800/50" />

        {/* Row 3: Depression Input */}
        <div className="border-r border-gray-600 px-2 py-1 bg-gray-800/50" />
        <input
          type="text"
          disabled
          value={depressionRow.groundRange}
          className="border-r border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          type="text"
          disabled
          value={depressionRow.slantRange}
          className="border-r border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          id="depressionInput"
          type="text"
          inputMode="decimal"
          value={depressionInput}
          onChange={handleNumericInput(setDepressionInput)}
          aria-label="Depression angle input"
          className="border-r border-gray-600 px-2 py-1 text-center"
        />
        <div className="border-gray-600 px-2 py-1 bg-gray-800/50" />
      </div>

      {/* Context info */}
      <div className="px-3 py-2 text-[10px] text-gray-500 font-mono flex justify-between border-t border-gray-600">
        <span>TGT ELEV: {tgtElevKft.toFixed(1)} kft</span>
        <span>HAT: {((altMslFt - tgtElevFt) / 1000).toFixed(1)} kft</span>
      </div>
    </Panel>
  );
}