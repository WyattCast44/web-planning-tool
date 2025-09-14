interface InputFieldsProps {
  acLatitude: number;
  setAcLatitude: (value: number) => void;
  acLongitude: number;
  setAcLongitude: (value: number) => void;
  satLongitude: number;
  setSatLongitude: (value: number) => void;
}

export function InputFields({
  acLatitude,
  setAcLatitude,
  acLongitude,
  setAcLongitude,
  satLongitude,
  setSatLongitude,
}: InputFieldsProps) {
  return (
    <div className="grid grid-cols-3 divide-x divide-gray-600 divide-y -mb-px -mr-px w-full">
      {/* A/C Latitude */}
      <div className="flex flex-col divide-y divide-gray-600">
        <label className="font-display" htmlFor="acLatitude">
          A/C Lat &deg;
        </label>
        <input
          type="number"
          id="acLatitude"
          value={acLatitude}
          min={-80}
          max={80}
          step={1}
          onChange={(e) => setAcLatitude(Number(e.target.value))}
        />
      </div>
      {/* A/C Longitude */}
      <div className="flex flex-col divide-y divide-gray-600">
        <label className="font-display" htmlFor="acLongitude">
          A/C Long &deg;
        </label>
        <input
          type="number"
          id="acLongitude"
          value={acLongitude}
          min={-180}
          max={180}
          step={1}
          onChange={(e) => setAcLongitude(Number(e.target.value))}
        />
      </div>
      {/* Satellite Longitude */}
      <div className="flex flex-col divide-y divide-gray-600">
        <label className="font-display" htmlFor="satLongitude">
          Sat Long &deg;
        </label>
        <input
          type="number"
          id="satLongitude"
          value={satLongitude}
          className="border-b border-gray-600"
          min={-180}
          max={180}
          step={1}
          onChange={(e) => setSatLongitude(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
