import { Panel } from "./Panel";
import { SixPackInputs } from "./SixPack/SixPackInputs";

export function SixPack() {
  return (
    <Panel className="max-w-xl min-w-md mx-auto sticky top-2 z-50">
      <SixPackInputs />
    </Panel>
  );
}
