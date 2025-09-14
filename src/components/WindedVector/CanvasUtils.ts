import { degCardinalToDegMath, degToRad } from "../../core/math";

export function setupCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Get the device pixel ratio, falling back to 1
  const dpr = window.devicePixelRatio || 1;

  // Get the display size (CSS pixels)
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  // Set the actual size in memory (scaled to account for extra pixel density)
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;

  // Scale the drawing context so everything will work at the higher ratio
  ctx.scale(dpr, dpr);

  // Set the display size (CSS pixels)
  canvas.style.width = displayWidth + "px";
  canvas.style.height = displayHeight + "px";

  return ctx;
}

export function drawCompassOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  acHeadingMath: number,
  showCompass: boolean,
  courseDegCardinalMath: number
) {
  if (!showCompass) return;

  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(w, h) / 2 - 8; // Leave some margin from edges

  // Draw compass background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fill();
  ctx.strokeStyle = "rgba(180,220,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw compass ticks and labels
  for (let angle = 0; angle < 360; angle += 10) {
    const isMajorTick = angle % 30 === 0;
    const tickLength = isMajorTick ? 12 : 6;
    const tickAngle = degToRad(90 - angle); // Convert to canvas coordinates (0° = up)

    const innerRadius = radius - tickLength;
    const outerRadius = radius;

    const x1 = centerX + innerRadius * Math.cos(tickAngle);
    const y1 = centerY - innerRadius * Math.sin(tickAngle);
    const x2 = centerX + outerRadius * Math.cos(tickAngle);
    const y2 = centerY - outerRadius * Math.sin(tickAngle);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "rgba(180,220,255,0.4)";
    ctx.lineWidth = isMajorTick ? 2 : 1;
    ctx.stroke();

    // Draw cardinal direction labels
    if (isMajorTick) {
      const labelRadius = radius - 20;
      const labelX = centerX + labelRadius * Math.cos(tickAngle);
      const labelY = centerY - labelRadius * Math.sin(tickAngle) + 3;

      ctx.fillStyle = "rgba(200,255,255,0.5)";
      ctx.font = "8px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let label = "";
      // dont label the cardinal directions so that they dont overlap with the grid lines
      if (angle === 0) label = "";
      else if (angle === 90) label = "";
      else if (angle === 180) label = "";
      else if (angle === 270) label = "";
      else label = angle.toString();

      ctx.fillText(label, labelX, labelY);
    }
  }

  // Draw heading indicator (small triangle pointing to current heading)
  const headingAngle = degToRad(acHeadingMath);
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
  ctx.fillStyle = "rgba(56,189,248,.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const windCorrectionAngle = courseDegCardinalMath - acHeadingMath;

  if (windCorrectionAngle === 0 || windCorrectionAngle === 360) return;

  // Draw course triangle (magenta)
  const courseAngle = degToRad(courseDegCardinalMath);
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
  ctx.fillStyle = "rgba(255,0,255,0.9)"; // Magenta
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Normalize the angle to the shortest direction (-180 to 180)
  let normalizedAngle = windCorrectionAngle;
  while (normalizedAngle > 180) normalizedAngle -= 360;
  while (normalizedAngle < -180) normalizedAngle += 360;

  // Only draw arc if there's a significant difference
  if (Math.abs(normalizedAngle) > 2) {
    const arcRadius = radius - 5; // Same radius as the triangles

    // Use the same coordinate conversion as the compass (90 - angle)
    const startAngle = degToRad(90 - acHeadingMath - 90);
    const endAngle = degToRad(90 - courseDegCardinalMath - 90);
    const clockwise = normalizedAngle > 0;

    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      arcRadius,
      startAngle,
      endAngle,
      clockwise
    );
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    // make smaller dashes
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function drawAircraft(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  acHeadingDeg: number
) {
  const acHeadingMath = degCardinalToDegMath(acHeadingDeg);
  const triangleHeight = 20; // Height of the triangle in pixels
  const triangleWidth = 12; // Width of the triangle in pixels
  const aircraftColor = "rgba(56,189,248,1)";

  // Convert heading to radians (0 degrees = pointing up/north)
  const aH = degToRad(acHeadingMath);

  // Aircraft position at the center of the canvas (origin)
  const aircraftX = w / 2;
  const aircraftY = h / 2;

  // For an isosceles triangle, the centroid is 1/3 of the height from the base
  // So we need to offset the triangle so its centroid is at the aircraft position
  const centroidOffset = triangleHeight / 3; // distance from base to centroid

  // Calculate triangle vertices relative to aircraft position
  // Point 1: tip pointing to heading (forward) - 2/3 of height from centroid
  const tipX = aircraftX + ((triangleHeight * 2) / 3) * Math.cos(aH);
  const tipY = aircraftY - ((triangleHeight * 2) / 3) * Math.sin(aH);

  // Point 2: left base vertex (perpendicular to heading) - 1/3 of height back from centroid
  const leftX =
    aircraftX -
    centroidOffset * Math.cos(aH) -
    (triangleWidth / 2) * Math.cos(aH + Math.PI / 2);
  const leftY =
    aircraftY +
    centroidOffset * Math.sin(aH) +
    (triangleWidth / 2) * Math.sin(aH + Math.PI / 2);

  // Point 3: right base vertex (perpendicular to heading) - 1/3 of height back from centroid
  const rightX =
    aircraftX -
    centroidOffset * Math.cos(aH) -
    (triangleWidth / 2) * Math.cos(aH - Math.PI / 2);
  const rightY =
    aircraftY +
    centroidOffset * Math.sin(aH) +
    (triangleWidth / 2) * Math.sin(aH - Math.PI / 2);

  // Draw the aircraft triangle using Canvas 2D
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();

  // Fill the triangle
  ctx.fillStyle = aircraftColor;
  ctx.fill();

  // Stroke the triangle
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bounds: number
) {
  // config
  const majorLineColor = "rgba(255,255,255,0.45)";
  const minorLineColor = "rgba(255,255,255,0.15)";
  const xAndYbounds = [-bounds, bounds];
  const gridSpacing = 1;

  // draw a cartesian coordinate system with the origin at the center of the canvas
  // and the x-axis pointing to the right and the y-axis pointing up
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.strokeStyle = majorLineColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.strokeStyle = majorLineColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Calculate scaling factors to convert world coordinates to canvas pixels
  const scaleX = w / (xAndYbounds[1] - xAndYbounds[0]);
  const scaleY = h / (xAndYbounds[1] - xAndYbounds[0]);

  // Draw vertical grid lines (X-axis)
  for (let x = xAndYbounds[0]; x <= xAndYbounds[1]; x += gridSpacing) {
    if (x === 0) continue; // Skip the main axis line
    ctx.beginPath();
    const canvasX = w / 2 + x * scaleX;
    ctx.moveTo(canvasX, 0);
    ctx.lineTo(canvasX, h);
    ctx.strokeStyle = minorLineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // draw the text for the x value
    // it should be centered on the x value and the y value should be the x value
    ctx.fillStyle = majorLineColor;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(x.toString(), canvasX, h / 2 + 12);
  }

  // Draw horizontal grid lines (Y-axis)
  for (let y = xAndYbounds[0]; y <= xAndYbounds[1]; y += gridSpacing) {
    if (y === 0) continue; // Skip the main axis line
    ctx.beginPath();
    const canvasY = h / 2 - y * scaleY; // Note: subtract because Y goes up in world coords
    ctx.moveTo(0, canvasY);
    ctx.lineTo(w, canvasY);
    ctx.strokeStyle = minorLineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // draw the text for the y value
    // it should be centered on the y value and the aligned to the left of the canvas
    ctx.fillStyle = majorLineColor;
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(y.toString(), w - 14, canvasY);
  }

  return { scaleX, scaleY };
}

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
) {
  if (!showCourse) return;

  let timeIncrement = 1; // minutes
  let distanceTraveledNmi = (gs / 60) * timeIncrement;
  let courseDegCardinalMath = degCardinalToDegMath(courseDegCardinal);

  // Convert course to radians for Math.cos/sin
  let courseRad = degToRad(courseDegCardinalMath);

  // Start at the center (aircraft position)
  let courseLineStartX = w / 2;
  let courseLineStartY = h / 2;

  // Scale the distance to match the grid system
  // Convert nautical miles to grid units (where 1 grid unit = 1 nautical mile)
  // Then scale to canvas pixels
  let scaledDistance = distanceTraveledNmi * scaleX;

  // Calculate end position using scaled distance and proper coordinate system
  let courseLineEndX =
    courseLineStartX + scaledDistance * Math.cos(courseRad);
  let courseLineEndY =
    courseLineStartY - scaledDistance * Math.sin(courseRad); // Subtract because Y goes up

  ctx.beginPath();
  ctx.moveTo(courseLineStartX, courseLineStartY);
  ctx.lineTo(courseLineEndX, courseLineEndY);
  // make the line a dashed line that is magenta
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(255,0,255,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // now draw the heading line from the aircraft aligned to the heading
  // the distance should be the same as the course line
  let headingLineEndX =
    courseLineStartX + scaledDistance * Math.cos(degToRad(acHeadingMath));
  let headingLineEndY =
    courseLineStartY - scaledDistance * Math.sin(degToRad(acHeadingMath));
  ctx.beginPath();
  ctx.moveTo(courseLineStartX, courseLineStartY);
  ctx.lineTo(headingLineEndX, headingLineEndY);
  // make the line a dashed line that is blue the same as the aircraft
  ctx.strokeStyle = "rgba(56,189,248,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
}
