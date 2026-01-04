/**
 * APPLICATION CONFIGURATION FILE
 *
 * Place this file in the public directory.
 * Edit the values below to configure the entire application.
 *
 * STRUCTURE:
 * - sensors: Sensor system configuration (turret limits, cameras, lenses)
 * - display: Display preferences (units, themes, formatting)
 * - features: Feature flags and component-specific settings
 * - performance: Performance tuning options
 */

window.APP_CONFIG = {
	// Classification settings
    classification: {
		bannerEnabled: true,
        level: "U", // "U", "CUI", "S", "TS"
        sar: false,
		bannerText: "",
	},

	// Sensor system configuration
	sensors: {
		turret: {
			// Gimbal physical limits
			minAzimuth: -180, // degrees, negative = left of nose
			maxAzimuth: 180, // degrees, positive = right of nose
			minDepression: 0, // degrees, 0 = level with flight path
			maxDepression: 120, // degrees, 90 = nadir, >90 = aft-looking
		},

		sensorSystems: [
			{
				id: "mts-b",
				name: "MTS-B",
				cameras: [
					{
						id: "eo",
						name: "EO",
						type: "visible",
						lenses: [
							{
								id: "eo-wide-wide",
								name: "Wide Wide",
								hfov: 32.0,
								vfov: 24.0,
							},
							{
								id: "eo-wide-medium",
								name: "Wide Medium",
								hfov: 16.0,
								vfov: 12.0,
							},
							{
								id: "eo-wide-narrow",
								name: "Wide Narrow",
								hfov: 8.0,
								vfov: 6.0,
							},
						],
						digitalZoom: [1, 2, 4],
					},
					{
						id: "eo-narrow",
						name: "EO Spotter",
						type: "visible",
						lenses: [
							{
								id: "eo-narrow-narrow",
								name: "Narrow",
								hfov: 2.1,
								vfov: 1.6,
							},
							{
								id: "eo-narrow-ultra",
								name: "Ultra Narrow",
								hfov: 0.5,
								vfov: 0.38,
							},
						],
						digitalZoom: [1, 2, 4, 8],
					},
					{
						id: "mwir",
						name: "MWIR",
						type: "ir-mw",
						lenses: [
							{
								id: "mwir-wide",
								name: "Wide",
								hfov: 12.0,
								vfov: 9.0,
							},
							{
								id: "mwir-medium",
								name: "Medium",
								hfov: 4.0,
								vfov: 3.0,
							},
							{
								id: "mwir-narrow",
								name: "Narrow",
								hfov: 1.0,
								vfov: 0.75,
							},
						],
						digitalZoom: [1, 2, 4],
					},
					{
						id: "swir",
						name: "SWIR",
						type: "ir-sw",
						lenses: [
							{
								id: "swir-wide",
								name: "Wide",
								hfov: 8.0,
								vfov: 6.0,
							},
							{
								id: "swir-narrow",
								name: "Narrow",
								hfov: 2.0,
								vfov: 1.5,
							},
						],
						digitalZoom: [1, 2],
					},
				],
			},
		],
	},

	// Display preferences
	display: {
		// Default units for distance measurements
		defaultDistanceUnit: "nmi", // "nmi" | "km"

		// Number formatting
		decimalPlaces: {
			distance: 2,
			speed: 1,
			angle: 1,
			altitude: 1,
		},
	},

	// Feature flags and component-specific settings
	features: {
		// Sensor Footprint component
		sensorFootprint: {
			enabled: true,
			showNIIRS: true,
		},

		// Satcom Assessor component
		satcomAssessor: {
			enabled: true,
		},

		// Winded Vector component
		windedVector: {
			enabled: true,
		},
	},

	// Performance tuning
	performance: {
		// Canvas rendering
		canvas: {
			maxFps: 60,
			enableAntialiasing: true,
		},

		// Calculation caching
		enableCaching: true,
		cacheSize: 1000,
	},
};
