import { InputField } from "../shared/InputField";
import { useAppStore } from "../../store";
import { round } from "../../core/math";

export function SixPackInputs() {
  const {
    altKft,
    hdgDegCardinal,
    keas,
    tgtElevKft,
    windDegCardinal,
    windKts,
    hat,
    ktas,
    mach,
    gs,
    windType,
    headwindOrTailwindComponent,
    crosswindComponent,
    courseDegCardinal,
  } = useAppStore();

  return (
    <div className="grid grid-cols-6 divide-x divide-gray-600 divide-y -mb-px -mr-px">
      <InputField
        id="altKft"
        label="MSL"
        value={altKft}
        onChange={(value) => useAppStore.setState({ altKft: value })}
        min={0}
        max={10000}
        step={0.1}
      />
      
      <InputField
        id="hdg"
        label="HDG"
        value={hdgDegCardinal}
        onChange={(value) => useAppStore.setState({ hdgDegCardinal: value })}
        min={1}
        max={360}
        step={1}
      />
      
      <InputField
        id="keas"
        label="KEAS"
        value={keas}
        onChange={(value) => useAppStore.setState({ keas: value })}
        min={0}
        max={2000}
        step={1}
      />
      
      <InputField
        id="ktas"
        label="KTAS"
        value={round(ktas, 0)}
        onChange={() => {}} // Read-only
        disabled
      />
      
      <InputField
        id="gs"
        label="GS"
        value={round(gs, 0)}
        onChange={() => {}} // Read-only
        disabled
      />
      
      <InputField
        id="mach"
        label="Mach"
        value={mach}
        onChange={() => {}} // Read-only
        disabled
      />
      
      <InputField
        id="tgtElevKft"
        label="TGT ELV"
        value={tgtElevKft}
        onChange={(value) => useAppStore.setState({ tgtElevKft: value })}
        min={0}
        max={10000}
        step={0.1}
        inputClassName="rounded-bl-md"
      />
      
      <InputField
        id="windDegCardinal"
        label="W-DIR"
        value={windDegCardinal}
        onChange={(value) => useAppStore.setState({ windDegCardinal: value })}
        min={1}
        max={360}
        step={1}
      />
      
      <InputField
        id="windKts"
        label="W-SPD"
        value={windKts}
        onChange={(value) => useAppStore.setState({ windKts: value })}
        min={0}
        max={1000}
        step={1}
      />
      
      <InputField
        id="crsValues"
        label="CRS"
        value={round(courseDegCardinal, 0) + "°"}
        onChange={() => {}} // Read-only
        disabled
      />
      
      <InputField
        id="windComponents"
        label={`${windType}/XW`}
        value={`${round(headwindOrTailwindComponent, 0)}/${round(crosswindComponent, 0)}`}
        onChange={() => {}} // Read-only
        disabled
      />
      
      <InputField
        id="hat"
        label="HAT"
        value={hat}
        onChange={() => {}} // Read-only
        disabled
      />
    </div>
  );
}
