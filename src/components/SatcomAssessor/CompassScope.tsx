import { useRef, useEffect, useCallback } from "react";
import { degToRad } from "../../core/math";
import { round } from "../../core/math";

// Constants for better maintainability
const COMPASS_CONFIG = {
  TRIANGLE_HEIGHT: 18,
  TRIANGLE_WIDTH: 12,
  RADIUS_OFFSET: 24,
  FONT_SIZE: 8,
  MARKER_RADIUS: 5,
} as const;

const COLORS = {
  AIRCRAFT: "rgba(56,189,248,.7)",
  AIRCRAFT_STROKE: "rgba(56,189,248,.9)",
  SATELLITE_VISIBLE: "rgba(16,185,129,.95)",
  SATELLITE_HIDDEN: "rgba(239,68,68,.95)",
  LINK_VISIBLE: "rgba(16,185,129,.5)",
  LINK_HIDDEN: "rgba(239,68,68,.5)",
  TEXT: "rgba(200,255,255,.75)",
} as const;

interface CompassScopeProps {
  acLatitude: number;
  acLongitude: number;
  satLongitude: number;
  hdgDegCardinal: number;
  azTrueDeg: number;
  elevDeg: number;
}

export function CompassScope({
  acLatitude,
  acLongitude,
  satLongitude,
  hdgDegCardinal,
  azTrueDeg,
  elevDeg,
}: CompassScopeProps) {
  const compassScopeSvg = useRef<SVGSVGElement>(null);

  function drawCompassScope(
    compassScopeSvg: SVGSVGElement,
    azTrue: number,
    elev: number,
    hdg: number
  ) {
    const NS = "http://www.w3.org/2000/svg";
    // Add fallback dimensions to prevent rendering issues
    const w = Math.max(compassScopeSvg.clientWidth, 200);
    const h = Math.max(compassScopeSvg.clientHeight, 200);
    compassScopeSvg.innerHTML = "";
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - COMPASS_CONFIG.RADIUS_OFFSET;

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
    const triangleHeight = COMPASS_CONFIG.TRIANGLE_HEIGHT;
    const triangleWidth = COMPASS_CONFIG.TRIANGLE_WIDTH;

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
    triangle.setAttribute("fill", COLORS.AIRCRAFT);
    triangle.setAttribute("stroke", COLORS.AIRCRAFT_STROKE);
    triangle.setAttribute("stroke-width", "1");
    compassScopeSvg.appendChild(triangle);

    // marker for satellite (polar: azTrue, elev)
    const aT = degToRad(90 - azTrue);
    const rSat = radiusForElev(elev);
    const x = cx + rSat * Math.cos(aT);
    const y = cy - rSat * Math.sin(aT);
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", x.toString());
    t.setAttribute("y", (y - 7).toString());
    t.setAttribute("fill", COLORS.TEXT);
    t.setAttribute("font-size", "6");
    t.setAttribute("text-anchor", "middle");
    t.textContent = round(elev, 0).toString() + "°";
    compassScopeSvg.appendChild(t);

    // radial line
    const ray = document.createElementNS(NS, "path");
    ray.setAttribute("d", `M${cx},${cy} L${x},${y}`);
    if (elev > 0) {
      ray.setAttribute("stroke", COLORS.LINK_VISIBLE);
    } else {
      ray.setAttribute("stroke", COLORS.LINK_HIDDEN);
      ray.setAttribute("stroke-dasharray", "2 2");
    }
    ray.setAttribute("stroke-width", "1.5");
    compassScopeSvg.appendChild(ray);

    // marker (green inside rim, red outside -> no LOS)
    const inside = elev > 0;
    const mark = document.createElementNS(NS, "circle");
    mark.setAttribute("cx", x.toString());
    mark.setAttribute("cy", y.toString());
    mark.setAttribute("r", COMPASS_CONFIG.MARKER_RADIUS.toString());
    mark.setAttribute(
      "fill",
      inside ? COLORS.SATELLITE_VISIBLE : COLORS.SATELLITE_HIDDEN
    );
    mark.setAttribute("stroke", "white");
    mark.setAttribute("stroke-width", "1");
    compassScopeSvg.appendChild(mark);
  }

  // Memoize the resize handler to prevent unnecessary re-renders
  const handleResize = useCallback(() => {
    if (compassScopeSvg.current) {
      drawCompassScope(
        compassScopeSvg.current,
        azTrueDeg,
        elevDeg,
        hdgDegCardinal
      );
    }
  }, [azTrueDeg, elevDeg, hdgDegCardinal]);

  useEffect(() => {
    if (compassScopeSvg.current) {
      drawCompassScope(
        compassScopeSvg.current,
        azTrueDeg,
        elevDeg,
        hdgDegCardinal
      );
    }

    window.addEventListener("resize", handleResize);
     
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [azTrueDeg, hdgDegCardinal, elevDeg, handleResize]);

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
