import { LengthConversion } from "./components/LengthConversion";
import { SpeedConversion } from "./components/SpeedConversion";
import { SixPack } from "./components/SixPack";
import { SatcomAssessor } from "./components/SatcomAssessor";
import { WindedVector } from "./components/WindedVector";
import { SensorFootprint } from "./components/SensorFootprint";

function App() {
	return (
		<div className="bg-[#070a12] min-h-screen text-white bg-grid p-2">
			<SixPack />
			<SatcomAssessor />
			<WindedVector />
			<SensorFootprint />
			<LengthConversion />
			<SpeedConversion />
		</div>
	);
}

export default App;
