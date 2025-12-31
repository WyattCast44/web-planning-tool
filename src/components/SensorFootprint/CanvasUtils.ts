/**
 * Sensor Footprint Canvas Utilities
 * Footprint-centered view with auto-scaling
 */

import { setupCanvas as setupCanvasBase, calculateGridSpacing } from "../../core/canvas";
import type { FootprintResult, UnitKey } from "../../types";
import { UNITS } from "../../types";
import { convertFromFeet, convertToFeet, formatValue } from "./geometry";

// Re-export setupCanvas from shared
export { setupCanvasBase as setupCanvas };

// Canvas padding as fraction of canvas size
const CANVAS_PADDING = 0.12;

// Colors
const COLORS = {
  grid: {
    major: "rgba(52, 211, 153, 0.35)",
    minor: "rgba(52, 211, 153, 0.12)",
    label: "rgba(52, 211, 153, 0.5)",
  },
  footprint: {
    fill: "rgba(52, 211, 153, 0.15)",
    stroke: "rgba(52, 211, 153, 0.7)",
  },
  target: {
    stroke: "rgba(248, 113, 113, 0.8)",
    fill: "rgba(248, 113, 113, 0.3)",
  },
  annotation: {
    text: "rgba(156, 163, 175, 0.9)", // gray-400
    widthNear: "rgba(52, 211, 153, 0.8)", // emerald
    widthFar: "rgba(56, 189, 248, 0.8)", // sky
    depth: "rgba(251, 191, 36, 0.8)", // amber
    aspect: "rgba(167, 139, 250, 0.8)", // violet
  },
  warning: {
    text: "rgba(251, 146, 60, 0.95)", // orange-400
    bg: "rgba(251, 146, 60, 0.15)",
    border: "rgba(251, 146, 60, 0.5)",
    horizon: "rgba(251, 146, 60, 0.7)", // horizon line
  },
};

// ============================================================================
// AUTO-SCALE CALCULATION
// ============================================================================

/**
 * Calculate scale factor to fit footprint in canvas with padding
 * Returns pixels per foot
 */
export function calculateCanvasScale(
  footprint: FootprintResult,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = CANVAS_PADDING
): number {
  const footprintDepth = footprint.farGround - footprint.nearGround;
  const footprintMaxWidth = Math.max(footprint.nearWidth, footprint.farWidth);

  // Handle edge cases
  if (footprintDepth <= 0 || footprintMaxWidth <= 0) {
    return 1;
  }

  // Available canvas space (with padding)
  const availableWidth = canvasWidth * (1 - 2 * padding);
  const availableHeight = canvasHeight * (1 - 2 * padding);

  // Calculate scale to fit both dimensions (pixels per foot)
  const scaleX = availableWidth / footprintMaxWidth;
  const scaleY = availableHeight / footprintDepth;

  // Use the smaller scale to ensure footprint fits
  return Math.min(scaleX, scaleY);
}

// ============================================================================
// GRID DRAWING (footprint-centered)
// ============================================================================

/**
 * Draw grid centered on footprint
 */
export function drawFootprintGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  footprint: FootprintResult,
  scale: number,
  displayUnit: UnitKey
): void {
  const centerX = w / 2;
  const centerY = h / 2;

  // Calculate footprint center in ground coordinates
  const footprintCenterY = (footprint.nearGround + footprint.farGround) / 2;

  // Calculate grid extent in feet
  const visibleWidthFt = w / scale;
  const visibleHeightFt = h / scale;

  // Convert to display units for grid spacing calculation
  const visibleWidthUnits = convertFromFeet(visibleWidthFt, displayUnit);
  const gridSpacing = calculateGridSpacing(visibleWidthUnits / 2);
  const gridSpacingFt = convertToFeet(gridSpacing, displayUnit);

  // Draw minor grid lines
  ctx.strokeStyle = COLORS.grid.minor;
  ctx.lineWidth = 1;

  // Vertical lines (cross-track)
  const numVertLines = Math.ceil(visibleWidthFt / gridSpacingFt / 2);
  for (let i = -numVertLines; i <= numVertLines; i++) {
    if (i === 0) continue;
    const offsetFt = i * gridSpacingFt;
    const px = centerX + offsetFt * scale;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }

  // Horizontal lines (along-track / depth)
  const numHorizLines = Math.ceil(visibleHeightFt / gridSpacingFt / 2);
  for (let i = -numHorizLines; i <= numHorizLines; i++) {
    if (i === 0) continue;
    const offsetFt = i * gridSpacingFt;
    // Y offset from footprint center
    const py = centerY - offsetFt * scale;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }

  // Draw center axes (stronger)
  ctx.strokeStyle = COLORS.grid.major;
  ctx.lineWidth = 1;

  // Vertical center line
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, h);
  ctx.stroke();

  // Horizontal center line (at footprint center)
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(w, centerY);
  ctx.stroke();
}

// ============================================================================
// FOOTPRINT DRAWING (centered)
// ============================================================================

/**
 * Draw the footprint polygon centered in canvas
 * Near edge at bottom, far edge at top
 */
export function drawCenteredFootprint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  footprint: FootprintResult,
  scale: number
): { nearY: number; farY: number; nearWidth: number; farWidth: number } {
  const centerX = w / 2;
  const centerY = h / 2;

  // Calculate footprint center in ground coordinates
  const footprintCenterY = (footprint.nearGround + footprint.farGround) / 2;

  // Calculate corner positions in canvas coordinates
  // Near edge at bottom (positive Y in canvas), far edge at top (negative Y in canvas)
  const nearOffsetY = (footprint.nearGround - footprintCenterY) * scale;
  const farOffsetY = (footprint.farGround - footprintCenterY) * scale;

  const nearY = centerY - nearOffsetY; // Near at bottom
  const farY = centerY - farOffsetY; // Far at top

  const nearHalfWidth = (footprint.nearWidth / 2) * scale;
  const farHalfWidth = (footprint.farWidth / 2) * scale;

  const corners = [
    { x: centerX - nearHalfWidth, y: nearY }, // nearLeft (bottom-left)
    { x: centerX + nearHalfWidth, y: nearY }, // nearRight (bottom-right)
    { x: centerX + farHalfWidth, y: farY }, // farRight (top-right)
    { x: centerX - farHalfWidth, y: farY }, // farLeft (top-left)
  ];

  // Fill
  ctx.fillStyle = COLORS.footprint.fill;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((c) => ctx.lineTo(c.x, c.y));
  ctx.closePath();
  ctx.fill();

  // Stroke
  ctx.strokeStyle = COLORS.footprint.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  return {
    nearY,
    farY,
    nearWidth: nearHalfWidth * 2,
    farWidth: farHalfWidth * 2,
  };
}

// ============================================================================
// TARGET MARKER (footprint center)
// ============================================================================

/**
 * Draw target crosshair at footprint center
 */
export function drawCenterMarker(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const centerX = w / 2;
  const centerY = h / 2;
  const size = 8;

  ctx.strokeStyle = COLORS.target.stroke;
  ctx.lineWidth = 1.5;

  // Crosshair
  ctx.beginPath();
  ctx.moveTo(centerX - size, centerY);
  ctx.lineTo(centerX + size, centerY);
  ctx.moveTo(centerX, centerY - size);
  ctx.lineTo(centerX, centerY + size);
  ctx.stroke();

  // Small circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.target.fill;
  ctx.fill();
  ctx.stroke();
}

// ============================================================================
// ANNOTATIONS
// ============================================================================

/**
 * Draw width and depth annotations
 */
export function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  footprint: FootprintResult,
  footprintBounds: { nearY: number; farY: number; nearWidth: number; farWidth: number },
  displayUnit: UnitKey
): void {
  const centerX = w / 2;
  const centerY = h / 2;
  const unitLabel = UNITS[displayUnit].label;

  ctx.font = "10px 'Roboto Mono', monospace";

  // Near width label (below near edge)
  const nearWidthValue = formatValue(convertFromFeet(footprint.nearWidth, displayUnit));
  ctx.fillStyle = COLORS.annotation.widthNear;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`Near: ${nearWidthValue} ${unitLabel}`, centerX, footprintBounds.nearY + 8);

  // Far width label (above far edge) - with horizon indicator if applicable
  ctx.textBaseline = "bottom";
  if (footprint.farEdgeAtHorizon) {
    // Far edge is at or beyond horizon - show warning
    ctx.fillStyle = COLORS.warning.text;
    ctx.fillText(`Far: → HORIZON (${footprint.farEdgeDepression.toFixed(1)}°)`, centerX, footprintBounds.farY - 8);
    
    // Draw dashed horizon line across far edge
    ctx.strokeStyle = COLORS.warning.horizon;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, footprintBounds.farY);
    ctx.lineTo(w, footprintBounds.farY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const farWidthValue = formatValue(convertFromFeet(footprint.farWidth, displayUnit));
    ctx.fillStyle = COLORS.annotation.widthFar;
    ctx.fillText(`Far: ${farWidthValue} ${unitLabel}`, centerX, footprintBounds.farY - 8);
  }

  // Center width label (at vertical center, offset to the left)
  const centerWidthValue = formatValue(convertFromFeet(footprint.centerWidth, displayUnit));
  const leftEdge = centerX - Math.max(footprintBounds.nearWidth, footprintBounds.farWidth) / 2;
  ctx.fillStyle = COLORS.annotation.text;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`Ctr: ${centerWidthValue} ${unitLabel}`, leftEdge - 8, centerY);

  // Depth label (along right edge)
  const depth = footprint.farGround - footprint.nearGround;
  const depthValue = formatValue(convertFromFeet(depth, displayUnit));
  const depthMidY = (footprintBounds.nearY + footprintBounds.farY) / 2;

  ctx.fillStyle = COLORS.annotation.depth;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // Position to the right of the footprint
  const rightEdge = centerX + Math.max(footprintBounds.nearWidth, footprintBounds.farWidth) / 2;
  ctx.fillText(`${depthValue} ${unitLabel}`, rightEdge + 12, depthMidY);

  // Draw depth indicator line
  ctx.strokeStyle = COLORS.annotation.depth;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(rightEdge + 6, footprintBounds.nearY);
  ctx.lineTo(rightEdge + 6, footprintBounds.farY);
  ctx.stroke();

  // Arrow heads
  ctx.setLineDash([]);
  const arrowSize = 4;

  // Top arrow
  ctx.beginPath();
  ctx.moveTo(rightEdge + 6, footprintBounds.farY);
  ctx.lineTo(rightEdge + 6 - arrowSize, footprintBounds.farY + arrowSize);
  ctx.moveTo(rightEdge + 6, footprintBounds.farY);
  ctx.lineTo(rightEdge + 6 + arrowSize, footprintBounds.farY + arrowSize);
  ctx.stroke();

  // Bottom arrow
  ctx.beginPath();
  ctx.moveTo(rightEdge + 6, footprintBounds.nearY);
  ctx.lineTo(rightEdge + 6 - arrowSize, footprintBounds.nearY - arrowSize);
  ctx.moveTo(rightEdge + 6, footprintBounds.nearY);
  ctx.lineTo(rightEdge + 6 + arrowSize, footprintBounds.nearY - arrowSize);
  ctx.stroke();
}

/**
 * Draw warning banner when FOV center is beyond visual horizon
 */
export function drawHorizonWarning(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonDistanceFt: number,
  centerGroundFt: number,
  displayUnit: UnitKey
): void {
  if (centerGroundFt <= horizonDistanceFt) return; // No warning needed
  
  const unitLabel = UNITS[displayUnit].label;
  const horizonDist = formatValue(convertFromFeet(horizonDistanceFt, displayUnit));
  const centerDist = formatValue(convertFromFeet(centerGroundFt, displayUnit));
  
  const warningText = `⚠ FOV CENTER BEYOND HORIZON`;
  const detailText = `Center: ${centerDist} ${unitLabel} | Horizon: ${horizonDist} ${unitLabel}`;
  
  ctx.font = "bold 11px 'Roboto Mono', monospace";
  const warningWidth = ctx.measureText(warningText).width;
  ctx.font = "9px 'Roboto Mono', monospace";
  const detailWidth = ctx.measureText(detailText).width;
  
  const boxWidth = Math.max(warningWidth, detailWidth) + 24;
  const boxHeight = 40;
  const boxX = (w - boxWidth) / 2;
  const boxY = 8;
  
  // Background
  ctx.fillStyle = COLORS.warning.bg;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  
  // Border
  ctx.strokeStyle = COLORS.warning.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
  
  // Warning text
  ctx.fillStyle = COLORS.warning.text;
  ctx.font = "bold 11px 'Roboto Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(warningText, w / 2, boxY + 8);
  
  // Detail text
  ctx.font = "9px 'Roboto Mono', monospace";
  ctx.fillText(detailText, w / 2, boxY + 24);
}

/**
 * Draw aspect ratio indicator when elongation is significant
 */
export function drawAspectRatio(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  footprint: FootprintResult
): void {
  const depth = footprint.farGround - footprint.nearGround;
  const avgWidth = (footprint.nearWidth + footprint.farWidth) / 2;

  // Only show if aspect ratio > 2:1
  const aspectRatio = depth / avgWidth;
  if (aspectRatio <= 2 && avgWidth / depth <= 2) return;

  const aspectText =
    aspectRatio > 1
      ? `Aspect: ${aspectRatio.toFixed(1)}:1`
      : `Aspect: 1:${(1 / aspectRatio).toFixed(1)}`;

  ctx.font = "9px 'Roboto Mono', monospace";
  ctx.fillStyle = COLORS.annotation.aspect;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(aspectText, 8, 8);
}

