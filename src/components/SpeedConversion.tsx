import { Panel } from "./Panel";
import { useState } from "react";
import { ConversionTable } from "./shared/ConversionTable";
import {
  mphToMs,
  mphToFpm,
  mphToKmh,
  mphToNmihr,
  msToMph,
  msToFpm,
  msToKmh,
  msToNmihr,
  fpmToMph,
  fpmToMs,
  fpmToKmh,
  fpmToNmihr,
  kmhToMph,
  kmhToMs,
  kmhToFpm,
  kmhToNmihr,
  nmihrToMph,
  nmihrToMs,
  nmihrToFpm,
  nmihrToKmh,
} from "../core/conversions";

export function SpeedConversion() {
  const [mphConversion, setMphConversion] = useState(0);
  const [msConversion, setMsConversion] = useState(0);
  const [fpmConversion, setFpmConversion] = useState(0);
  const [kmhConversion, setKmhConversion] = useState(0);
  const [nmihrConversion, setNmihrConversion] = useState(0);

  const units = [
    { key: "mph", label: "MPH", value: mphConversion, setValue: setMphConversion, min: 0, step: 1 },
    { key: "ms", label: "M/S", value: msConversion, setValue: setMsConversion, min: 0, step: 1 },
    { key: "fpm", label: "FPM", value: fpmConversion, setValue: setFpmConversion, min: 0, step: 1 },
    { key: "kmh", label: "Km/hr", value: kmhConversion, setValue: setKmhConversion, min: 0, step: 1 },
    { key: "nmihr", label: "Nmi/hr", value: nmihrConversion, setValue: setNmihrConversion, min: 0, step: 1, className: "rounded-br-md border-r border-b border-gray-600" },
  ];

  const conversionFunctions = {
    mphToMs,
    mphToFpm,
    mphToKmh,
    mphToNmihr,
    msToMph,
    msToFpm,
    msToKmh,
    msToNmihr,
    fpmToMph,
    fpmToMs,
    fpmToKmh,
    fpmToNmihr,
    kmhToMph,
    kmhToMs,
    kmhToFpm,
    kmhToNmihr,
    nmihrToMph,
    nmihrToMs,
    nmihrToFpm,
    nmihrToKmh,
  };

  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <ConversionTable
        title="Speed Conversion"
        units={units}
        conversionFunctions={conversionFunctions}
      />
    </Panel>
  );
}
