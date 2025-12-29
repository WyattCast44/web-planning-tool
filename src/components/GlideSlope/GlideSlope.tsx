import { Panel } from "../Panel";
import { useState } from "react";
import { useAppStore } from "../../store";
import { ProfileChart } from "./ProfileChart";
import { InputControls } from "./InputControls";

export function GlideSlope() {
	const { altKft, tgtElevKft } = useAppStore();

	const [fpaDeg, setFpaDeg] = useState(-5.0);
	const [localTgtElevKft, setLocalTgtElevKft] = useState<number | null>(null);
	const [horizonRangeNm, setHorizonRangeNm] = useState(25);
	const [runwayHeadingDeg, setRunwayHeadingDeg] = useState(90);
	const [show3DegRef, setShow3DegRef] = useState(true);
	const [show6DegRef, setShow6DegRef] = useState(true);

	// if the localTgtElevKft is not null, use it, otherwise use the tgtElevKft from the store
	let selectedTgtElevKft = localTgtElevKft !== null ? localTgtElevKft : tgtElevKft;

	return (
		<Panel className="max-w-xl min-w-md mx-auto my-3">
			<header className="font-display text-center py-1.5 text-sm text-red-500/80 uppercase tracking-tight select-none border-b border-gray-600">
				Glide Slope Visualizer
			</header>

			<InputControls
				localTgtElevKft={localTgtElevKft}
				setLocalTgtElevKft={setLocalTgtElevKft}
				fpaDeg={fpaDeg}
				setFpaDeg={setFpaDeg}
				horizonRangeNm={horizonRangeNm}
				setHorizonRangeNm={setHorizonRangeNm}
				runwayHeadingDeg={runwayHeadingDeg}
				setRunwayHeadingDeg={setRunwayHeadingDeg}
			/>

			<div className="p-3">
				<ProfileChart
					altKft={altKft}
					tgtElevKft={selectedTgtElevKft}
					fpaDeg={fpaDeg}
					horizonRangeNm={horizonRangeNm}
					show3DegRef={show3DegRef}
					show6DegRef={show6DegRef}
				/>
			</div>
		</Panel>
	);
}
