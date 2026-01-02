/**
 * Winded Vector Canvas Utilities
 * Uses shared canvas primitives from core/canvas
 */

import { degCardinalToDegMath, degToRad } from "../../core/math";
import {
  setupCanvas as setupCanvasBase,
  drawAircraftSymbol,
  drawCenteredGrid,
  calculateGridSpacing,
  drawCompassOverlay as drawCompassOverlayBase,
} from "../../core/canvas";

// Re-export setupCanvas from shared
export const setupCanvas = setupCanvasBase;

// ============================================================================
// COMPASS OVERLAY (wrapper with WindedVector-specific defaults)
// ============================================================================

export function drawCompassOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  acHeadingMath: number,
  showCompass: boolean,
  courseDegCardinalMath: number
): void {
  if (!showCompass) return;

  drawCompassOverlayBase(ctx, w, h, acHeadingMath, courseDegCardinalMath, {
    tickColor: "rgba(52, 211, 153, 0.3)",
    labelColor: "rgba(52, 211, 153, 0.5)",
    headingIndicatorColor: "rgba(56, 189, 248, 0.7)",
    courseIndicatorColor: "rgba(255, 0, 255, 0.9)",
  });
}

// ============================================================================
// AIRCRAFT
// ============================================================================

export function drawAircraft(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  acHeadingDeg: number
): void {
  drawAircraftSymbol(ctx, w, h, acHeadingDeg, {
    height: 20,
    width: 12,
  });
}

// ============================================================================
// GRID
// ============================================================================

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bounds: number
): { scaleX: number; scaleY: number } {
  // Use dynamic grid spacing based on scale
  const gridSpacing = calculateGridSpacing(bounds);
  
  return drawCenteredGrid(ctx, w, h, bounds, gridSpacing, {
    majorLineColor: "rgba(52, 211, 153, 0.35)",
    minorLineColor: "rgba(52, 211, 153, 0.12)",
    showLabels: true,
    labelColor: "rgba(52, 211, 153, 0.5)",
    font: "10px 'Roboto Mono', monospace",
  });
}

// ============================================================================
// COURSE LINES
// ============================================================================

export function drawCourseLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scaleX: number,
  scaleY: number,
  showCourse: boolean,
  gs: number,
  courseDegCardinal: number,
  acHeadingMath: number
): void {
  if (!showCourse) return;

  const timeIncrement = 1; // minutes
  const distanceTraveledNmi = (gs / 60) * timeIncrement;
  const courseDegCardinalMath = degCardinalToDegMath(courseDegCardinal);

  // Convert course to radians for Math.cos/sin
  const courseRad = degToRad(courseDegCardinalMath);

  // Start at the center (aircraft position)
  const centerX = w / 2;
  const centerY = h / 2;

  // Scale the distance to match the grid system
  const scaledDistance = distanceTraveledNmi * scaleX;

  // Calculate end position using scaled distance and proper coordinate system
  const courseLineEndX = centerX + scaledDistance * Math.cos(courseRad);
  const courseLineEndY = centerY - scaledDistance * Math.sin(courseRad);

  // Draw course line (magenta dashed)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(courseLineEndX, courseLineEndY);
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(255, 0, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw heading line from the aircraft aligned to the heading
  const headingLineEndX =
    centerX + scaledDistance * Math.cos(degToRad(acHeadingMath));
  const headingLineEndY =
    centerY - scaledDistance * Math.sin(degToRad(acHeadingMath));

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(headingLineEndX, headingLineEndY);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Reset dash pattern
  ctx.setLineDash([]);
}
