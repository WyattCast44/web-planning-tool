import {
  calculatePointingAttitudeFromAntennaToSatellite,
} from "../core/math";
import { ftToM } from "../core/conversions";
import { Panel } from "./Panel";
import { useState, useMemo } from "react";
import { useAppStore } from "../store";
import { InputFields } from "./SatcomAssessor/InputFields";
import { CompassScope } from "./SatcomAssessor/CompassScope";
import { Map } from "./SatcomAssessor/Map";

// Input validation
const validateCoordinates = (lat: number, lon: number) => {
  if (lat < -90 || lat > 90) throw new Error('Invalid latitude: must be between -90 and 90');
  if (lon < -180 || lon > 180) throw new Error('Invalid longitude: must be between -180 and 180');
};

export function SatcomAssessor() {
  const { hdgDegCardinal, altKft } = useAppStore();

  const [acLatitude, setAcLatitude] = useState(0);
  const [acLongitude, setAcLongitude] = useState(0);
  const [satLongitude, setSatLongitude] = useState(0);

  // Memoize expensive calculations
  const pointingData = useMemo(() => {
    try {
      validateCoordinates(acLatitude, acLongitude);
      return calculatePointingAttitudeFromAntennaToSatellite(
        acLatitude,
        acLongitude,
        satLongitude,
        ftToM(altKft * 1000),
        hdgDegCardinal
      );
    } catch (error) {
      console.warn('Invalid coordinates:', error);
      return { azTrueDeg: 0, azRelDeg: 0, elevDeg: -90 };
    }
  }, [acLatitude, acLongitude, satLongitude, altKft, hdgDegCardinal]);

  const { azTrueDeg, elevDeg } = pointingData;

  return (
    <Panel className="overflow-hidden max-w-xl min-w-md mx-auto my-3">
      <h1 className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-b border-gray-600">
        Satcom Assessor
      </h1>
      
      <InputFields
        acLatitude={acLatitude}
        setAcLatitude={setAcLatitude}
        acLongitude={acLongitude}
        setAcLongitude={setAcLongitude}
        satLongitude={satLongitude}
        setSatLongitude={setSatLongitude}
      />
      
      <div className="bg-black/35 rounded-md flex">
        <CompassScope
          hdgDegCardinal={hdgDegCardinal}
          azTrueDeg={azTrueDeg}
          elevDeg={elevDeg}
        />
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <Map
            acLatitude={acLatitude}
            acLongitude={acLongitude}
            satLongitude={satLongitude}
            visible={elevDeg > 0}
            acHeading={hdgDegCardinal}
          />
        </div>
      </div>
    </Panel>
  );
}

