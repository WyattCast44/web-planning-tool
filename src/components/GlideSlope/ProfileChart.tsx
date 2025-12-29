import { useRef, useEffect, useLayoutEffect, useState } from "react";
import {
  getChartDimensions,
  drawProfileGrid,
  drawGlidePath,
  drawReferenceLine,
  drawTargetLine,
  drawRunwayThreshold,
} from "./ChartUtils";
import { buildProfilePoints, rangeToTarget } from "./GlideSlopeUtils";
import { nmiToFt } from "../../core/conversions";

function setupCanvas(canvas: HTMLCanvasElement | null) {
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

interface ProfileChartProps {
  altKft: number;
  tgtElevKft: number;
  fpaDeg: number;
  horizonRangeNm: number;
  show3DegRef: boolean;
  show6DegRef: boolean;
}

export function ProfileChart({
  altKft,
  tgtElevKft,
  fpaDeg,
  horizonRangeNm,
  show3DegRef,
  show6DegRef,
}: ProfileChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hoverText, setHoverText] = useState("");
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  function drawChart() {
    const ctx = setupCanvas(canvas.current);
    if (!ctx || !canvas.current) return;

    const dims = getChartDimensions(canvas.current);
    const xmax = Math.max(1, horizonRangeNm);

    // Build profile points from target elevation backward
    const stepNm = Math.max(0.05, xmax / 120);
    const pts = buildProfilePoints(tgtElevKft, fpaDeg, xmax, stepNm);

    // Calculate Y-axis range
    let yMax = Math.max(tgtElevKft, ...pts.map((p) => p.y));
    let yMin = Math.min(tgtElevKft, ...pts.map((p) => p.y));
    const pad = (yMax - yMin) * 0.1 + 0.5;
    yMax = Math.max(1, yMax + pad);
    yMin = Math.max(0, yMin - pad);

    // Clear canvas
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, dims.width, dims.height);

    // Draw grid
    const { xScale, yScale } = drawProfileGrid(
      ctx,
      dims,
      xmax,
      yMin,
      yMax,
      "DISTANCE FROM TARGET (NM)",
      "ALTITUDE MSL (kft)"
    );

    // Draw main glideslope path
    drawGlidePath(ctx, pts, xScale, yScale);

    // Draw reference lines (3deg and 6deg)
    if (show3DegRef) {
      drawReferenceLine(
        ctx,
        tgtElevKft,
        -3,
        xmax,
        xScale,
        yScale,
        "rgba(56,189,248,0.75)",
        [6, 6],
        1.5
      );
    }
    if (show6DegRef) {
      drawReferenceLine(
        ctx,
        tgtElevKft,
        -6,
        xmax,
        xScale,
        yScale,
        "rgba(251,191,36,0.75)",
        [4, 4],
        1.5
      );
    }

    // Draw target line
    drawTargetLine(ctx, dims, tgtElevKft, yScale);

    // Draw runway threshold at distance 0 (left side)
    drawRunwayThreshold(ctx, dims, 0, tgtElevKft, xScale, yScale);

    // Draw crosshair lines if mouse is over canvas
    if (mousePos) {
      const { marginLeft, marginRight, marginTop, marginBottom, width, height, innerWidth } = dims;
      // Check if mouse is within the chart area
      if (
        mousePos.x >= marginLeft &&
        mousePos.x <= width - marginRight &&
        mousePos.y >= marginTop &&
        mousePos.y <= height - marginBottom
      ) {
        // Calculate distance from target at mouse x position
        const xnmRaw = Math.min(xmax, Math.max(0, (mousePos.x - marginLeft) / innerWidth * xmax));
        // Round to nearest 0.5
        const xnm = Math.round(xnmRaw * 2) / 2;
        
        // Calculate altitude on glideslope at this distance
        const tan = Math.tan((Math.abs(fpaDeg) * Math.PI) / 180);
        const alt_kft = tgtElevKft + (xnm * tan * nmiToFt(1)) / 1000;
        
        // Get the y position on the chart for this altitude
        const snappedY = yScale(alt_kft);
        
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(0,255,194,0.6)";
        ctx.lineWidth = 1.5;
        
        // Vertical line (from top to bottom of chart area) - follows mouse x
        ctx.beginPath();
        ctx.moveTo(mousePos.x, marginTop);
        ctx.lineTo(mousePos.x, height - marginBottom);
        ctx.stroke();
        
        // Horizontal line (from left to right of chart area) - snapped to glideslope
        ctx.beginPath();
        ctx.moveTo(marginLeft, snappedY);
        ctx.lineTo(width - marginRight, snappedY);
        ctx.stroke();
        
        ctx.setLineDash([]);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvas.current) return;

    const dims = getChartDimensions(canvas.current);
    const xmax = Math.max(1, horizonRangeNm);
    const rect = canvas.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Update mouse position for crosshair
    setMousePos({ x: mx, y: my });

    // Calculate Y-axis range (same as in drawChart)
    const stepNm = Math.max(0.05, xmax / 120);
    const pts = buildProfilePoints(tgtElevKft, fpaDeg, xmax, stepNm);
    let yMax = Math.max(tgtElevKft, ...pts.map((p) => p.y));
    let yMin = Math.min(tgtElevKft, ...pts.map((p) => p.y));
    const pad = (yMax - yMin) * 0.1 + 0.5;
    yMax = Math.max(1, yMax + pad);
    yMin = Math.max(0, yMin - pad);

    // Normal x-axis: 0 is on left, xmax is on right
    const xScale = (x: number) => dims.marginLeft + (x / xmax) * dims.innerWidth;
    const yScale = (y: number) =>
      dims.marginTop + (1 - (y - yMin) / (yMax - yMin)) * dims.innerHeight;

    // Convert mouse x position to distance from target
    const xnmRaw = Math.min(xmax, Math.max(0, (mx - dims.marginLeft) / dims.innerWidth * xmax));
    // Round to nearest 0.5
    const xnm = Math.round(xnmRaw * 2) / 2;
    const tan = Math.tan((Math.abs(fpaDeg) * Math.PI) / 180);
    const alt_kftRaw = tgtElevKft + (xnm * tan * nmiToFt(1)) / 1000;
    // Round to nearest 0.5
    const alt_kft = Math.round(Math.max(0, alt_kftRaw) * 2) / 2;
    setHoverText(`dist=${xnm.toFixed(1)} NM  |  alt=${alt_kft.toFixed(1)} kft`);
  }

  function handleMouseLeave() {
    setHoverText("");
    setMousePos(null);
  }

  // Initial draw and setup
  useLayoutEffect(() => {
    const ctx = setupCanvas(canvas.current);
    if (ctx && canvas.current) {
      drawChart();
    }
  }, [altKft, tgtElevKft, fpaDeg, horizonRangeNm, show3DegRef, show6DegRef, mousePos]);

  // Handle window and canvas resize
  useEffect(() => {
    if (!canvas.current) return;

    function handleResize() {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const ctx = setupCanvas(canvas.current);
        if (ctx && canvas.current) {
          drawChart();
        }
      });
    }

    // Use ResizeObserver for the canvas element itself
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(canvas.current);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [altKft, tgtElevKft, fpaDeg, horizonRangeNm, show3DegRef, show6DegRef]);

  return (
    <div className="relative">
      <canvas
        ref={canvas}
        className="h-[360px] w-full bg-black/35 border border-gray-600 rounded-md"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoverText && (
        <div className="absolute top-2 right-3 text-sm text-emerald-200 font-mono">
          {hoverText}
        </div>
      )}
    </div>
  );
}

