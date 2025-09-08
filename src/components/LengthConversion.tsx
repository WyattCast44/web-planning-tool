import { Panel } from "./Panel";
import { useState } from "react";
import { roundWithPadding } from "../core/math";
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

  return (
    <Panel className="max-w-xl min-w-md mx-auto my-3">
      <header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none">
        Length Conversion
      </header>

      <div className="grid grid-cols-5 text-center divide-x divide-gray-600 divide-y border-t border-gray-600 -mb-px -mr-px overflow-hidden w-full h-full">
        <label htmlFor="ftConversion">FT</label>
        <label htmlFor="mConversion">M</label>
        <label htmlFor="nmiConversion">Nmi</label>
        <label htmlFor="kmConversion">KM</label>
        <label htmlFor="ydConversion">YD</label>

        {/* FT */}
        <input
          type="number"
          id="ftConversion"
          min={0}
          step={1}
          value={ftConversion}
          onChange={(e) => setFtConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(ftToM(ftConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(ftToNmi(ftConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(ftToKm(ftConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(ftToYd(ftConversion), 2)}
        />

        {/* M */}
        <input
          type="text"
          disabled
          value={roundWithPadding(mToFt(mConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="mConversion"
          value={mConversion}
          onChange={(e) => setMConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(mToNmi(mConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(mToKm(mConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(mToYd(mConversion), 2)}
        />

        {/* Nmi */}
        <input
          type="text"
          disabled
          value={roundWithPadding(nmiToFt(nmiConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(nmiToM(nmiConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="nmiConversion"
          value={nmiConversion}
          onChange={(e) => setNmiConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(nmiToKm(nmiConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(nmiToYd(nmiConversion), 2)}
        />

        <input
          type="text"
          disabled
          value={roundWithPadding(kmToFt(kmConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(kmToM(kmConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(kmToNmi(kmConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="kmConversion"
          value={kmConversion}
          onChange={(e) => setKmConversion(Number(e.target.value))}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(kmToYd(kmConversion), 2)}
        />

        <input
          type="text"
          disabled
          value={roundWithPadding(ydToFt(ydConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(ydToM(ydConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(ydToNmi(ydConversion), 2)}
        />
        <input
          type="text"
          disabled
          value={roundWithPadding(ydToKm(ydConversion), 2)}
        />
        <input
          type="number"
          min={0}
          step={1}
          id="ydConversion"
          className="rounded-br-md border-r border-b border-gray-600"
          value={ydConversion}
          onChange={(e) => setYdConversion(Number(e.target.value))}
        />
      </div>
    </Panel>
  );
}
