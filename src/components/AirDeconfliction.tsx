import { useState, useMemo } from "react";
import { useAppStore } from "../store";
import { Panel } from "./Panel";
import { calculateKtasFromKeasAndAltKft, calculateGroundSpeedFromKtasAndWindSpeedAndHdgDegCardinal, calculateMachFromKtasAndAltKft } from "../core/math";
import { calculateDeconfliction, calculateWorstCaseTraffic, formatTime } from "../core/deconfliction";

const STATUS_COLORS = {
  red: { text: "text-red-400", bg: "bg-red-500/10" },
  yellow: { text: "text-amber-400", bg: "bg-amber-500/10" },
  green: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
} as const;

export function AirDeconfliction() {
  // Ownship inputs
  const [ownDistanceInput, setOwnDistanceInput] = useState("");
  const [ownDistanceUnit, setOwnDistanceUnit] = useState<"nmi" | "km">("nmi");
  const [keasOverride, setKeasOverride] = useState("");

  // Traffic inputs
  const [trafficDistanceInput, setTrafficDistanceInput] = useState("");
  const [trafficDistanceUnit, setTrafficDistanceUnit] = useState<"nmi" | "km">("nmi");
  const [trafficGsInput, setTrafficGsInput] = useState("");
  const [moeInput, setMoeInput] = useState("");

  // From store
  const { gs, keas, altKft, hdgDegCardinal, windDegCardinal, windKts } = useAppStore();

  // Effective ownship KTAS and ground speed (with optional KEAS override)
  const { effectiveKtas, effectiveGs } = useMemo(() => {
    const keasValue = parseFloat(keasOverride);
    if (!isNaN(keasValue) && keasValue > 0) {
      const newKtas = calculateKtasFromKeasAndAltKft(keasValue, altKft);
      const newGs = calculateGroundSpeedFromKtasAndWindSpeedAndHdgDegCardinal(newKtas, windDegCardinal, windKts, hdgDegCardinal);
      return { effectiveKtas: newKtas, effectiveGs: newGs };
    }
    // Get base KTAS from store's KEAS
    const baseKtas = calculateKtasFromKeasAndAltKft(keas, altKft);
    return { effectiveKtas: baseKtas, effectiveGs: gs };
  }, [keasOverride, altKft, gs, keas, hdgDegCardinal, windDegCardinal, windKts]);

  // Calculate Mach number for the effective KTAS
  const effectiveMach = useMemo(() => {
    return calculateMachFromKtasAndAltKft(effectiveKtas, altKft);
  }, [effectiveKtas, altKft]);

  // Parse and convert distances to NM
  const ownDistanceNm = useMemo(() => {
    const val = parseFloat(ownDistanceInput);
    if (isNaN(val) || val <= 0) return 0;
    return ownDistanceUnit === "km" ? val / 1.852 : val;
  }, [ownDistanceInput, ownDistanceUnit]);

  const trafficDistanceNm = useMemo(() => {
    const val = parseFloat(trafficDistanceInput);
    if (isNaN(val) || val <= 0) return 0;
    return trafficDistanceUnit === "km" ? val / 1.852 : val;
  }, [trafficDistanceInput, trafficDistanceUnit]);

  const trafficGs = useMemo(() => {
    const val = parseFloat(trafficGsInput);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [trafficGsInput]);

  const moePercent = useMemo(() => {
    const val = parseFloat(moeInput);
    if (isNaN(val) || val < 0) return 0;
    return Math.min(val, 25); // Cap at 25%
  }, [moeInput]);

  // Calculate ETAs independently (time = distance / speed, hours to seconds)
  const ownEta = useMemo(() => {
    if (ownDistanceNm <= 0 || effectiveGs <= 0) return null;
    return (ownDistanceNm / effectiveGs) * 3600;
  }, [ownDistanceNm, effectiveGs]);

  // Traffic ETA uses the worst-case speed (showing the ETA that causes least separation)
  const { trafficEta, worstCaseTrafficGs } = useMemo(() => {
    return calculateWorstCaseTraffic(trafficDistanceNm, trafficGs, ownEta, moePercent);
  }, [trafficDistanceNm, trafficGs, ownEta, moePercent]);

  // Calculate deconfliction result using worst-case traffic speed
  const result = useMemo(() => {
    if (ownDistanceNm <= 0 || trafficDistanceNm <= 0 || worstCaseTrafficGs <= 0 || effectiveGs <= 0) {
      return null;
    }
    return calculateDeconfliction(ownDistanceNm, effectiveGs, trafficDistanceNm, worstCaseTrafficGs);
  }, [ownDistanceNm, effectiveGs, trafficDistanceNm, worstCaseTrafficGs]);

  const statusColors = STATUS_COLORS[result?.status ?? "green"];

  const handleNumericInput = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-gray-600">
        Air Deconfliction
      </header>

      {/* Input Grid */}
      <div className="grid grid-cols-6 text-center border-gray-600 overflow-hidden w-full text-gray-400">
        {/* Column Headers */}
        <div className="label border-r border-t border-b border-gray-600 py-1.5">A/C</div>
        <label htmlFor="ownDistanceInput" className="label border-r border-t border-b border-gray-600 py-1.5">DIST TO PT</label>
        <label htmlFor="ownDistanceUnit" className="label border-r border-t border-b border-gray-600 py-1.5">UNIT</label>
        <div className="label border-r border-t border-b border-gray-600 py-1.5">GS (KTS)</div>
        <label htmlFor="keasOverride" className="label border-r border-t border-b border-gray-600 py-1.5">OVRD</label>
        <div className="label border-t border-b border-gray-600 py-1.5">ETA</div>

        {/* Ownship Row */}
        <div className="border-r border-b border-gray-600 px-2 py-1 bg-gray-800/50 font-display text-xs text-gray-400 flex items-center justify-center">
          OWNSHIP
        </div>
        <input
          id="ownDistanceInput"
          type="number"
          min="0"
          max="1000"
          step="0.1"
          value={ownDistanceInput}
          onChange={handleNumericInput(setOwnDistanceInput)}
          aria-label="Ownship distance to point"
          className="border-r border-b border-gray-600 px-2 py-1 text-center"
        />
        <select
          id="ownDistanceUnit"
          value={ownDistanceUnit}
          onChange={(e) => setOwnDistanceUnit(e.target.value as "nmi" | "km")}
          aria-label="Ownship distance unit"
          className="border-r border-b border-gray-600 px-1 py-1 bg-gray-800 text-gray-300 text-center"
        >
          <option value="nmi">NM</option>
          <option value="km">KM</option>
        </select>
        <input
          type="text"
          disabled
          value={effectiveGs.toFixed(0)}
          className="border-r border-b border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          id="keasOverride"
          type="number"
          min="0"
          max="1000"
          step="1"
          placeholder={keas.toFixed(0)}
          value={keasOverride}
          onChange={handleNumericInput(setKeasOverride)}
          aria-label="Ownship KEAS override"
          className="border-r border-b border-gray-600 px-2 py-1 text-center"
        />
        <input
          type="text"
          disabled
          value={formatTime(ownEta)}
          className="border-b border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />

        {/* Traffic Row */}
        <div className="border-r border-b border-gray-600 px-2 py-1 bg-gray-800/50 font-display text-xs text-gray-400 flex items-center justify-center">
          TRAFFIC
        </div>
        <input
          id="trafficDistanceInput"
          type="number"
          min="0"
          max="1000"
          step="0.1"
          value={trafficDistanceInput}
          onChange={handleNumericInput(setTrafficDistanceInput)}
          aria-label="Traffic distance to point"
          className="border-r border-b border-gray-600 px-2 py-1 text-center"
        />
        <select
          id="trafficDistanceUnit"
          value={trafficDistanceUnit}
          onChange={(e) => setTrafficDistanceUnit(e.target.value as "nmi" | "km")}
          aria-label="Traffic distance unit"
          className="border-r border-b border-gray-600 px-1 py-1 bg-gray-800 text-gray-300 text-center"
        >
          <option value="nmi">NM</option>
          <option value="km">KM</option>
        </select>
        <input
          id="trafficGsInput"
          type="number"
          min="0"
          max="1000"
          step="1"
          value={trafficGsInput}
          onChange={handleNumericInput(setTrafficGsInput)}
          aria-label="Traffic ground speed"
          className="border-r border-b border-gray-600 px-2 py-1 text-center"
        />
        <input
          id="moeInput"
          type="number"
          min="0"
          max="25"
          step="1"
          placeholder="MOE %"
          value={moeInput}
          onChange={handleNumericInput(setMoeInput)}
          aria-label="Traffic speed margin of error percentage"
          className="border-r border-b border-gray-600 px-2 py-1 text-center"
        />
        <input
          type="text"
          disabled
          value={formatTime(trafficEta)}
          className="border-b border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
      </div>

      {/* Results Row */}
      <div className="grid grid-cols-5 text-center border-gray-600 overflow-hidden w-full my-3 border-b">
        {/* Results Header */}
        <div className="label border-r border-t border-b border-gray-600 py-1.5">TIME SEP</div>
        <div className="label border-r border-t border-b border-gray-600 py-1.5">TGT KGS</div>
        <div className="label border-r border-t border-b border-gray-600 py-1.5">CPA DIST</div>
        <div className="label border-r border-t border-b border-gray-600 py-1.5">CPA TIME</div>
        <div className="label border-t border-b border-gray-600 py-1.5">FIRST TO PT</div>

        {/* Results Data */}
        <div className={`border-r border-gray-600 px-2 py-1 ${statusColors.bg}`}>
          <span className={`font-mono ${statusColors.text} font-bold`}>
            {formatTime(result?.timeSeparation ?? null)}
          </span>
        </div>
        <input
          type="text"
          disabled
          value={result ? `${worstCaseTrafficGs.toFixed(0)}` : "—"}
          className="border-r border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          type="text"
          disabled
          value={result ? `${result.cpaDistanceNm.toFixed(2)} NM` : "—"}
          className="border-r border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          type="text"
          disabled
          value={result ? formatTime(result.cpaTimeSeconds) : "—"}
          className="border-r border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
        <input
          type="text"
          disabled
          value={result?.firstToArrive.toUpperCase() ?? "—"}
          className="border-gray-600 px-2 py-1 bg-gray-900/30 font-mono text-gray-300 text-center"
        />
      </div>

      {/* Context info */}
      <div className="px-3 py-2 text-[10px] text-gray-500 font-mono flex justify-between border-t border-gray-600">
        <span>ALT: {altKft.toFixed(1)} kft</span>
        <span>MACH: {effectiveMach.toFixed(2)}</span>
        <span>HDG: {hdgDegCardinal.toFixed(0)}°</span>
        <span>WIND: {windDegCardinal.toFixed(0)}°/{windKts.toFixed(0)} kts</span>
      </div>
    </Panel>
  );
}
