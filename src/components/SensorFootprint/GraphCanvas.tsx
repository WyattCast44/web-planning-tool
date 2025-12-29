import { useRef, useEffect } from "react";
import { useAppStore } from "../../store";
import type { DisplayFootprint, GeometryResult, UnitKey } from "./types";
import {
  setupCanvas,
  drawGrid,
  drawCompass,
  drawAircraft,
  drawAzimuthLine,
  drawTargetMarker,
  drawFootprints,
} from "./CanvasUtils";

interface GraphCanvasProps {
  footprints: DisplayFootprint[];
  geometry: GeometryResult;
  scale: number;
  displayUnit: UnitKey;
  sensorAzimuth: number;
  groundRangeFt: number;
}

export function GraphCanvas({
  footprints,
  geometry,
  scale,
  displayUnit,
  sensorAzimuth,
  groundRangeFt,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { hdgDegCardinal } = useAppStore();

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

    // Draw grid and get scale factors
    const { scaleX, scaleY } = drawGrid(ctx, w, h, scale, displayUnit);

    // Draw compass rose
    drawCompass(ctx, w, h, hdgDegCardinal);

    // Draw aircraft at center
    drawAircraft(ctx, w, h, hdgDegCardinal);

    // Draw sensor azimuth line
    drawAzimuthLine(ctx, w, h, hdgDegCardinal, sensorAzimuth);

    // Draw target marker
    if (geometry.valid) {
      drawTargetMarker(
        ctx,
        w,
        h,
        groundRangeFt,
        hdgDegCardinal,
        sensorAzimuth,
        scaleX,
        scaleY
      );
    }

    // Draw footprints
    if (footprints.length > 0) {
      drawFootprints(ctx, w, h, footprints, scaleX, scaleY);
    }
  }, [
    footprints,
    geometry,
    scale,
    displayUnit,
    sensorAzimuth,
    groundRangeFt,
    hdgDegCardinal,
  ]);

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

      const { scaleX, scaleY } = drawGrid(ctx, w, h, scale, displayUnit);
      drawCompass(ctx, w, h, hdgDegCardinal);
      drawAircraft(ctx, w, h, hdgDegCardinal);
      drawAzimuthLine(ctx, w, h, hdgDegCardinal, sensorAzimuth);

      if (geometry.valid) {
        drawTargetMarker(
          ctx,
          w,
          h,
          groundRangeFt,
          hdgDegCardinal,
          sensorAzimuth,
          scaleX,
          scaleY
        );
      }

      if (footprints.length > 0) {
        drawFootprints(ctx, w, h, footprints, scaleX, scaleY);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    footprints,
    geometry,
    scale,
    displayUnit,
    sensorAzimuth,
    groundRangeFt,
    hdgDegCardinal,
  ]);

  return (
    <div className="flex items-center justify-center p-3 rounded-md">
      <canvas
        ref={canvasRef}
        className="h-[350px] w-[350px] bg-black/35 border border-gray-600 rounded-md"
      />
    </div>
  );
}

