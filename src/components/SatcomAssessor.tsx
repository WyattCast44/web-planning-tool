import {
  calculatePointingAttitudeFromAntennaToSatellite,
  degToRad,
} from "../core/math";
import { Panel } from "./Panel";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";

export function SatcomAssessor() {
  const [acLatitude, setAcLatitude] = useState(0);
  const [acLongitude, setAcLongitude] = useState(0);
  const [satLongitude, setSatLongitude] = useState(0);

  return (
    <Panel className="overflow-hidden max-w-xl min-w-md mx-auto">
      <h1 className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-b border-gray-600">
        Satcom Assessor
      </h1>
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
        {/* Satellite Latitude */}
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
      <div className="bg-black/35 rounded-md flex">
        <CompassScope
          acLatitude={acLatitude}
          acLongitude={acLongitude}
          satLongitude={satLongitude}
        />
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <Map />
        </div>
      </div>
    </Panel>
  );
}

function CompassScope({
  acLatitude,
  acLongitude,
  satLongitude,
}: {
  acLatitude: number;
  acLongitude: number;
  satLongitude: number;
}) {
  const compassScopeSvg = useRef<SVGSVGElement>(null);
  const { hdgDegCardinal, altKft } = useAppStore();

  const { azTrueDeg, azRelDeg, elevDeg } =
    calculatePointingAttitudeFromAntennaToSatellite(
      acLatitude,
      acLongitude,
      satLongitude,
      altKft,
      hdgDegCardinal
    );

  function drawCompassScope(
    compassScopeSvg: SVGSVGElement,
    azTrue: number,
    elev: number,
    hdg: number
  ) {
    const NS = "http://www.w3.org/2000/svg";
    const w = compassScopeSvg.clientWidth;
    const h = compassScopeSvg.clientHeight;
    compassScopeSvg.innerHTML = "";
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 24;

    // background
    const bg = document.createElementNS(NS, "circle");
    bg.setAttribute("cx", cx.toString());
    bg.setAttribute("cy", cy.toString());
    bg.setAttribute("r", R.toString());
    bg.setAttribute("fill", "rgba(0,0,0,.35)");
    bg.setAttribute("stroke", "rgba(180,220,255,.2)");
    compassScopeSvg.appendChild(bg);

    function radiusForElev(deg: number) {
      return (R * (90 - deg)) / 90;
    }

    // elevation rings: 60°, 30°, 10°, 0° (horizon)
    const rings = [
      // make the 60° ring a dashed line that is green
      { deg: 60, color: "rgba(16,185,129,.5)", dash: "3 5", yOffset: -8 },
      // make the 30° ring a dashed line that is yellow: 204	255	0
      { deg: 30, color: "rgba(204,255,0,.5)", dash: "3 2.5", yOffset: -8 },
      // make the horizon a dashed line that is dark gray
      { deg: 0, color: "rgba(0,0,0,0)", dash: "2 6", yOffset: 3 },
    ];

    rings.forEach((rg) => {
      // ring
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", cx.toString());
      c.setAttribute("cy", cy.toString());
      c.setAttribute("r", radiusForElev(rg.deg).toString());
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", rg.color);
      c.setAttribute("stroke-width", "1");
      c.setAttribute("stroke-dasharray", rg.dash);
      compassScopeSvg.appendChild(c);
      // label
      const t = document.createElementNS(NS, "text");
      // center the text
      // the position is the angle offset from the top of the compass and positive
      // to the right
      t.setAttribute("x", cx.toString());
      t.setAttribute("y", (cy - radiusForElev(rg.deg) - rg.yOffset).toString());
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", "rgba(200,255,255,.75)");
      t.setAttribute("font-size", "8");
      t.textContent = rg.deg === 0 ? "HORIZON" : rg.deg + "°";
      compassScopeSvg.appendChild(t);
    });

    // outer compass ticks (true)
    for (let b = 0; b < 360; b += 10) {
      const L = b % 30 === 0 ? 8 : 4;
      const a = degToRad(90 - b);
      const x1 = cx + (R - L) * Math.cos(a);
      const y1 = cy - (R - L) * Math.sin(a);
      const x2 = cx + R * Math.cos(a);
      const y2 = cy - R * Math.sin(a);
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", `M${x1},${y1} L${x2},${y2}`);
      p.setAttribute("stroke", "rgba(180,220,255,.28)");
      compassScopeSvg.appendChild(p);
      if (b % 90 === 0) {
        const tx = cx + (R - 15) * Math.cos(a);
        const ty = cy - (R - 15) * Math.sin(a) + 4;
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", tx.toString());
        t.setAttribute("y", ty.toString());
        t.setAttribute("fill", "rgba(200,255,255,.75)");
        t.setAttribute("font-size", "8");
        t.setAttribute("text-anchor", "middle");
        t.textContent = b === 0 ? "N" : b === 90 ? "E" : b === 180 ? "S" : "W";
        compassScopeSvg.appendChild(t);
      }
    }

    // center triangle pointing to heading
    const aH = degToRad(90 - hdg);
    const triangleHeight = 18; // total height of the triangle
    const triangleWidth = 12; // total width of the triangle base

    // For an isosceles triangle, the centroid is 1/3 of the height from the base
    // So we need to offset the triangle so its centroid is at the compass center
    const centroidOffset = triangleHeight / 3; // distance from base to centroid

    // Calculate triangle vertices relative to compass center
    // Point 1: tip pointing to heading (forward) - 2/3 of height from centroid
    const tipX = cx + ((triangleHeight * 2) / 3) * Math.cos(aH);
    const tipY = cy - ((triangleHeight * 2) / 3) * Math.sin(aH);

    // Point 2: left base vertex (perpendicular to heading) - 1/3 of height back from centroid
    const leftX =
      cx -
      centroidOffset * Math.cos(aH) -
      (triangleWidth / 2) * Math.cos(aH + Math.PI / 2);
    const leftY =
      cy +
      centroidOffset * Math.sin(aH) +
      (triangleWidth / 2) * Math.sin(aH + Math.PI / 2);

    // Point 3: right base vertex (perpendicular to heading) - 1/3 of height back from centroid
    const rightX =
      cx -
      centroidOffset * Math.cos(aH) -
      (triangleWidth / 2) * Math.cos(aH - Math.PI / 2);
    const rightY =
      cy +
      centroidOffset * Math.sin(aH) +
      (triangleWidth / 2) * Math.sin(aH - Math.PI / 2);

    const triangle = document.createElementNS(NS, "path");
    triangle.setAttribute(
      "d",
      `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`
    );
    triangle.setAttribute("fill", "rgba(56,189,248,.7)");
    triangle.setAttribute("stroke", "rgba(56,189,248,.9)");
    triangle.setAttribute("stroke-width", "1");
    compassScopeSvg.appendChild(triangle);

    // marker for satellite (polar: azTrue, elev)
    const aT = degToRad(90 - azTrue);
    const rSat = radiusForElev(elev);
    const x = cx + rSat * Math.cos(aT);
    const y = cy - rSat * Math.sin(aT);

    // radial line
    const ray = document.createElementNS(NS, "path");
    ray.setAttribute("d", `M${cx},${cy} L${x},${y}`);
    ray.setAttribute("stroke", "rgba(16,185,129,.5)");
    ray.setAttribute("stroke-width", "1.5");
    compassScopeSvg.appendChild(ray);

    // marker (green inside rim, red outside -> no LOS)
    const inside = elev > 0;
    const mark = document.createElementNS(NS, "circle");
    mark.setAttribute("cx", x.toString());
    mark.setAttribute("cy", y.toString());
    mark.setAttribute("r", "5".toString());
    mark.setAttribute(
      "fill",
      inside ? "rgba(16,185,129,.95)" : "rgba(239,68,68,.95)"
    );
    mark.setAttribute("stroke", "white");
    mark.setAttribute("stroke-width", "1");
    compassScopeSvg.appendChild(mark);
  }

  useEffect(() => {
    if (compassScopeSvg.current) {
      drawCompassScope(
        compassScopeSvg.current,
        azTrueDeg,
        elevDeg,
        hdgDegCardinal
      );
    }

    window.addEventListener("resize", () => {
      if (compassScopeSvg.current) {
        drawCompassScope(
          compassScopeSvg.current,
          azTrueDeg,
          elevDeg,
          hdgDegCardinal
        );
      }
    });
  }, [
    azTrueDeg,
    azRelDeg,
    hdgDegCardinal,
    elevDeg,
    acLatitude,
    acLongitude,
    satLongitude,
  ]);

  return (
    <div className="select-none">
      <svg
        id="compassScope"
        className="h-[200px] w-[200px]"
        ref={compassScopeSvg}
      ></svg>
    </div>
  );
}

function Map() {
  const mapSvg = useRef<SVGSVGElement>(null);
  function drawMap(
    mapSvg: SVGSVGElement,
    lat: number,
    lon: number,
    satLon: number
  ) {
    const w = mapSvg.clientWidth;
    const h = mapSvg.clientHeight;
    mapSvg.innerHTML = "";

    const NS = "http://www.w3.org/2000/svg";

    const base = document.createElementNS(NS, "image");
    base.setAttribute("href", "earth.jpg");
    base.setAttribute("x", "0");
    base.setAttribute("y", "0");
    base.setAttribute("width", w.toString());
    base.setAttribute("height", h.toString());
    base.setAttribute("preserveAspectRatio", "none");

    mapSvg.appendChild(base);
  }

  useEffect(() => {
    if (mapSvg.current) {
      drawMap(mapSvg.current, 0, 0, 0);
    }
    window.addEventListener("resize", () => {
      if (mapSvg.current) {
        drawMap(mapSvg.current, 0, 0, 0);
      }
    });
  }, []);

  return (
    <div className="select-none overflow-hidden">
      <svg id="map" className="rounded" ref={mapSvg}></svg>
    </div>
  );
}
