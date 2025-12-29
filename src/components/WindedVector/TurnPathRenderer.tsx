import { type Point } from "../../core/groundTrack";

interface TurnPathRendererProps {
  points: Point[];
  oppositePoints: Point[];
  showOppositeTurn: boolean;
  scaleX: number;
  scaleY: number;
  w: number;
  h: number;
}

export function drawTurnPath(
  ctx: CanvasRenderingContext2D,
  { points, oppositePoints, showOppositeTurn, scaleX, scaleY, w, h }: TurnPathRendererProps
) {
  if (points.length === 0) return;

  // Since each grid square represents 1NM x 1NM, we can use 1:1 mapping
  // The start point should be centered at the origin (0,0) which is the center of the canvas
  const pointScale = Math.min(scaleX, scaleY); // 1:1 scale - 1 unit = 1NM

  // Helper function to get color for point type
  function getColorForType(type: string): string {
    switch (type) {
      case "start":
        return "rgba(0,255,0,0.9)"; // Green for start
      case "rollingToMaxBank":
        return "rgba(255,255,0,0.8)"; // Yellow for rolling to bank
      case "sustainedMaxBank":
        return "rgba(255,0,0,0.8)"; // Red for sustained bank
      case "rollingToZeroBank":
        return "rgba(255,165,0,0.8)"; // Orange for rolling to zero
      case "sustainedZeroBank":
        return "rgba(0,0,255,0.8)"; // Blue for sustained zero
      case "end":
        return "rgba(255,0,255,0.9)"; // Magenta for end
      default:
        return "rgba(255,255,255,0.8)"; // White for unknown
    }
  }

  // Draw turn path with different colors for each point type
  if (points.length > 1) {
    let currentType = points[0].type;
    let segmentStart = 0;

    ctx.setLineDash([]);

    // Draw segments with different colors
    for (let i = 1; i < points.length; i++) {
      const point = points[i];

      // If point type changed, draw the current segment and start a new one
      if (point.type !== currentType) {
        // Draw the current segment
        ctx.beginPath();
        const startPoint = points[segmentStart];
        const startCanvasX = w / 2 + startPoint.x * pointScale;
        const startCanvasY = h / 2 - startPoint.y * pointScale;
        ctx.moveTo(startCanvasX, startCanvasY);

        for (let j = segmentStart + 1; j < i; j++) {
          const segmentPoint = points[j];
          const canvasX = w / 2 + segmentPoint.x * pointScale;
          const canvasY = h / 2 - segmentPoint.y * pointScale;
          ctx.lineTo(canvasX, canvasY);
        }

        ctx.strokeStyle = getColorForType(currentType);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Start new segment
        currentType = point.type;
        segmentStart = i - 1;
      }
    }

    // Draw the final segment
    ctx.beginPath();
    const startPoint = points[segmentStart];
    const startCanvasX = w / 2 + startPoint.x * pointScale;
    const startCanvasY = h / 2 - startPoint.y * pointScale;
    ctx.moveTo(startCanvasX, startCanvasY);

    for (let j = segmentStart + 1; j < points.length; j++) {
      const segmentPoint = points[j];
      const canvasX = w / 2 + segmentPoint.x * pointScale;
      const canvasY = h / 2 - segmentPoint.y * pointScale;
      ctx.lineTo(canvasX, canvasY);
    }

    ctx.strokeStyle = getColorForType(currentType);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw opposite turn track if enabled
  if (showOppositeTurn && oppositePoints.length > 1) {
    ctx.beginPath();
    let firstOppositePoint = oppositePoints[0];
    let firstOppositeCanvasX =
      w / 2 + firstOppositePoint.x * pointScale;
    let firstOppositeCanvasY =
      h / 2 - firstOppositePoint.y * pointScale;
    ctx.moveTo(firstOppositeCanvasX, firstOppositeCanvasY);

    for (let i = 1; i < oppositePoints.length; i++) {
      const point = oppositePoints[i];
      const canvasX = w / 2 + point.x * pointScale;
      const canvasY = h / 2 - point.y * pointScale;
      ctx.lineTo(canvasX, canvasY);
    }

    ctx.strokeStyle = "rgba(200,200,200,0.6)"; // Light gray
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
