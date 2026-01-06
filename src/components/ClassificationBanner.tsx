import { useClassificationConfig } from "../config/store";

/**
 * Classification Banner Component
 * Displays classification banner at the top of the application if enabled in config
 */
export function ClassificationBanner() {
	const classification = useClassificationConfig();

	if (!classification.bannerEnabled) {
		return null;
	}

	// Determine banner color based on level and SAR status
	// SAR (orange) overrides level color
	let color = "";
	if (classification.sar) {
		color = "bg-orange-600/80 text-white/50";
	} else {
		switch (classification.level) {
			case "U":
				color = "bg-green-600/80 text-white/50";
				break;
			case "CUI":
				color = "bg-purple-600/80 text-white/50";
				break;
			case "S":
			case "TS":
				color = "bg-red-600/80 text-white/50";
				break;
			default:
				color = "bg-gray-600/80 text-white/50";
		}
	}

	// Generate banner text if not provided
	const bannerText =
		classification.bannerText ||
		(classification.level === "U"
			? "UNCLASSIFIED"
			: classification.level === "CUI"
			? "CUI"
			: classification.level === "S"
			? "SECRET"
			: classification.level === "TS"
			? "TOP SECRET"
			: "");

	return (
		<div
			className={`absolute select-none top-0 left-0 right-0 ${color} text-center py-[1px] border-y border-black text-[9px] font-bold tracking-wider leading-none`}
		>
			{bannerText}
		</div>
	);
}
