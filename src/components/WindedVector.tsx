import { Panel } from "./Panel";
import { useState } from "react";
import { InputControls } from "./WindedVector/InputControls";
import { DisplayOptions } from "./WindedVector/DisplayOptions";
import { GraphCanvas } from "./WindedVector/GraphCanvas";

export function WindedVector() {
	const [angleOfBank, setAngleOfBank] = useState(20);
	const [turnRate, setTurnRate] = useState(10);
	const [durationSeconds, setDurationSeconds] = useState(60);
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
				angleOfBank={angleOfBank}
				setAngleOfBank={setAngleOfBank}
				turnRate={turnRate}
				setTurnRate={setTurnRate}
				durationSeconds={durationSeconds}
				setDurationSeconds={setDurationSeconds}
			/>
			
			<div className="flex justify-between pr-4">
				<GraphCanvas
					showCourse={showCourse}
					showCompass={showCompass}
					angleOfBank={angleOfBank}
					turnRate={turnRate}
					durationSeconds={durationSeconds}
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

