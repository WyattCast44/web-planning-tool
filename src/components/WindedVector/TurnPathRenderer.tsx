import { type TrackPoint, TurnPhase } from "../../core/groundTrack";

interface TurnPathRendererProps {
	points: TrackPoint[];
	oppositePoints: TrackPoint[];
	showOppositeTurn: boolean;
	scaleX: number;
	scaleY: number;
	w: number;
	h: number;
}

export function drawTurnPath(
	ctx: CanvasRenderingContext2D,
	{
		points,
		oppositePoints,
		showOppositeTurn,
		scaleX,
		scaleY,
		w,
		h,
	}: TurnPathRendererProps
) {
	if (points.length === 0) return;

	// Since each grid square represents 1NM x 1NM, we can use 1:1 mapping
	// The start point should be centered at the origin (0,0) which is the center of the canvas
	const pointScale = Math.min(scaleX, scaleY); // 1:1 scale - 1 unit = 1NM

	// Helper function to get color for phase type
	function getColorForPhase(phase: TurnPhase): string {
		switch (phase) {
			case TurnPhase.ROLL_IN:
				return "rgba(255,255,0,0.8)"; // Yellow for rolling to bank
			case TurnPhase.HOLD:
				return "rgba(255,0,0,0.8)"; // Red for sustained bank
			case TurnPhase.ROLL_OUT:
				return "rgba(255,165,0,0.8)"; // Orange for rolling to zero
			default:
				return "rgba(255,255,255,0.8)"; // White for unknown
		}
	}

	// Draw turn path with different colors for each phase
	if (points.length > 1) {
		let currentPhase = points[0].phase;
		let segmentStart = 0;

		ctx.setLineDash([]);

		// Draw segments with different colors
		for (let i = 1; i < points.length; i++) {
			const point = points[i];

			// If phase changed, draw the current segment and start a new one
			if (point.phase !== currentPhase) {
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

				ctx.strokeStyle = getColorForPhase(currentPhase);
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// Start new segment
				currentPhase = point.phase;
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

		ctx.strokeStyle = getColorForPhase(currentPhase);
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}

	// Draw start point marker (green circle)
	if (points.length > 0) {
		const firstPoint = points[0];
		const firstCanvasX = w / 2 + firstPoint.x * pointScale;
		const firstCanvasY = h / 2 - firstPoint.y * pointScale;

		ctx.beginPath();
		ctx.arc(firstCanvasX, firstCanvasY, 4, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(0,255,0,0.9)";
		ctx.fill();
	}

	// Draw end point marker (magenta circle)
	if (points.length > 1) {
		const lastPoint = points[points.length - 1];
		const lastCanvasX = w / 2 + lastPoint.x * pointScale;
		const lastCanvasY = h / 2 - lastPoint.y * pointScale;

		ctx.beginPath();
		ctx.arc(lastCanvasX, lastCanvasY, 4, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(255,0,255,0.9)";
		ctx.fill();
	}

	// Draw opposite turn track if enabled
	if (showOppositeTurn && oppositePoints.length > 1) {
		ctx.beginPath();
		const firstOppositePoint = oppositePoints[0];
		const firstOppositeCanvasX =
			w / 2 + firstOppositePoint.x * pointScale;
		const firstOppositeCanvasY =
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
		ctx.setLineDash([5, 5]); // Dashed line for opposite turn
		ctx.stroke();
		ctx.setLineDash([]); // Reset dash pattern
	}
}
