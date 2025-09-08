import { LengthConversion } from "./components/LengthConversion";
import { SpeedConversion } from "./components/SpeedConversion";
import { SixPack } from "./components/SixPack";
import { SatcomAssessor } from "./components/SatcomAssessor";

function App() {

  return (
    <div className="bg-[#070a12] min-h-screen text-white bg-grid p-2">
      <SixPack />
      <LengthConversion />
      <SpeedConversion />
      <SatcomAssessor />
      <div className="h-[3000px]">
      
      </div>
    </div>
  );
}

export default App;
