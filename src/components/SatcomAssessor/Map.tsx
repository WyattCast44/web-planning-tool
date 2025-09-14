import { useRef, useEffect, useCallback } from "react";
import { degToRad } from "../../core/math";
import earth from "../../assets/earth.jpg";

const MAP_CONFIG = {
  TRIANGLE_HEIGHT: 8,
  TRIANGLE_WIDTH: 6,
  MARKER_RADIUS: 4,
  FONT_SIZE: 8,
} as const;

const COLORS = {
  AIRCRAFT: "rgba(56,189,248,.7)",
  SATELLITE_VISIBLE: "rgba(16,185,129,.95)",
  SATELLITE_HIDDEN: "rgba(239,68,68,.95)",
  LINK_VISIBLE: "rgba(16,185,129,.5)",
  LINK_HIDDEN: "rgba(239,68,68,.5)",
  GRID: "rgba(0,0,0,.35)",
} as const;

interface MapProps {
  acLatitude: number;
  acLongitude: number;
  satLongitude: number;
  visible: boolean;
  acHeading: number;
}

export function Map({
  acLatitude,
  acLongitude,
  satLongitude,
  visible,
  acHeading,
}: MapProps) {
  const mapSvg = useRef<SVGSVGElement>(null);

  function drawMap(
    mapSvg: SVGSVGElement,
    acLatitude: number,
    acLongitude: number,
    satLon: number,
    visible: boolean,
    acHeading: number
  ) {
    // Add fallback dimensions to prevent rendering issues
    const w = Math.max(mapSvg.clientWidth, 300);
    const h = Math.max(mapSvg.clientHeight, 150);
    mapSvg.innerHTML = "";

    const NS = "http://www.w3.org/2000/svg";

    const base = document.createElementNS(NS, "image");
    base.setAttribute("href", earth);
    base.setAttribute("x", "0");
    base.setAttribute("y", "0");
    base.setAttribute("width", w.toString());
    base.setAttribute("height", h.toString());
    base.setAttribute("preserveAspectRatio", "none");
    // apply a filter to the image to make it darker
    base.setAttribute("filter", "brightness(0.5)");

    mapSvg.appendChild(base);

    // generate grid
    for (let lat = -75; lat <= 75; lat += 15) {
      const y = ((90 - lat) / 180) * h;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", `M0,${y} H${w}`);
      p.setAttribute("stroke", COLORS.GRID);
      mapSvg.appendChild(p);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", "5");
      t.setAttribute("y", (y + 3).toString());
      t.setAttribute("fill", "rgba(0,0,0,.85)");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", MAP_CONFIG.FONT_SIZE.toString());
      t.textContent = lat.toString();
      mapSvg.appendChild(t);
    }

    // longitude lines
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = ((lon + 180) / 360) * w;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", `M${x},0 V${h}`);
      p.setAttribute("stroke", COLORS.GRID);
      mapSvg.appendChild(p);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", x.toString());
      t.setAttribute("y", "10");
      t.setAttribute("fill", "rgba(0,0,0,.85)");
      t.setAttribute("font-size", MAP_CONFIG.FONT_SIZE.toString());
      // center the text
      t.setAttribute("text-anchor", "middle");
      t.textContent = lon.toString();
      mapSvg.appendChild(t);
    }

    const proj = (lat: number, lon: number) => ({
      x: ((lon + 180) / 360) * w,
      y: ((90 - lat) / 180) * h,
    });

    const aircraft = proj(acLatitude, acLongitude);
    const ss = proj(0, satLon);
    const link = document.createElementNS(NS, "path");
    link.setAttribute("d", `M${aircraft.x},${aircraft.y} L${ss.x},${ss.y}`);
    // make the link a dashed line that is green if the link is visible
    // and red if the link is not visible
    link.setAttribute(
      "stroke",
      visible ? COLORS.LINK_VISIBLE : COLORS.LINK_HIDDEN
    );
    // if the link is visible, make it a solid line
    // if the link is not visible, make it a dashed line
    if (visible) {
      link.setAttribute("stroke-dasharray", "0");
    } else {
      link.setAttribute("stroke-dasharray", "2 2");
    }
    link.setAttribute("stroke-width", "1.5");
    mapSvg.appendChild(link);

    // satellite marker, make it a circle with a radius of 4
    const s = document.createElementNS(NS, "circle");
    s.setAttribute("cx", ss.x.toString());
    s.setAttribute("cy", ss.y.toString());
    s.setAttribute("r", MAP_CONFIG.MARKER_RADIUS.toString());
    // make the fill a solid green if the link is visible
    // and a solid red if the link is not visible
    if (visible) {
      s.setAttribute("fill", COLORS.SATELLITE_VISIBLE);
    } else {
      s.setAttribute("fill", COLORS.SATELLITE_HIDDEN);
    }
    // add a white stroke
    s.setAttribute("stroke", "white");
    s.setAttribute("stroke-width", "1");
    mapSvg.appendChild(s);

    const a = document.createElementNS(NS, "path");
    // aircraft marker, make it a triangle rotated to the heading
    const aH = degToRad(90 - acHeading);
    const triangleHeight = MAP_CONFIG.TRIANGLE_HEIGHT;
    const triangleWidth = MAP_CONFIG.TRIANGLE_WIDTH;

    // For an isosceles triangle, the centroid is 1/3 of the height from the base
    // So we need to offset the triangle so its centroid is at the aircraft position
    const centroidOffset = triangleHeight / 3; // distance from base to centroid

    // Calculate triangle vertices relative to aircraft position
    // Point 1: tip pointing to heading (forward) - 2/3 of height from centroid
    const tipX = aircraft.x + ((triangleHeight * 2) / 3) * Math.cos(aH);
    const tipY = aircraft.y - ((triangleHeight * 2) / 3) * Math.sin(aH);

    // Point 2: left base vertex (perpendicular to heading) - 1/3 of height back from centroid
    const leftX =
      aircraft.x -
      centroidOffset * Math.cos(aH) -
      (triangleWidth / 2) * Math.cos(aH + Math.PI / 2);
    const leftY =
      aircraft.y +
      centroidOffset * Math.sin(aH) +
      (triangleWidth / 2) * Math.sin(aH + Math.PI / 2);

    // Point 3: right base vertex (perpendicular to heading) - 1/3 of height back from centroid
    const rightX =
      aircraft.x -
      centroidOffset * Math.cos(aH) -
      (triangleWidth / 2) * Math.cos(aH - Math.PI / 2);
    const rightY =
      aircraft.y +
      centroidOffset * Math.sin(aH) +
      (triangleWidth / 2) * Math.sin(aH - Math.PI / 2);

    a.setAttribute(
      "d",
      `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`
    );
    a.setAttribute("fill", COLORS.AIRCRAFT);
    a.setAttribute("stroke", "rgba(0,0,0,.80)");
    a.setAttribute("stroke-width", "1");
    mapSvg.appendChild(a);
  }

  // Memoize the resize handler to prevent unnecessary re-renders
  const handleResize = useCallback(() => {
    if (mapSvg.current) {
      drawMap(mapSvg.current, acLatitude, acLongitude, satLongitude, visible, acHeading);
    }
  }, [acLatitude, acLongitude, satLongitude, visible, acHeading]);

  useEffect(() => {
    if (mapSvg.current) {
      drawMap(mapSvg.current, acLatitude, acLongitude, satLongitude, visible, acHeading);
    }
    
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [acLatitude, acLongitude, satLongitude, visible, acHeading, handleResize]);

  return (
    <div className="select-none overflow-hidden">
      <svg id="map" className="rounded" ref={mapSvg}></svg>
    </div>
  );
}
