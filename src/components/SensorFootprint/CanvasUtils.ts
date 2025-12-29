/**
 * Sensor Footprint Canvas Utilities
 * Uses shared canvas primitives from core/canvas
 */

import { degToRad } from "../../core/math";
import {
  setupCanvas as setupCanvasBase,
  drawAircraftSymbol,
  drawScaleBar as drawScaleBarBase,
  drawDashedLine,
  drawCompassOverlay as drawCompassOverlayBase,
} from "../../core/canvas";
import type { DisplayFootprint, UnitKey } from "./types";
import { UNITS } from "./types";
import { convertFromFeet, convertToFeet, formatValue } from "./geometry";

// Re-export setupCanvas from shared
export { setupCanvasBase as setupCanvas };

// ============================================================================
// GRID (with unit-aware scaling and axis labels)
// ============================================================================

/**
 * Calculate appropriate grid spacing based on scale
 * Aims for 4-10 grid lines per half of the display
 */
function calculateGridSpacing(scale: number): number {
  if (scale <= 5) return 1;
  if (scale <= 10) return 2;
  if (scale <= 25) return 5;
  if (scale <= 50) return 10;
  if (scale <= 100) return 20;
  return 50;
}

/**
 * Draw grid with scale (aircraft centered) for sensor footprint display
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  displayUnit: UnitKey
): { scaleX: number; scaleY: number } {
  const majorLineColor = "rgba(52, 211, 153, 0.35)";
  const minorLineColor = "rgba(52, 211, 153, 0.12)";
  const labelColor = "rgba(52, 211, 153, 0.5)";

  const centerX = w / 2;
  const centerY = h / 2;

  // Scale in feet for internal calculations
  const scaleFt = convertToFeet(scale, displayUnit);
  const scaleX = w / (2 * scaleFt);
  const scaleY = h / (2 * scaleFt);

  // Dynamic grid spacing based on scale
  const gridSpacing = calculateGridSpacing(scale);
  const gridSpacingFt = convertToFeet(gridSpacing, displayUnit);

  // Calculate number of grid lines needed (symmetric from center)
  const numLines = Math.floor(scale / gridSpacing);

  // Draw minor grid lines
  ctx.strokeStyle = minorLineColor;
  ctx.lineWidth = 1;

  // Draw grid lines symmetrically from center
  for (let i = -numLines; i <= numLines; i++) {
    if (i === 0) continue; // Skip center, drawn as major axis

    const offsetFt = i * gridSpacingFt;

    // Vertical line
    const px = centerX + offsetFt * scaleX;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();

    // Horizontal line
    const py = centerY - offsetFt * scaleY;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }

  // Draw main axes (stronger)
  ctx.strokeStyle = majorLineColor;
  ctx.lineWidth = 1;

  // Vertical axis (N-S)
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, h);
  ctx.stroke();

  // Horizontal axis (E-W)
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(w, centerY);
  ctx.stroke();

  // Draw axis labels
  ctx.font = "9px 'Roboto Mono', monospace";
  ctx.fillStyle = labelColor;

  // Draw labels symmetrically from center
  for (let i = -numLines; i <= numLines; i++) {
    if (i === 0) continue;

    const labelVal = i * gridSpacing;
    const offsetFt = i * gridSpacingFt;

    // X-axis label (East-West)
    const px = centerX + offsetFt * scaleX;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`${labelVal}`, px, centerY + 4);

    // Y-axis label (North-South)
    const py = centerY - offsetFt * scaleY;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${labelVal}`, w - 20, py);
  }


  return { scaleX, scaleY };
}

// ============================================================================
// COMPASS OVERLAY
// ============================================================================

/**
 * Draw compass rose overlay around the edge
 */
export function drawCompass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hdgDegCardinal: number
): void {
  // Convert to math angle for the shared function
  const hdgDegMath = 90 - hdgDegCardinal;

  drawCompassOverlayBase(ctx, w, h, hdgDegMath, undefined, {
    tickColor: "rgba(52, 211, 153, 0.3)",
    labelColor: "rgba(52, 211, 153, 0.5)",
    headingIndicatorColor: "rgba(56, 189, 248, 0.7)",
  });
}

// ============================================================================
// AIRCRAFT
// ============================================================================

/**
 * Draw aircraft symbol at center
 */
export function drawAircraft(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hdgDegCardinal: number
): void {
  drawAircraftSymbol(ctx, w, h, hdgDegCardinal, {
    height: 18,
    width: 10,
  });
}

// ============================================================================
// AZIMUTH LINE
// ============================================================================

/**
 * Draw sensor azimuth line from aircraft
 */
export function drawAzimuthLine(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hdgDegCardinal: number,
  sensorAzimuthRel: number
): void {
  const centerX = w / 2;
  const centerY = h / 2;

  // Absolute azimuth = heading + relative azimuth
  // Convert to math angle (0° = east, CCW positive)
  const absAzDeg = hdgDegCardinal + sensorAzimuthRel;
  const azDegMath = 90 - absAzDeg;

  const lineLength = Math.max(w, h);

  drawDashedLine(ctx, centerX, centerY, azDegMath, lineLength, "rgba(52, 211, 153, 0.3)");
}

// ============================================================================
// TARGET MARKER
// ============================================================================

/**
 * Draw target marker at ground range from aircraft along azimuth
 */
export function drawTargetMarker(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundRangeFt: number,
  hdgDegCardinal: number,
  sensorAzimuthRel: number,
  scaleX: number,
  scaleY: number
): void {
  const centerX = w / 2;
  const centerY = h / 2;

  const absAzDeg = hdgDegCardinal + sensorAzimuthRel;
  const azRad = degToRad(90 - absAzDeg);

  const tgtX = centerX + groundRangeFt * scaleX * Math.cos(azRad);
  const tgtY = centerY - groundRangeFt * scaleY * Math.sin(azRad);

  // X marker
  ctx.strokeStyle = "rgba(248, 113, 113, 0.6)"; // red-400
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(tgtX - 6, tgtY - 6);
  ctx.lineTo(tgtX + 6, tgtY + 6);
  ctx.moveTo(tgtX + 6, tgtY - 6);
  ctx.lineTo(tgtX - 6, tgtY + 6);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(tgtX, tgtY, 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(248, 113, 113, 0.8)";
  ctx.stroke();
}

// ============================================================================
// FOOTPRINTS
// ============================================================================

// Footprint colors for multi-sensor display
const FOOTPRINT_COLORS = [
  "rgba(52, 211, 153, 1)", // emerald-400 (primary)
  "rgba(56, 189, 248, 1)", // sky-400
  "rgba(251, 191, 36, 1)", // amber-400
  "rgba(244, 114, 182, 1)", // pink-400
  "rgba(167, 139, 250, 1)", // violet-400
  "rgba(74, 222, 128, 1)", // green-400
];

/**
 * Draw sensor footprint polygons
 * Footprint corners are already in world ENU coordinates (absolute azimuth applied)
 */
export function drawFootprints(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  footprints: DisplayFootprint[],
  scaleX: number,
  scaleY: number
): void {
  const centerX = w / 2;
  const centerY = h / 2;

  footprints.forEach((fp, idx) => {
    if (!fp || !fp.footprint) return;

    const color = FOOTPRINT_COLORS[idx % FOOTPRINT_COLORS.length];
    const corners = fp.footprint.corners;

    // Convert corners to canvas coordinates
    // Footprint corners are in ENU (x=East, y=North) with absolute azimuth already applied
    // Canvas: x increases right, y increases down
    const canvasCorners = corners.map((c) => ({
      x: centerX + c.x * scaleX,
      y: centerY - c.y * scaleY,
    }));

    // Fill
    ctx.fillStyle = color.replace("1)", "0.1)");
    ctx.beginPath();
    ctx.moveTo(canvasCorners[0].x, canvasCorners[0].y);
    canvasCorners.slice(1).forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.closePath();
    ctx.fill();

    // Stroke
    ctx.strokeStyle = color.replace("1)", "0.6)");
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

// ============================================================================
// SCALE BAR
// ============================================================================

/**
 * Draw scale bar in corner
 */
export function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  displayUnit: UnitKey
): void {
  const scaleFt = convertToFeet(scale, displayUnit);
  const scaleBarFt = scaleFt / 4;
  const pxPerFt = (w / 2 - 30) / scaleFt;
  const scaleBarPx = scaleBarFt * pxPerFt;
  const scaleBarVal = convertFromFeet(scaleBarFt, displayUnit);

  const label = `${formatValue(scaleBarVal)} ${UNITS[displayUnit].label}`;
  drawScaleBarBase(ctx, w, h, scaleBarPx, label, "rgba(52, 211, 153, 0.8)");
}
