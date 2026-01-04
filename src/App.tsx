import { LengthConversion } from "./components/LengthConversion";
import { SpeedConversion } from "./components/SpeedConversion";
import { RangeConversion } from "./components/RangeConversion";
import { SatcomAssessor } from "./components/SatcomAssessor";
import { WindedVector } from "./components/WindedVector";
import { SensorFootprint } from "./components/SensorFootprint";
import { ClassificationBanner } from "./components/ClassificationBanner";
import { useFeatureConfig, useClassificationConfig } from "./config/store";
import { SixPack } from "./components/SixPack";

function App() {
	const features = useFeatureConfig();
	const classification = useClassificationConfig();

	return (
		<div className="bg-[#070a12] min-h-screen text-white bg-grid p-2">
			{classification.bannerEnabled && <ClassificationBanner />}
			<div className={classification.bannerEnabled ? "pt-4" : ""}>
				<SixPack />
				{features.satcomAssessor.enabled && <SatcomAssessor />}
				{features.windedVector.enabled && <WindedVector />}
				{features.sensorFootprint.enabled && <SensorFootprint />}
				<RangeConversion />
				<LengthConversion />
				<SpeedConversion />
			</div>
		</div>
	);
}

export default App;
