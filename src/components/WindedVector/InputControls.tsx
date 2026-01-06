type InputMode = "duration" | "headingChange";

interface InputControlsProps {
  maxAngleOfBank: number;
  setMaxAngleOfBank: (value: number) => void;
  startingAngleOfBank: number;
  setStartingAngleOfBank: (value: number) => void;
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
  maxAngleOfBank,
  setMaxAngleOfBank,
  startingAngleOfBank,
  setStartingAngleOfBank,
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

      {/* Input Controls - Row 1 */}
      <div className="grid grid-cols-4 divide-x divide-gray-600 w-full">
        {/* Max Angle of Bank */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label
            className="font-display text-xs px-1"
            htmlFor="maxAngleOfBank"
            title="Maximum Angle of Bank, left is negative, right is positive"
          >
            Max AOB
          </label>
          <input
            type="number"
            id="maxAngleOfBank"
            value={maxAngleOfBank}
            min={-60}
            max={60}
            step={1}
            onChange={(e) => setMaxAngleOfBank(Number(e.target.value))}
          />
        </div>
        {/* Starting Angle of Bank */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label
            className="font-display text-xs px-1"
            htmlFor="startingAngleOfBank"
            title="Starting Angle of Bank (initial bank angle)"
          >
            Start AOB
          </label>
          <input
            type="number"
            id="startingAngleOfBank"
            value={startingAngleOfBank}
            min={-60}
            max={60}
            step={1}
            onChange={(e) => setStartingAngleOfBank(Number(e.target.value))}
          />
        </div>
        {/* A/C Roll Rate */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label 
            className="font-display text-xs px-1" 
            htmlFor="turnRate"
            title="Roll rate in degrees per second"
          >
            Roll Rate
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
              <label className="font-display text-xs px-1" htmlFor="durationSeconds">
                Duration (s)
              </label>
              <input
                type="number"
                id="durationSeconds"
                value={durationSeconds}
                min={10}
                max={300}
                step={1}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
              />
            </>
          ) : (
            <>
              <label 
                className="font-display text-xs px-1" 
                htmlFor="headingChangeDeg" 
                title="Turn direction determined by Max AOB sign (positive = right turn, negative = left turn)"
              >
                Hdg Chg (°)
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
