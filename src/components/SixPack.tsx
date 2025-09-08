import {
  useAppStore,
  setAltKft,
  setHdgDegCardinal,
  setKeas,
  setTgtElevKft,
  setWindDegCardinal,
  setWindKts,
} from "../store";
import { round } from "../core/math";
import { Panel } from "./Panel";

export function SixPack() {
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
    <Panel className="max-w-xl min-w-md mx-auto sticky top-2 z-50">
      <div className="grid grid-cols-6 divide-x divide-gray-600 divide-y -mb-px -mr-px">
        {/* MSL */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="altKft">
            MSL
          </label>
          <input
            type="number"
            id="altKft"
            value={altKft}
            min={0}
            max={10000}
            step={0.1}
            onChange={(e) => setAltKft(Number(e.target.value))}
          />
        </div>
        {/* HDG */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="hdg">
            HDG
          </label>
          <input
            type="number"
            id="hdg"
            value={hdgDegCardinal}
            min={1}
            max={360}
            step={1}
            onChange={(e) => setHdgDegCardinal(Number(e.target.value))}
          />
        </div>
        {/* KEAS */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="keas">
            KEAS
          </label>
          <input
            type="number"
            id="keas"
            value={keas}
            min={0}
            max={2000}
            step={1}
            onChange={(e) => setKeas(Number(e.target.value))}
          />
        </div>
        {/* KTAS */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="ktas">
            KTAS
          </label>
          <input type="number" id="ktas" value={round(ktas, 0)} disabled />
        </div>
        {/* GS */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="gs">
            GS
          </label>
          <input type="number" id="gs" value={round(gs, 0)} disabled />
        </div>
        {/* MACH */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="mach">
            Mach
          </label>
          <input type="number" id="mach" value={mach} disabled />
        </div>
        {/* TGT ELV */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="tgtElevKft">
            TGT ELV
          </label>
          <input
            type="number"
            id="tgtElevKft"
            className="rounded-bl-md"
            value={tgtElevKft}
            min={0}
            max={10000}
            step={0.1}
            onChange={(e) => setTgtElevKft(Number(e.target.value))}
          />
        </div>
        {/* W-DIR */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="windDegCardinal">
            W-DIR
          </label>
          <input
            type="number"
            id="windDegCardinal"
            value={windDegCardinal}
            min={1}
            max={360}
            step={1}
            onChange={(e) => setWindDegCardinal(Number(e.target.value))}
          />
        </div>
        {/* W-SPD */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="windKts">
            W-SPD
          </label>
          <input
            type="number"
            id="windKts"
            value={windKts}
            min={0}
            max={1000}
            step={1}
            onChange={(e) => setWindKts(Number(e.target.value))}
          />
        </div>
        {/* CRS */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="crsValues">
            CRS
          </label>
          <input
            type="text"
            id="crsValues"
            value={round(courseDegCardinal, 0) + "°"}
            disabled
          />
        </div>
        {/* WIND COMPONENTS */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="windComponents">
            {windType}/XW
          </label>
          <input
            type="text"
            id="windComponents"
            value={
              round(headwindOrTailwindComponent, 0) +
              "/" +
              round(crosswindComponent, 0)
            }
            disabled
          />
        </div>
        {/* HAT */}
        <div className="flex flex-col divide-y divide-gray-600">
          <label className="font-display" htmlFor="hat">
            HAT
          </label>
          <input type="number" id="hat" value={hat} disabled />
        </div>
      </div>
    </Panel>
  );
}
