interface InputControlsProps {
  localTgtElevKft: number | null;
  setLocalTgtElevKft: (value: number | null) => void;
  fpaDeg: number;
  setFpaDeg: (value: number) => void;
  horizonRangeNm: number;
  setHorizonRangeNm: (value: number) => void;
  runwayHeadingDeg: number;
  setRunwayHeadingDeg: (value: number) => void;
}

export function InputControls({
  localTgtElevKft,
  setLocalTgtElevKft,
  fpaDeg,
  setFpaDeg,
  horizonRangeNm,
  setHorizonRangeNm,
  runwayHeadingDeg,
  setRunwayHeadingDeg,
}: InputControlsProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 divide-x divide-gray-600 divide-y -mb-px -mr-px w-full">

        {/* Target Elevation */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="tgtElevKftGlideSlope" title="Field/Target elevation in thousands of feet">
            TGT ELV (kft)
          </label>
          <input
            type="number"
            id="tgtElevKftGlideSlope"
            value={localTgtElevKft || ""}
            min={0}
            max={50}
            step={0.1}
            onChange={(e) => setLocalTgtElevKft(Number(e.target.value) || null)}
          />
        </div>

        {/* Flight Path Angle */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="fpaDeg" title="Flight Path Angle in degrees (negative for descent)">
            FPA
          </label>
          <input
            type="number"
            id="fpaDeg"
            value={fpaDeg}
            min={-30}
            max={30}
            step={0.1}
            onChange={(e) => setFpaDeg(Number(e.target.value))}
          />
        </div>

        {/* Horizon Range */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="horizonRangeNm" title="Horizon range in nautical miles">
            RANGE
          </label>
          <input
            type="number"
            id="horizonRangeNm"
            value={horizonRangeNm}
            min={1}
            max={100}
            step={1}
            onChange={(e) => setHorizonRangeNm(Number(e.target.value))}
          />
        </div>

        {/* Runway Heading */}
        <div className="flex flex-col divide-y divide-gray-600 border-b border-gray-600">
          <label className="font-display" htmlFor="runwayHeadingDeg" title="Runway heading in degrees (0-360)">
            RWY HDG
          </label>
          <input
            type="number"
            id="runwayHeadingDeg"
            value={runwayHeadingDeg}
            min={0}
            max={360}
            step={1}
            onChange={(e) => setRunwayHeadingDeg(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

