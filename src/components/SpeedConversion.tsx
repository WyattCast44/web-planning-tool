import { Panel } from "./Panel";
import { useState } from "react";
import { roundWithPadding } from "../core/math";
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

  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none">
        Speed Conversion
      </header>

      <div className="grid grid-cols-5 text-center divide-x divide-gray-600 divide-y border-t border-gray-600 -mb-px -mr-px overflow-hidden w-full h-full">
        <label htmlFor="mphConversion">MPH</label>
        <label htmlFor="msConversion">M/S</label>
        <label htmlFor="fpmConversion">FPM</label>
        <label htmlFor="kmhConversion">Km/hr</label>
        <label htmlFor="nmihrConversion">Nmi/hr</label>

        {/* MPH */}
        <input
          type="number"
          id="mphConversion"
          min={0}
          step={1}
          value={mphConversion}
          onChange={(e) => setMphConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(mphToMs(mphConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(mphToFpm(mphConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(mphToKmh(mphConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(mphToNmihr(mphConversion), 2)}
        />

        {/* M/S */}
        <input
          type="text"
          disabled
          value={roundWithPadding(msToMph(msConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="msConversion"
          value={msConversion}
          onChange={(e) => setMsConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(msToFpm(msConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(msToKmh(msConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(msToNmihr(msConversion), 2)}
        />

        {/* FPM */}
        <input
          type="text"
          disabled
          value={roundWithPadding(fpmToMph(fpmConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(fpmToMs(fpmConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="fpmConversion"
          value={fpmConversion}
          onChange={(e) => setFpmConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(fpmToKmh(fpmConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(fpmToNmihr(fpmConversion), 2)}
        />

        {/* Km/hr */}
        <input
          type="text"
          disabled
          value={roundWithPadding(kmhToMph(kmhConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(kmhToMs(kmhConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(kmhToFpm(kmhConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="kmhConversion"
          value={kmhConversion}
          onChange={(e) => setKmhConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(kmhToNmihr(kmhConversion), 2)}
        />

        {/* Nmi/hr */}
        <input
          type="text"
          disabled
          value={roundWithPadding(nmihrToMph(nmihrConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(nmihrToMs(nmihrConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(nmihrToFpm(nmihrConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(nmihrToKmh(nmihrConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="nmihrConversion"
          className="rounded-br-md border-r border-b border-gray-600"
          value={nmihrConversion}
          onChange={(e) => setNmihrConversion(Number(e.target.value))}
        />
      </div>
    </Panel>
  );
}
