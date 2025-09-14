import { useState } from "react";

interface InputControlsProps {
  angleOfBank: number;
  setAngleOfBank: (value: number) => void;
  turnRate: number;
  setTurnRate: (value: number) => void;
  durationSeconds: number;
  setDurationSeconds: (value: number) => void;
}

export function InputControls({
  angleOfBank,
  setAngleOfBank,
  turnRate,
  setTurnRate,
  durationSeconds,
  setDurationSeconds,
}: InputControlsProps) {
  return (
    <div className="grid grid-cols-3 divide-x divide-gray-600 divide-y -mb-px -mr-px w-full">
      {/* A/C Angle of Bank */}
      <div className="flex flex-col divide-y divide-gray-600">
        <label
          className="font-display"
          htmlFor="angleOfBank"
          title="Angle of Bank, left is negative, right is positive"
        >
          AOB
        </label>
        <input
          type="number"
          id="angleOfBank"
          value={angleOfBank}
          min={-60}
          max={60}
          step={1}
          onChange={(e) => setAngleOfBank(Number(e.target.value))}
        />
      </div>
      {/* A/C Turn Rate */}
      <div className="flex flex-col divide-y divide-gray-600">
        <label className="font-display" htmlFor="turnRate">
          A/C Turn Rate
        </label>
        <input
          type="number"
          id="turnRate"
          value={turnRate}
          min={1}
          max={30}
          step={1}
          onChange={(e) => setTurnRate(Number(e.target.value))}
        />
      </div>
      {/* Duration */}
      <div className="flex flex-col divide-y divide-gray-600 border-b border-gray-600">
        <label className="font-display" htmlFor="durationSeconds">
          Duration (s)
        </label>
        <input
          type="number"
          id="durationSeconds"
          value={durationSeconds}
          min={10}
          max={120}
          step={1}
          onChange={(e) => setDurationSeconds(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
