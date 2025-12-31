import { useRef, useEffect } from "react";
import type { DisplayFootprint, GeometryResult, UnitKey } from "../../types";
import {
  setupCanvas,
  calculateCanvasScale,
  drawFootprintGrid,
  drawCenteredFootprint,
  drawCenterMarker,
  drawAnnotations,
  drawAspectRatio,
  drawHorizonWarning,
} from "./CanvasUtils";
import { calculateHorizonDistance } from "./geometry";

interface GraphCanvasProps {
  footprints: DisplayFootprint[];
  geometry: GeometryResult;
  displayUnit: UnitKey;
  altitudeFt: number; // Aircraft altitude MSL in feet
}

export function GraphCanvas({
  footprints,
  geometry,
  displayUnit,
  altitudeFt,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = setupCanvas(canvasRef.current);
    if (!ctx || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, w, h);

    // Check if we have valid geometry and footprint
    if (!geometry.valid || footprints.length === 0 || !footprints[0]?.footprint) {
      // Draw placeholder message
      ctx.font = "12px 'Roboto Mono', monospace";
      ctx.fillStyle = "rgba(156, 163, 175, 0.6)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No valid footprint", w / 2, h / 2);
      return;
    }

    const footprint = footprints[0].footprint;

    // Calculate auto-scale to fit footprint
    const scale = calculateCanvasScale(footprint, w, h);

    // Calculate horizon distance for this altitude
    const horizonDistanceFt = calculateHorizonDistance(altitudeFt);

    // Draw grid
    drawFootprintGrid(ctx, w, h, footprint, scale, displayUnit);

    // Draw footprint polygon
    const bounds = drawCenteredFootprint(ctx, w, h, footprint, scale);

    // Draw center marker (aim point)
    drawCenterMarker(ctx, w, h);

    // Draw annotations (widths, depth)
    drawAnnotations(ctx, w, h, footprint, bounds, displayUnit);

    // Draw aspect ratio if elongated
    drawAspectRatio(ctx, w, h, footprint);

    // Draw horizon warning if FOV center is beyond horizon
    drawHorizonWarning(ctx, w, horizonDistanceFt, footprint.centerGround, displayUnit);
  }, [footprints, geometry, displayUnit, altitudeFt]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const ctx = setupCanvas(canvasRef.current);
      if (!ctx || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, w, h);

      if (!geometry.valid || footprints.length === 0 || !footprints[0]?.footprint) {
        ctx.font = "12px 'Roboto Mono', monospace";
        ctx.fillStyle = "rgba(156, 163, 175, 0.6)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No valid footprint", w / 2, h / 2);
        return;
      }

      const footprint = footprints[0].footprint;
      const scale = calculateCanvasScale(footprint, w, h);
      const horizonDistanceFt = calculateHorizonDistance(altitudeFt);

      drawFootprintGrid(ctx, w, h, footprint, scale, displayUnit);
      const bounds = drawCenteredFootprint(ctx, w, h, footprint, scale);
      drawCenterMarker(ctx, w, h);
      drawAnnotations(ctx, w, h, footprint, bounds, displayUnit);
      drawAspectRatio(ctx, w, h, footprint);
      drawHorizonWarning(ctx, w, horizonDistanceFt, footprint.centerGround, displayUnit);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [footprints, geometry, displayUnit, altitudeFt]);

  return (
    <div className="flex items-center justify-center p-3 rounded-md">
      <canvas
        ref={canvasRef}
        className="h-[350px] w-[350px] bg-black/35 border border-gray-600 rounded-md"
      />
    </div>
  );
}
