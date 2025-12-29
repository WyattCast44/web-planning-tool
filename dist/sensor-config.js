/**
 * SENSOR CONFIGURATION FILE
 * 
 * Place this file in the same directory as the planning tool HTML file.
 * Edit the values below to match your platform's sensor specifications.
 * 
 * STRUCTURE:
 * - platform: Aircraft/RPA identifier
 * - turret: Physical gimbal limits
 * - sensors: Array of sensor systems (e.g., MTS-B, BLOS Pod)
 *   - Each sensor has multiple cameras (EO, MWIR, SWIR, etc.)
 *   - Each camera has multiple lenses (focal lengths/FOV settings)
 *   - Digital zoom is a divisor applied to any lens's FOV
 */

window.SENSOR_CONFIG = {
  platform: "MQ-9A",
  
  turret: {
    // Gimbal physical limits
    minAzimuth: -180,      // degrees, negative = left of nose
    maxAzimuth: 180,       // degrees, positive = right of nose
    minDepression: 0,      // degrees, 0 = level with flight path
    maxDepression: 120,    // degrees, 90 = nadir, >90 = aft-looking
  },

  sensors: [
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
    {
      id: "blos-pod",
      name: "BLOS Pod",
      cameras: [
        {
          id: "blos-eo",
          name: "EO",
          type: "visible",
          lenses: [
            {
              id: "blos-eo-wide",
              name: "Wide",
              hfov: 25.0,
              vfov: 18.75,
            },
            {
              id: "blos-eo-narrow",
              name: "Narrow",
              hfov: 5.0,
              vfov: 3.75,
            },
          ],
          digitalZoom: [1, 2, 4],
        },
        {
          id: "blos-ir",
          name: "IR",
          type: "ir-mw",
          lenses: [
            {
              id: "blos-ir-wide",
              name: "Wide",
              hfov: 18.0,
              vfov: 13.5,
            },
            {
              id: "blos-ir-narrow",
              name: "Narrow",
              hfov: 3.0,
              vfov: 2.25,
            },
          ],
          digitalZoom: [1, 2],
        },
      ],
    },
  ],

  // Default display preferences
  defaults: {
    units: "nmi",
  },
};


/**
 * EXAMPLE: Minimal config for a simpler system
 * 
 * window.SENSOR_CONFIG = {
 *   platform: "Simple UAV",
 *   turret: {
 *     minAzimuth: -180,
 *     maxAzimuth: 180,
 *     minDepression: 0,
 *     maxDepression: 90,
 *   },
 *   sensors: [
 *     {
 *       id: "basic",
 *       name: "Basic Sensor",
 *       cameras: [
 *         {
 *           id: "eo",
 *           name: "EO",
 *           type: "visible",
 *           lenses: [
 *             { id: "eo-default", name: "Default", hfov: 20.0, vfov: 15.0 },
 *           ],
 *           digitalZoom: [1, 2],
 *         },
 *       ],
 *     },
 *   ],
 *   defaults: { units: "km" },
 * };
 */
