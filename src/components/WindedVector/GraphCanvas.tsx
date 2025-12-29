import { useRef, useEffect, useState } from "react";
import { useAppStore } from "../../store";
import { calculateGroundTrack, type Point } from "../../core/groundTrack";
import { degCardinalToDegMath } from "../../core/math";
import { setupCanvas, drawCompassOverlay, drawAircraft, drawGrid, drawCourseLines } from "./CanvasUtils";
import { drawTurnPath } from "./TurnPathRenderer";

type InputMode = "duration" | "headingChange";

interface GraphCanvasProps {
  showCourse: boolean;
  showCompass: boolean;
  angleOfBank: number;
  turnRate: number;
  durationSeconds: number;
  inputMode: InputMode;
  headingChangeDeg: number;
  showOppositeTurn: boolean;
  scale: number;
}

export function GraphCanvas({
  showCourse,
  showCompass,
  angleOfBank,
  turnRate,
  durationSeconds,
  inputMode,
  headingChangeDeg,
  showOppositeTurn,
  scale,
}: GraphCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const {
    hdgDegCardinal,
    gs,
    courseDegCardinal,
    windKts,
    windDegCardinal,
    ktas,
    altKft,
  } = useAppStore();
  const [points, setPoints] = useState<Point[]>([]);
  const [oppositePoints, setOppositePoints] = useState<Point[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate ground track when parameters change
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    try {
      // Standard gravity at sea level in ft/s²
      const gravityFtSecS2 = 32.174;

      // Calculate main track
      const result = calculateGroundTrack({
        ktas: ktas,
        durationSeconds: durationSeconds,
        rollRateDegSec: turnRate,
        startingHdgDegCardinal: hdgDegCardinal,
        startingAngleOfBankDeg: 0, // Start from level flight
        maxAngleOfBankDeg: angleOfBank,
        windDegCardinal: windDegCardinal,
        windSpeedKts: windKts,
        gravityFtSecS2: gravityFtSecS2,
        startingPosition: { x: 0, y: 0 }, // Start at origin
        ...(inputMode === "headingChange" && { headingChangeDeg: headingChangeDeg }),
      });

      setPoints(result);

      // Calculate opposite turn track if enabled
      if (showOppositeTurn) {
        const oppositeResult = calculateGroundTrack({
          ktas: ktas,
          durationSeconds: durationSeconds,
          rollRateDegSec: turnRate,
          startingHdgDegCardinal: hdgDegCardinal,
          startingAngleOfBankDeg: 0, // Start from level flight
          maxAngleOfBankDeg: -angleOfBank, // Invert the bank angle
          windDegCardinal: windDegCardinal,
          windSpeedKts: windKts,
          gravityFtSecS2: gravityFtSecS2,
          startingPosition: { x: 0, y: 0 }, // Start at origin
          ...(inputMode === "headingChange" && { headingChangeDeg: headingChangeDeg }),
        });
        setOppositePoints(oppositeResult);
      } else {
        setOppositePoints([]);
      }

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      setPoints([]);
      setOppositePoints([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    hdgDegCardinal,
    gs,
    courseDegCardinal,
    windKts,
    windDegCardinal,
    durationSeconds,
    inputMode,
    headingChangeDeg,
    angleOfBank,
    turnRate,
    ktas,
    altKft,
    showOppositeTurn,
  ]);

  function drawGraph(
    ctx: CanvasRenderingContext2D,
    acHeadingDeg: number,
    showCompass: boolean
  ) {
    if (!canvas.current) return;

    const rect = canvas.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);

    // Draw grid and get scaling factors
    const { scaleX, scaleY } = drawGrid(ctx, w, h, scale);

    // Draw aircraft
    drawAircraft(ctx, w, h, acHeadingDeg);

    // Convert heading to math degrees for compass
    const acHeadingMath = degCardinalToDegMath(acHeadingDeg);
    const courseDegCardinalMath = degCardinalToDegMath(courseDegCardinal);

    // Draw compass overlay
    drawCompassOverlay(
      ctx,
      w,
      h,
      acHeadingMath,
      showCompass,
      courseDegCardinalMath
    );

    // Draw course lines
    drawCourseLines(
      ctx,
      w,
      h,
      scaleX,
      scaleY,
      showCourse,
      gs,
      courseDegCardinal,
      acHeadingMath
    );

    // Handle loading and error states
    if (isLoading) {
      // Draw loading indicator
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Calculating turn radius...", w / 2, h / 2);
      return;
    }

    if (error) {
      // Draw error message
      ctx.fillStyle = "rgba(255,0,0,0.8)";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Error: ${error}`, w / 2, h / 2);
      return;
    }

    if (points.length === 0) {
      return; // No points to draw
    }

    // Draw turn paths
    drawTurnPath(ctx, {
      points,
      oppositePoints,
      showOppositeTurn,
      scaleX,
      scaleY,
      w,
      h,
    });
  }

  function handleResize() {
    const ctx = setupCanvas(canvas.current);
    if (ctx) {
      drawGraph(ctx, hdgDegCardinal, showCompass);
    }
  }

  useEffect(() => {
    const ctx = setupCanvas(canvas.current);
    if (ctx) {
      drawGraph(ctx, hdgDegCardinal, showCompass);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [
    hdgDegCardinal,
    showCourse,
    gs,
    courseDegCardinal,
    showCompass,
    points,
    isLoading,
    error,
    scale,
  ]);

  return (
    <div className="flex items-center justify-center p-3 rounded-md">
      <canvas
        id="windedVectorGraph"
        ref={canvas}
        className="h-[350px] w-[350px] bg-black/35 border border-gray-600 rounded-md"
      ></canvas>
    </div>
  );
}
