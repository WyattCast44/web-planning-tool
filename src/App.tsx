import { useState, useEffect, useCallback } from "react";
import { SixPack } from "./components/SixPack";
import { WindedVector } from "./components/WindedVector";
import { SatcomAssessor } from "./components/SatcomAssessor";
import { SpeedConversion } from "./components/SpeedConversion";
import { RangeConversion } from "./components/RangeConversion";
import { SensorFootprint } from "./components/SensorFootprint";
import { AirDeconfliction } from "./components/AirDeconfliction";
import { LengthConversion } from "./components/LengthConversion";
import { ClassificationBanner } from "./components/ClassificationBanner";
import { CommandPalette } from "./components/CommandPalette";
import { useFeatureConfig, useClassificationConfig } from "./config/store";

function App() {
	const features = useFeatureConfig();
	const classification = useClassificationConfig();
	const [paletteOpen, setPaletteOpen] = useState(false);

	// Global keyboard shortcut for command palette
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "k") {
			e.preventDefault();
			setPaletteOpen((open) => !open);
		}
	}, []);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return (
		<div className="bg-[#070a12] min-h-screen text-white bg-grid p-2">
			{classification.bannerEnabled && <ClassificationBanner />}
			<div className={classification.bannerEnabled ? "pt-4" : ""}>
				<SixPack />
				{features.satcomAssessor.enabled && <SatcomAssessor />}
				{features.windedVector.enabled && <WindedVector />}
				{features.sensorFootprint.enabled && (
					<SensorFootprint />
				)}
				{features.airDeconfliction.enabled && (
					<AirDeconfliction />
				)}
				<RangeConversion />
				<LengthConversion />
				<SpeedConversion />
			</div>
			<CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
		</div>
	);
}

export default App;
