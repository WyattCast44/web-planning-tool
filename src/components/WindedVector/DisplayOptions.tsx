import { InputField } from "../shared/InputField";

interface DisplayOptionsProps {
  showCourse: boolean;
  setShowCourse: (value: boolean) => void;
  showCompass: boolean;
  setShowCompass: (value: boolean) => void;
  showOppositeTurn: boolean;
  setShowOppositeTurn: (value: boolean) => void;
  scale: number;
  setScale: (value: number) => void;
}

export function DisplayOptions({
  showCourse,
  setShowCourse,
  showCompass,
  setShowCompass,
  showOppositeTurn,
  setShowOppositeTurn,
  scale,
  setScale,
}: DisplayOptionsProps) {
  return (
    <div className="flex flex-col items-center mt-2 flex-1 gap-2 w-full">
      <div className="flex flex-col w-full">
        <label className="font-display" htmlFor="showCourse">
          Show 1min CRS
        </label>
        <select
          id="showCourse"
          className="border border-gray-600"
          value={showCourse ? "true" : "false"}
          onChange={(e) => setShowCourse(e.target.value === "true")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div className="flex flex-col w-full">
        <label className="font-display" htmlFor="showCompass">
          Show Compass
        </label>
        <select
          id="showCompass"
          className="border border-gray-600"
          value={showCompass ? "true" : "false"}
          onChange={(e) => setShowCompass(e.target.value === "true")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div className="flex flex-col w-full">
        <label className="font-display" htmlFor="showOppositeTurn">
          Show Opposite Turn
        </label>
        <select
          id="showOppositeTurn"
          className="border border-gray-600"
          value={showOppositeTurn ? "true" : "false"}
          onChange={(e) => setShowOppositeTurn(e.target.value === "true")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div className="flex flex-col w-full">
        <InputField
          id="scale"
          label="Scale"
          value={scale}
          min={1}
          max={20}
          step={1}
          inputClassName="border border-t-0 border-gray-600"
          onChange={(value) => setScale(value)}
        />
      </div>
    </div>
  );
}
