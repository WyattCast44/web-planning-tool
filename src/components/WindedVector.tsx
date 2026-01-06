import { Panel } from "./Panel";
import { useState } from "react";
import { InputControls } from "./WindedVector/InputControls";
import { DisplayOptions } from "./WindedVector/DisplayOptions";
import { GraphCanvas } from "./WindedVector/GraphCanvas";

type InputMode = "duration" | "headingChange";

export function WindedVector() {
	const [maxAngleOfBank, setMaxAngleOfBank] = useState(20);
	const [startingAngleOfBank, setStartingAngleOfBank] = useState(0);
	const [turnRate, setTurnRate] = useState(10);
	const [durationSeconds, setDurationSeconds] = useState(60);
	const [inputMode, setInputMode] = useState<InputMode>("duration");
	const [headingChangeDeg, setHeadingChangeDeg] = useState(90);
	const [showCourse, setShowCourse] = useState(true);
	const [showCompass, setShowCompass] = useState(true);
	const [showOppositeTurn, setShowOppositeTurn] = useState(true);
	const [scale, setScale] = useState(10);

	return (
		<Panel className="max-w-xl min-w-md mx-auto my-3">
			<header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-b border-gray-600">
				Winded Turn Vector
			</header>

			<InputControls
				maxAngleOfBank={maxAngleOfBank}
				setMaxAngleOfBank={setMaxAngleOfBank}
				startingAngleOfBank={startingAngleOfBank}
				setStartingAngleOfBank={setStartingAngleOfBank}
				turnRate={turnRate}
				setTurnRate={setTurnRate}
				durationSeconds={durationSeconds}
				setDurationSeconds={setDurationSeconds}
				inputMode={inputMode}
				setInputMode={setInputMode}
				headingChangeDeg={headingChangeDeg}
				setHeadingChangeDeg={setHeadingChangeDeg}
			/>
			
			<div className="flex justify-between pr-4">
				<GraphCanvas
					showCourse={showCourse}
					showCompass={showCompass}
					maxAngleOfBank={maxAngleOfBank}
					startingAngleOfBank={startingAngleOfBank}
					turnRate={turnRate}
					durationSeconds={durationSeconds}
					inputMode={inputMode}
					headingChangeDeg={headingChangeDeg}
					showOppositeTurn={showOppositeTurn}
					scale={scale}
				/>
				<DisplayOptions
					showCourse={showCourse}
					setShowCourse={setShowCourse}
					showCompass={showCompass}
					setShowCompass={setShowCompass}
					showOppositeTurn={showOppositeTurn}
					setShowOppositeTurn={setShowOppositeTurn}
					scale={scale}
					setScale={setScale}
				/>
			</div>
		</Panel>
	);
}
