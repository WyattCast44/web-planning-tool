import { Panel } from "./Panel";
import { useState } from "react";
import { ConversionTable } from "./shared/ConversionTable";
import {
  ftToM,
  ftToNmi,
  ftToKm,
  ftToYd,
  mToFt,
  mToNmi,
  mToKm,
  mToYd,
  nmiToFt,
  nmiToM,
  nmiToKm,
  nmiToYd,
  kmToFt,
  kmToM,
  kmToNmi,
  kmToYd,
  ydToFt,
  ydToM,
  ydToNmi,
  ydToKm,
} from "../core/conversions";

export function LengthConversion() {
  const [ftConversion, setFtConversion] = useState(0);
  const [mConversion, setMConversion] = useState(0);
  const [nmiConversion, setNmiConversion] = useState(0);
  const [kmConversion, setKmConversion] = useState(0);
  const [ydConversion, setYdConversion] = useState(0);

  const units = [
    { key: "ft", label: "FT", value: ftConversion, setValue: setFtConversion, min: 0, step: 1 },
    { key: "m", label: "M", value: mConversion, setValue: setMConversion, min: 0, step: 1 },
    { key: "nmi", label: "Nm", value: nmiConversion, setValue: setNmiConversion, min: 0, step: 1 },
    { key: "km", label: "KM", value: kmConversion, setValue: setKmConversion, min: 0, step: 1 },
    { key: "yd", label: "YD", value: ydConversion, setValue: setYdConversion, min: 0, step: 1, className: "rounded-br-md border-r border-b border-gray-600" },
  ];

  const conversionFunctions = {
    ftToM,
    ftToNmi,
    ftToKm,
    ftToYd,
    mToFt,
    mToNmi,
    mToKm,
    mToYd,
    nmiToFt,
    nmiToM,
    nmiToKm,
    nmiToYd,
    kmToFt,
    kmToM,
    kmToNmi,
    kmToYd,
    ydToFt,
    ydToM,
    ydToNmi,
    ydToKm,
  };

  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <ConversionTable
        title="Length Conversion"
        units={units}
        conversionFunctions={conversionFunctions}
      />
    </Panel>
  );
}
