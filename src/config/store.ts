/**
 * Application Configuration Store
 * 
 * Provides centralized access to app configuration loaded from app-config.js
 * Uses Zustand for performant, reactive config access throughout the app.
 */

import { create } from "zustand";
import type { AppConfig } from "../types";
import { DEFAULT_APP_CONFIG } from "../types";

/**
 * Get app config from window or use default
 */
function getAppConfig(): AppConfig {
  if (typeof window !== "undefined" && window.APP_CONFIG) {
    return window.APP_CONFIG;
  }
  return DEFAULT_APP_CONFIG;
}

interface ConfigState {
  config: AppConfig;
  /**
   * Update the entire config (useful for hot-reloading or runtime changes)
   */
  setConfig: (config: AppConfig) => void;
  /**
   * Get sensor config (convenience method)
   */
  getSensorConfig: () => AppConfig["sensors"];
  /**
   * Get display config (convenience method)
   */
  getDisplayConfig: () => AppConfig["display"];
  /**
   * Get feature config (convenience method)
   */
  getFeatureConfig: () => AppConfig["features"];
  /**
   * Get performance config (convenience method)
   */
  getPerformanceConfig: () => AppConfig["performance"];
  /**
   * Get classification config (convenience method)
   */
  getClassificationConfig: () => AppConfig["classification"];
}

/**
 * Config store - initialized with config from window.APP_CONFIG or defaults
 */
export const useConfigStore = create<ConfigState>()((set, get) => ({
  config: getAppConfig(),

  setConfig: (config) => set({ config }),

  getSensorConfig: () => get().config.sensors,

  getDisplayConfig: () => get().config.display,

  getFeatureConfig: () => get().config.features,

  getPerformanceConfig: () => get().config.performance,

  getClassificationConfig: () => get().config.classification,
}));

/**
 * Initialize config store when module loads
 * This ensures the config is available immediately
 */
if (typeof window !== "undefined") {
  // Listen for config updates (useful for hot-reloading during development)
  const updateConfig = () => {
    const newConfig = getAppConfig();
    useConfigStore.getState().setConfig(newConfig);
  };

  // Update config when window.APP_CONFIG changes
  // This is useful if the config is loaded asynchronously
  if (window.APP_CONFIG) {
    updateConfig();
  } else {
    // If config isn't loaded yet, wait for it
    // The script tag has defer attribute, so it should load before DOMContentLoaded
    const checkInterval = setInterval(() => {
      if (window.APP_CONFIG) {
        updateConfig();
        clearInterval(checkInterval);
      }
    }, 50);

    // Also listen for DOMContentLoaded as a fallback
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        updateConfig();
        clearInterval(checkInterval);
      });
    }

    // Stop checking after 5 seconds (config should be loaded by then)
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  // Support for legacy SENSOR_CONFIG (convert to new format if needed)
  if (window.SENSOR_CONFIG && !window.APP_CONFIG) {
    // Convert legacy config to new format
    const legacyConfig = window.SENSOR_CONFIG;
    const convertedConfig: AppConfig = {
      sensors: {
        turret: legacyConfig.turret,
        sensorSystems: legacyConfig.sensors || [],
      },
      classification: {
        bannerEnabled: true,
        level: "U",
        sar: false,
        bannerText: "",
      },
      display: {
        defaultDistanceUnit: legacyConfig.defaults?.units || "nmi",
        decimalPlaces: {
          distance: 2,
          speed: 1,
          angle: 1,
          altitude: 1,
        },
      },
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
      },
      performance: {
        canvas: {
          maxFps: 60,
          enableAntialiasing: true,
        },
        enableCaching: true,
        cacheSize: 1000,
      },
    };
    window.APP_CONFIG = convertedConfig;
    updateConfig();
  }
}

/**
 * Convenience hooks for accessing specific config sections
 */
export const useSensorConfig = () => useConfigStore((state) => state.config.sensors);
export const useDisplayConfig = () => useConfigStore((state) => state.config.display);
export const useFeatureConfig = () => useConfigStore((state) => state.config.features);
export const usePerformanceConfig = () => useConfigStore((state) => state.config.performance);
export const useClassificationConfig = () => useConfigStore((state) => state.config.classification);

/**
 * Convenience selectors for common config values
 */
export const useDefaultDistanceUnit = () => 
  useConfigStore((state) => state.config.display.defaultDistanceUnit);

