import { useRef, useEffect, useState } from "react";
import { useAppStore } from "../../store";
import {
	simulateTurnToTime,
	simulateTurnToHeading,
	type TrackPoint,
	type GroundTrack,
	type SimulateToHeadingResult,
} from "../../core/groundTrack";
import { degCardinalToDegMath } from "../../core/math";
import {
	setupCanvas,
	drawCompassOverlay,
	drawAircraft,
	drawGrid,
	drawCourseLines,
} from "./CanvasUtils";
import { drawTurnPath } from "./TurnPathRenderer";

type InputMode = "duration" | "headingChange";

interface GraphCanvasProps {
	showCourse: boolean;
	showCompass: boolean;
	maxAngleOfBank: number;
	startingAngleOfBank: number;
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
	maxAngleOfBank,
	startingAngleOfBank,
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
	} = useAppStore();
	const [points, setPoints] = useState<TrackPoint[]>([]);
	const [oppositePoints, setOppositePoints] = useState<TrackPoint[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Calculate ground track when parameters change
	useEffect(() => {
		setIsLoading(true);
		setError(null);

		try {
			// Common simulation parameters
			const baseParams = {
				ktas: ktas,
				avgRollRate: turnRate,
				initialBankAngle: startingAngleOfBank,
				maxBankAngle: maxAngleOfBank, // Sign determines turn direction
				initialHeading: hdgDegCardinal,
				windDirection: windDegCardinal,
				windSpeed: windKts,
			};

			let mainTrack: GroundTrack;
			let oppositeTrack: GroundTrack = [];

			if (inputMode === "duration") {
				// Fixed-duration mode
				mainTrack = simulateTurnToTime(
					{
						...baseParams,
						durationSeconds: durationSeconds,
					},
					0.5 // Time step of 0.5 seconds for smooth curves
				);

				// Calculate opposite turn track if enabled
				if (showOppositeTurn && maxAngleOfBank !== 0) {
					oppositeTrack = simulateTurnToTime(
						{
							...baseParams,
							initialBankAngle: -startingAngleOfBank, // Mirror the starting bank
							maxBankAngle: -maxAngleOfBank, // Opposite direction
							durationSeconds: durationSeconds,
						},
						0.5
					);
				}
			} else {
				// Target-heading mode
				// For heading change mode, the sign of maxBankAngle determines direction
				// headingChangeDeg is always positive (the magnitude of the turn)
				// maxAngleOfBank sign determines left/right turn direction
				
				if (maxAngleOfBank === 0) {
					// Cannot simulate a turn with 0 bank angle
					throw new Error("Bank angle cannot be zero for heading change mode");
				}

				// Calculate target heading based on current heading and desired change
				// The sign of maxAngleOfBank determines the turn direction
				const turnDirection = Math.sign(maxAngleOfBank);
				let targetHeading: number;
				
				if (turnDirection > 0) {
					// Right turn
					targetHeading = (hdgDegCardinal + headingChangeDeg) % 360;
				} else {
					// Left turn
					targetHeading = (hdgDegCardinal - headingChangeDeg + 360) % 360;
				}

				const result: SimulateToHeadingResult = simulateTurnToHeading(
					{
						...baseParams,
						targetHeading: targetHeading,
					},
					0.5
				);
				mainTrack = result.track;

				// Calculate opposite turn track if enabled
				if (showOppositeTurn) {
					// Opposite direction to reach same heading change magnitude
					const oppositeTargetHeading =
						turnDirection > 0
							? (hdgDegCardinal - headingChangeDeg + 360) % 360
							: (hdgDegCardinal + headingChangeDeg) % 360;

					const oppositeResult = simulateTurnToHeading(
						{
							...baseParams,
							initialBankAngle: -startingAngleOfBank, // Mirror the starting bank
							maxBankAngle: -maxAngleOfBank,
							targetHeading: oppositeTargetHeading,
						},
						0.5
					);
					oppositeTrack = oppositeResult.track;
				}
			}

			setPoints(mainTrack);
			setOppositePoints(oppositeTrack);
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
		maxAngleOfBank,
		startingAngleOfBank,
		turnRate,
		ktas,
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
		oppositePoints,
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
