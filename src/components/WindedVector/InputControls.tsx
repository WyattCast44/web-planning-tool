type InputMode = "duration" | "headingChange";

interface InputControlsProps {
  angleOfBank: number;
  setAngleOfBank: (value: number) => void;
  turnRate: number;
  setTurnRate: (value: number) => void;
  durationSeconds: number;
  setDurationSeconds: (value: number) => void;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  headingChangeDeg: number;
  setHeadingChangeDeg: (value: number) => void;
}

export function InputControls({
  angleOfBank,
  setAngleOfBank,
  turnRate,
  setTurnRate,
  durationSeconds,
  setDurationSeconds,
  inputMode,
  setInputMode,
  headingChangeDeg,
  setHeadingChangeDeg,
}: InputControlsProps) {
  return (
    <div className="w-full">
      {/* Mode Selector */}
      <div className="flex border-b border-gray-600">
        <button
          className={`flex-1 px-3 py-2 text-sm font-display uppercase tracking-tight ${
            inputMode === "duration"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
          onClick={() => setInputMode("duration")}
        >
          Duration
        </button>
        <button
          className={`flex-1 px-3 py-2 text-sm font-display uppercase tracking-tight ${
            inputMode === "headingChange"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
          onClick={() => setInputMode("headingChange")}
        >
          Heading Change
        </button>
      </div>

      {/* Input Controls */}
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
        {/* Duration or Heading Change */}
        <div className="flex flex-col divide-y divide-gray-600 border-b border-gray-600">
          {inputMode === "duration" ? (
            <>
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
            </>
          ) : (
            <>
              <label className="font-display" htmlFor="headingChangeDeg" title="Turn direction determined by AOB sign (positive AOB = right turn, negative AOB = left turn)">
                Heading Change (°)
              </label>
              <input
                type="number"
                id="headingChangeDeg"
                value={headingChangeDeg}
                min={1}
                max={360}
                step={1}
                onChange={(e) => setHeadingChangeDeg(Number(e.target.value))}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
