import { degToRad, radToDeg, normalize360, wrap180, transformGeodeticToECEF } from "../core/math";
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
            min={0}
            max={80}
            step={0.5}
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
      <div className="h-[420px] bg-black/35 rounded-md my-2 mx-2 flex flex-col gap-2">
        <div className="border rounded-md bg-black/35 border-gray-600 text-gray-400 flex items-center h-[150px]">
          <div className="flex items-center justify-center w-1/3">
            <Compass />
          </div>
          <div className="border-l border-gray-600 flex items-center justify-center w-2/3">
            Elevation
          </div>
        </div>
        <div className="flex-1 border rounded-md bg-black/35 border-gray-600 text-gray-400">
          <Map />
        </div>
      </div>
    </Panel>
  );
}

function Compass() {
  const compSvg = useRef<SVGSVGElement>(null);
  const { hdgDegCardinal } = useAppStore();

  function drawCompass(compSvg: SVGSVGElement, azTrue: number, hdg: number) {
    const w = compSvg.clientWidth;
    const h = compSvg.clientHeight;
    
    compSvg.innerHTML = "";

    const NS = "http://www.w3.org/2000/svg";

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 20;

    // ring
    const ring = document.createElementNS(NS, "circle");
    ring.setAttribute("cx", cx.toString());
    ring.setAttribute("cy", cy.toString());
    ring.setAttribute("r", R.toString());
    ring.setAttribute("fill", "rgba(0,0,0,.35)");
    ring.setAttribute("stroke", "rgba(180,220,255,.2)");
    compSvg.appendChild(ring);

    // ticks + labels
    for (let b = 0; b < 360; b += 10) {
      const L = b % 30 === 0 ? 10 : 5;
      const a = degToRad(90 - b);
      const x1 = cx + (R - L) * Math.cos(a);
      const y1 = cy - (R - L) * Math.sin(a);
      const x2 = cx + R * Math.cos(a);
      const y2 = cy - R * Math.sin(a);
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", `M${x1},${y1} L${x2},${y2}`);
      p.setAttribute("stroke", "rgba(180,220,255,.3)");
      compSvg.appendChild(p);
      if (b % 30 === 0) {
        const tx = cx + (R - 22) * Math.cos(a);
        const ty = cy - (R - 22) * Math.sin(a) + 4;
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", tx.toString());
        t.setAttribute("y", ty.toString());
        t.setAttribute("fill", "rgba(200,255,255,.7)");
        t.setAttribute("font-size", "9");
        t.setAttribute("text-anchor", "middle");
        t.textContent =
          b === 0
            ? "N"
            : b === 90
            ? "E"
            : b === 180
            ? "S"
            : b === 270
            ? "W"
            : b.toString();
        compSvg.appendChild(t);
      }
    }

    // az true pointer (satellite emoji)
    const aT = degToRad(90 - azTrue);
    const tx = cx + (R - 1) * Math.cos(aT);
    const ty = cy - (R - 1) * Math.sin(aT);
    const sat = document.createElementNS(NS, "text");
    sat.setAttribute("x", tx.toString());
    sat.setAttribute("y", ty.toString());
    sat.setAttribute("font-size", "18");
    sat.setAttribute("text-anchor", "middle");
    sat.setAttribute("dominant-baseline", "central");
    sat.setAttribute("fill", "rgba(16,185,129,.55)");
    sat.textContent = "🛰️";
    compSvg.appendChild(sat);

    // center triangle pointing to heading
    const aH = degToRad(90 - hdg);
    const triangleHeight = 18; // total height of the triangle
    const triangleWidth = 12; // total width of the triangle base
    
    // For an isosceles triangle, the centroid is 1/3 of the height from the base
    // So we need to offset the triangle so its centroid is at the compass center
    const centroidOffset = triangleHeight / 3; // distance from base to centroid
    
    // Calculate triangle vertices relative to compass center
    // Point 1: tip pointing to heading (forward) - 2/3 of height from centroid
    const tipX = cx + (triangleHeight * 2/3) * Math.cos(aH);
    const tipY = cy - (triangleHeight * 2/3) * Math.sin(aH);
    
    // Point 2: left base vertex (perpendicular to heading) - 1/3 of height back from centroid
    const leftX = cx - centroidOffset * Math.cos(aH) - (triangleWidth/2) * Math.cos(aH + Math.PI/2);
    const leftY = cy + centroidOffset * Math.sin(aH) + (triangleWidth/2) * Math.sin(aH + Math.PI/2);
    
    // Point 3: right base vertex (perpendicular to heading) - 1/3 of height back from centroid
    const rightX = cx - centroidOffset * Math.cos(aH) - (triangleWidth/2) * Math.cos(aH - Math.PI/2);
    const rightY = cy + centroidOffset * Math.sin(aH) + (triangleWidth/2) * Math.sin(aH - Math.PI/2);
    
    const triangle = document.createElementNS(NS, "path");
    triangle.setAttribute(
      "d",
      `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`
    );
    triangle.setAttribute("fill", "rgba(56,189,248,.7)");
    triangle.setAttribute("stroke", "rgba(56,189,248,.9)");
    triangle.setAttribute("stroke-width", "1");
    compSvg.appendChild(triangle);
  }

  useEffect(() => {
    if (compSvg.current) {
      drawCompass(compSvg.current, 105, hdgDegCardinal);
    }
    window.addEventListener("resize", () => {
      if (compSvg.current) {
        drawCompass(compSvg.current, 105, hdgDegCardinal);
      }
    });
  }, [hdgDegCardinal]);

  return (
    <div className="select-none">
      <svg id="compass" className="w-full h-full" ref={compSvg}></svg>
    </div>
  );
}

function Map() {
  const mapSvg = useRef<SVGSVGElement>(null);
  function drawMap(mapSvg: SVGSVGElement, lat: number, lon: number, satLon: number) {
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
    <div className="select-none">
      <svg id="map" className="w-full h-full rounded-md" ref={mapSvg}></svg>
    </div>
  );
}