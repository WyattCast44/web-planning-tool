/**
 * APPLICATION CONFIGURATION FILE - UPDATED
 *
 * Place this file in the public directory.
 * Edit the values below to configure the entire application.
 *
 * STRUCTURE:
 * - classification: Classification banner settings
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
		units: {
			altitude: "ft",
			distance: "nm",
			speed: "kts",
			angle: "deg",
		},
		theme: "dark",
		decimalPlaces: {
			coordinates: 6,
			altitude: 0,
			distance: 2,
			bearing: 1,
		},
	},

	// Feature flags and settings
	features: {
		sensorFootprint: {
			enabled: true,
			showNIIRS: true,
		},
		satcomAssessor: {
			enabled: true,
		},
		windedVector: {
			enabled: true,
		},
		airDeconfliction: {
			enabled: true,
		},

		// NEW: Interactive Map feature configuration
		interactiveMap: {
			enabled: false,

			// Elevation data settings
			showElevation: true,

			// Default basemap (id from available basemaps)
			// Options: 'osm', 'osm-humanitarian', 'opentopomap', 'carto-light',
			//          'carto-dark', 'esri-world-imagery', 'stamen-terrain'
			defaultBasemap: "osm",

			// Default map center [longitude, latitude] in WGS84
			defaultCenter: [-115.1398, 36.1699], // Las Vegas, NV

			// Default zoom level (0-19)
			defaultZoom: 10,

			// Offline/Air-gapped mode settings
			// When enabled, tiles will be loaded from localTileUrl instead of internet
			offlineMode: false,

			// Local tile server URL for offline mode
			// Uses {z}/{x}/{y} placeholders for tile coordinates
			// Example: "http://localhost:8080/tiles/{z}/{x}/{y}.png"
			// Set to null to use default online sources
			localTileUrl: null,

			// Local terrain tile URL for offline elevation data
			// Example: "http://localhost:8080/terrain/{z}/{x}/{y}.png"
			localTerrainUrl: null,

			// Custom basemaps (in addition to built-in options)
			// Each entry should have: id, name, url, attribution, maxZoom
			customBasemaps: [
				// Example:
				// {
				//   id: "local-osm",
				//   name: "Local OSM",
				//   url: "http://localhost:8080/osm/{z}/{x}/{y}.png",
				//   attribution: "Local tile server",
				//   maxZoom: 19,
				//   crossOrigin: "anonymous"
				// }
			],

			// Scale bar settings
			showScaleBar: true,
			useNauticalMiles: true, // false = kilometers

			// Coordinate display settings
			showCoordinateDisplay: true,
			defaultCoordinateFormat: "decimal", // "decimal", "dms", "mgrs"

			// Drawing/measurement settings
			enableDrawing: true,
			enableMeasurements: true,

			// Sensor footprint overlay integration
			enableSensorFootprintOverlay: true,
		},
	},

	// Performance settings
	performance: {
		debounceMs: 100,
		maxHistoryItems: 50,
		enableAnimations: true,
	},
};
