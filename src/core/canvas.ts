/**
 * Shared canvas utilities for high-DPI rendering and common drawing primitives
 */

import { degToRad, degCardinalToDegMath } from "./math";

// ============================================================================
// CANVAS SETUP
// ============================================================================

/**
 * Setup canvas for high DPI displays
 * Handles device pixel ratio scaling for crisp rendering on retina displays
 */
export function setupCanvas(
  canvas: HTMLCanvasElement | null
): CanvasRenderingContext2D | null {
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  // Set the actual size in memory (scaled for pixel density)
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;

  // Scale the drawing context
  ctx.scale(dpr, dpr);

  // Set the display size (CSS pixels)
  canvas.style.width = displayWidth + "px";
  canvas.style.height = displayHeight + "px";

  return ctx;
}

// ============================================================================
// AIRCRAFT DRAWING
// ============================================================================

export interface AircraftDrawOptions {
  color?: string;
  strokeColor?: string;
  height?: number;
  width?: number;
}

const DEFAULT_AIRCRAFT_OPTIONS: Required<AircraftDrawOptions> = {
  color: "rgba(56, 189, 248, 1)", // sky-400
  strokeColor: "rgba(0, 0, 0, 0.8)",
  height: 20,
  width: 12,
};

/**
 * Draw an aircraft symbol (triangle) at the center of the canvas
 * pointing in the direction of hdgDegCardinal
 *
 * @param ctx Canvas rendering context
 * @param w Canvas width
 * @param h Canvas height
 * @param hdgDegCardinal Heading in cardinal degrees (0/360 = North, 90 = East)
 * @param options Optional styling options
 */
export function drawAircraftSymbol(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hdgDegCardinal: number,
  options: AircraftDrawOptions = {}
): void {
  const opts = { ...DEFAULT_AIRCRAFT_OPTIONS, ...options };

  const centerX = w / 2;
  const centerY = h / 2;

  // Convert cardinal heading to math angle (0° = east, CCW positive)
  const hdgMath = degCardinalToDegMath(hdgDegCardinal);
  const hdgRad = degToRad(hdgMath);

  // For an isosceles triangle, the centroid is 1/3 of the height from the base
  const centroidOffset = opts.height / 3;

  // Triangle vertices relative to center
  // Tip: 2/3 of height from centroid in heading direction
  const tipX = centerX + ((opts.height * 2) / 3) * Math.cos(hdgRad);
  const tipY = centerY - ((opts.height * 2) / 3) * Math.sin(hdgRad);

  // Left base vertex: perpendicular to heading
  const leftX =
    centerX -
    centroidOffset * Math.cos(hdgRad) -
    (opts.width / 2) * Math.cos(hdgRad + Math.PI / 2);
  const leftY =
    centerY +
    centroidOffset * Math.sin(hdgRad) +
    (opts.width / 2) * Math.sin(hdgRad + Math.PI / 2);

  // Right base vertex: perpendicular to heading
  const rightX =
    centerX -
    centroidOffset * Math.cos(hdgRad) -
    (opts.width / 2) * Math.cos(hdgRad - Math.PI / 2);
  const rightY =
    centerY +
    centroidOffset * Math.sin(hdgRad) +
    (opts.width / 2) * Math.sin(hdgRad - Math.PI / 2);

  // Draw the triangle
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();

  ctx.fillStyle = opts.color;
  ctx.fill();

  ctx.strokeStyle = opts.strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ============================================================================
// GRID DRAWING
// ============================================================================

export interface GridDrawOptions {
  majorLineColor?: string;
  minorLineColor?: string;
  showLabels?: boolean;
  labelColor?: string;
  font?: string;
}

const DEFAULT_GRID_OPTIONS: Required<GridDrawOptions> = {
  majorLineColor: "rgba(255, 255, 255, 0.45)",
  minorLineColor: "rgba(255, 255, 255, 0.15)",
  showLabels: true,
  labelColor: "rgba(255, 255, 255, 0.45)",
  font: "10px Arial",
};

/**
 * Calculate appropriate grid spacing based on scale
 * Aims for 4-10 grid lines per half of the display
 */
export function calculateGridSpacing(scale: number): number {
  if (scale <= 5) return 1;
  if (scale <= 10) return 2;
  if (scale <= 25) return 5;
  if (scale <= 50) return 10;
  if (scale <= 100) return 20;
  return 50;
}

/**
 * Draw a centered Cartesian grid with the origin at canvas center
 *
 * @param ctx Canvas rendering context
 * @param w Canvas width
 * @param h Canvas height
 * @param bounds The +/- extent of the grid (e.g., 10 means -10 to +10)
 * @param gridSpacing Spacing between grid lines in world units (use calculateGridSpacing for dynamic spacing)
 * @param options Optional styling options
 * @returns Scale factors { scaleX, scaleY } for converting world coords to pixels
 */
export function drawCenteredGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bounds: number,
  gridSpacing: number = 1,
  options: GridDrawOptions = {}
): { scaleX: number; scaleY: number } {
  const opts = { ...DEFAULT_GRID_OPTIONS, ...options };

  const centerX = w / 2;
  const centerY = h / 2;

  // Calculate scaling factors
  const scaleX = w / (2 * bounds);
  const scaleY = h / (2 * bounds);

  // Calculate number of grid lines needed (symmetric from center)
  const numLines = Math.floor(bounds / gridSpacing);

  // Draw minor grid lines
  ctx.strokeStyle = opts.minorLineColor;
  ctx.lineWidth = 1;

  // Draw grid lines and labels symmetrically from center
  for (let i = -numLines; i <= numLines; i++) {
    if (i === 0) continue; // Skip center, drawn as major axis

    const offset = i * gridSpacing;

    // Vertical line
    const px = centerX + offset * scaleX;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();

    // X-axis label
    if (opts.showLabels) {
      ctx.fillStyle = opts.labelColor;
      ctx.font = opts.font;
      ctx.textAlign = "center";
      ctx.fillText(offset.toString(), px, centerY + 12);
    }

    // Horizontal line
    const py = centerY - offset * scaleY;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();

    // Y-axis label
    if (opts.showLabels) {
      ctx.fillStyle = opts.labelColor;
      ctx.font = opts.font;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(offset.toString(), w - 14, py);
    }
  }

  // Draw main axes (stronger)
  ctx.strokeStyle = opts.majorLineColor;
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

  return { scaleX, scaleY };
}

// ============================================================================
// COMPASS OVERLAY
// ============================================================================

export interface CompassDrawOptions {
  tickColor?: string;
  labelColor?: string;
  headingIndicatorColor?: string;
  courseIndicatorColor?: string;
}

const DEFAULT_COMPASS_OPTIONS: Required<CompassDrawOptions> = {
  tickColor: "rgba(180, 220, 255, 0.4)",
  labelColor: "rgba(200, 255, 255, 0.5)",
  headingIndicatorColor: "rgba(56, 189, 248, 0.7)",
  courseIndicatorColor: "rgba(255, 0, 255, 0.9)",
};

/**
 * Draw a compass overlay around the edge of the canvas
 *
 * @param ctx Canvas rendering context
 * @param w Canvas width
 * @param h Canvas height
 * @param hdgDegMath Aircraft heading in math degrees
 * @param courseDegMath Course in math degrees (optional, for wind correction display)
 * @param options Optional styling options
 */
export function drawCompassOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hdgDegMath: number,
  courseDegMath?: number,
  options: CompassDrawOptions = {}
): void {
  const opts = { ...DEFAULT_COMPASS_OPTIONS, ...options };

  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(w, h) / 2 - 8;

  // Draw compass background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fill();
  ctx.strokeStyle = opts.tickColor.replace(/[\d.]+\)$/, "0.2)");
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw compass ticks and labels
  for (let angle = 0; angle < 360; angle += 10) {
    const isMajorTick = angle % 30 === 0;
    const tickLength = isMajorTick ? 12 : 6;
    const tickAngle = degToRad(90 - angle);

    const innerRadius = radius - tickLength;
    const outerRadius = radius;

    const x1 = centerX + innerRadius * Math.cos(tickAngle);
    const y1 = centerY - innerRadius * Math.sin(tickAngle);
    const x2 = centerX + outerRadius * Math.cos(tickAngle);
    const y2 = centerY - outerRadius * Math.sin(tickAngle);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = opts.tickColor;
    ctx.lineWidth = isMajorTick ? 2 : 1;
    ctx.stroke();

    // Labels (skip cardinal directions to avoid overlap with grid)
    if (isMajorTick && angle % 90 !== 0) {
      const labelRadius = radius - 20;
      const labelX = centerX + labelRadius * Math.cos(tickAngle);
      const labelY = centerY - labelRadius * Math.sin(tickAngle) + 3;

      ctx.fillStyle = opts.labelColor;
      ctx.font = "8px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(angle.toString(), labelX, labelY);
    }
  }

  // Draw heading indicator triangle
  const headingAngle = degToRad(hdgDegMath);
  const indicatorX = centerX + (radius - 5) * Math.cos(headingAngle);
  const indicatorY = centerY - (radius - 5) * Math.sin(headingAngle);

  ctx.beginPath();
  ctx.moveTo(indicatorX, indicatorY);
  ctx.lineTo(
    indicatorX - 8 * Math.cos(headingAngle - Math.PI / 6),
    indicatorY + 8 * Math.sin(headingAngle - Math.PI / 6)
  );
  ctx.lineTo(
    indicatorX - 8 * Math.cos(headingAngle + Math.PI / 6),
    indicatorY + 8 * Math.sin(headingAngle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = opts.headingIndicatorColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw course indicator if provided and different from heading
  if (courseDegMath !== undefined) {
    const windCorrectionAngle = courseDegMath - hdgDegMath;

    if (windCorrectionAngle !== 0 && windCorrectionAngle !== 360) {
      const courseAngle = degToRad(courseDegMath);
      const courseX = centerX + (radius - 5) * Math.cos(courseAngle);
      const courseY = centerY - (radius - 5) * Math.sin(courseAngle);

      ctx.beginPath();
      ctx.moveTo(courseX, courseY);
      ctx.lineTo(
        courseX - 8 * Math.cos(courseAngle - Math.PI / 6),
        courseY + 8 * Math.sin(courseAngle - Math.PI / 6)
      );
      ctx.lineTo(
        courseX - 8 * Math.cos(courseAngle + Math.PI / 6),
        courseY + 8 * Math.sin(courseAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = opts.courseIndicatorColor;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw arc between heading and course
      let normalizedAngle = windCorrectionAngle;
      while (normalizedAngle > 180) normalizedAngle -= 360;
      while (normalizedAngle < -180) normalizedAngle += 360;

      if (Math.abs(normalizedAngle) > 2) {
        const arcRadius = radius - 5;
        const startAngle = degToRad(90 - hdgDegMath - 90);
        const endAngle = degToRad(90 - courseDegMath - 90);
        const clockwise = normalizedAngle > 0;

        ctx.beginPath();
        ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle, clockwise);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

// ============================================================================
// RANGE RINGS
// ============================================================================

/**
 * Draw range rings around the center of the canvas
 *
 * @param ctx Canvas rendering context
 * @param w Canvas width
 * @param h Canvas height
 * @param maxRangePx Maximum range in pixels
 * @param ringFractions Array of fractions (0-1) for ring positions
 * @param color Ring stroke color
 */
export function drawRangeRings(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  maxRangePx: number,
  ringFractions: number[] = [0.25, 0.5, 0.75, 1],
  color: string = "rgba(52, 211, 153, 0.2)"
): void {
  const centerX = w / 2;
  const centerY = h / 2;

  ctx.strokeStyle = color;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;

  ringFractions.forEach((f) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, f * maxRangePx, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.setLineDash([]);
}

// ============================================================================
// SCALE BAR
// ============================================================================

/**
 * Draw a scale bar in the corner of the canvas
 *
 * @param ctx Canvas rendering context
 * @param w Canvas width
 * @param h Canvas height
 * @param lengthPx Length of scale bar in pixels
 * @param label Label text (e.g., "2.5 NM")
 * @param color Bar and text color
 */
export function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lengthPx: number,
  label: string,
  color: string = "rgba(52, 211, 153, 0.8)"
): void {
  const x = 10;
  const y = h - 10;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Main bar
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + lengthPx, y);
  ctx.stroke();

  // End caps
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y + 4);
  ctx.moveTo(x + lengthPx, y - 4);
  ctx.lineTo(x + lengthPx, y + 4);
  ctx.stroke();

  // Label
  ctx.font = "9px 'Roboto Mono', monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.fillText(label, x, y - 8);
}

// ============================================================================
// DASHED LINE
// ============================================================================

/**
 * Draw a dashed line from a point in a given direction
 *
 * @param ctx Canvas rendering context
 * @param startX Start X coordinate
 * @param startY Start Y coordinate
 * @param angleDegMath Angle in math degrees (0 = east, CCW positive)
 * @param length Line length in pixels
 * @param color Line color
 * @param dashPattern Dash pattern [dash, gap]
 */
export function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  angleDegMath: number,
  length: number,
  color: string = "rgba(52, 211, 153, 0.3)",
  dashPattern: [number, number] = [6, 4]
): void {
  const angleRad = degToRad(angleDegMath);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dashPattern);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(
    startX + Math.cos(angleRad) * length,
    startY - Math.sin(angleRad) * length
  );
  ctx.stroke();

  ctx.setLineDash([]);
}

