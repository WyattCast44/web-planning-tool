import { buildProfilePoints } from "./GlideSlopeUtils";

export interface ChartDimensions {
  width: number;
  height: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  innerWidth: number;
  innerHeight: number;
}

export function getChartDimensions(
  canvas: HTMLCanvasElement
): ChartDimensions {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const marginLeft = 60;
  const marginRight = 18;
  const marginTop = 16;
  const marginBottom = 36;
  const innerWidth = width - marginLeft - marginRight;
  const innerHeight = height - marginTop - marginBottom;

  return {
    width,
    height,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    innerWidth,
    innerHeight,
  };
}

export function drawProfileGrid(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  xmax: number,
  yMin: number,
  yMax: number,
  xLabel: string,
  yLabel: string
) {
  const { width, height, marginLeft, marginRight, marginTop, marginBottom, innerWidth, innerHeight } = dims;

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(marginLeft, marginTop, innerWidth, innerHeight);

  // Scaling functions
  // x-axis: 0 is on the left (target), xmax is on the right (furthest from target)
  const xScale = (x: number) => marginLeft + (x / xmax) * innerWidth;
  const yScale = (y: number) =>
    marginTop + (1 - (y - yMin) / (yMax - yMin)) * innerHeight;

  // Vertical grid lines (every 1 NM)
  for (let x = 0; x <= xmax; x += 1) {
    const X = xScale(x);
    ctx.beginPath();
    ctx.moveTo(X, marginTop);
    ctx.lineTo(X, height - marginBottom);
    ctx.strokeStyle = "rgba(180,220,255,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels every 2 NM
    if (x % 2 === 0) {
      ctx.fillStyle = "rgba(200,255,255,0.65)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(x.toString(), X, height - 10);
    }
  }

  // Horizontal grid lines (every 1 kft)
  for (let y = Math.ceil(yMin); y <= yMax; y += 1) {
    const Y = yScale(y);
    ctx.beginPath();
    ctx.moveTo(marginLeft, Y);
    ctx.lineTo(width - marginRight, Y);
    ctx.strokeStyle = "rgba(180,220,255,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    ctx.fillStyle = "rgba(200,255,255,0.65)";
    ctx.font = "11px monospace";
    ctx.textAlign = "end";
    ctx.textBaseline = "middle";
    ctx.fillText(y.toFixed(0), marginLeft - 6, Y);
  }

  // X-axis label
  ctx.fillStyle = "rgba(120,220,200,0.9)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(xLabel, marginLeft + innerWidth / 2, height - 2);

  // Y-axis label (rotated)
  ctx.save();
  ctx.translate(14, marginTop + innerHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(120,220,200,0.9)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  return { xScale, yScale };
}

export function drawGlidePath(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  xScale: (x: number) => number,
  yScale: (y: number) => number,
  color: string = "rgba(0,255,194,0.95)",
  lineWidth: number = 2.5
) {
  if (points.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(xScale(points[0].x), yScale(points[0].y));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(xScale(points[i].x), yScale(points[i].y));
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function drawReferenceLine(
  ctx: CanvasRenderingContext2D,
  tgtElev_kft: number,
  fpa_deg: number,
  xmax_nm: number,
  xScale: (x: number) => number,
  yScale: (y: number) => number,
  color: string = "rgba(56,189,248,0.75)",
  dashPattern: number[] = [6, 6],
  lineWidth: number = 1.5
) {
  const points = buildProfilePoints(tgtElev_kft, fpa_deg, xmax_nm, Math.max(0.05, xmax_nm / 120));
  ctx.setLineDash(dashPattern);
  drawGlidePath(ctx, points, xScale, yScale, color, lineWidth);
  ctx.setLineDash([]);
}

export function drawTargetLine(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  tgt_kft: number,
  yScale: (y: number) => number
) {
  const { width, marginLeft, marginRight } = dims;
  const Y = yScale(tgt_kft);

  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(marginLeft, Y);
  ctx.lineTo(width - marginRight, Y);
  ctx.strokeStyle = "rgba(255,99,99,0.45)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawRunwayThreshold(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  x_nm: number,
  tgt_kft: number,
  xScale: (x: number) => number,
  yScale: (y: number) => number
) {
  const X = xScale(x_nm);
  const Y = yScale(tgt_kft);

  // Circle at threshold
  ctx.beginPath();
  ctx.arc(X, Y, 4.5, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(255,100,100,0.95)";
  ctx.fill();

  // Runway box below target line
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.fillRect(X - 10, Y + 6, 20, 6);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(X - 10, Y + 6, 20, 6);
}