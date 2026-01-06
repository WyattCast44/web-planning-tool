import { describe, it, expect } from "vitest";
import {
  calculateDeconfliction,
  calculateWorstCaseTraffic,
  formatTime,
} from "./deconfliction";

describe("calculateDeconfliction", () => {
  describe("ETA calculations", () => {
    it("calculates correct ETAs for both aircraft", () => {
      // 100 NM at 200 kts = 0.5 hours = 1800 seconds
      // 50 NM at 100 kts = 0.5 hours = 1800 seconds
      const result = calculateDeconfliction(100, 200, 50, 100);
      expect(result.ownEta).toBe(1800);
      expect(result.trafficEta).toBe(1800);
    });

    it("calculates correct time separation", () => {
      // Ownship: 100 NM at 200 kts = 1800s
      // Traffic: 100 NM at 100 kts = 3600s
      // Separation = 1800s
      const result = calculateDeconfliction(100, 200, 100, 100);
      expect(result.timeSeparation).toBe(1800);
    });
  });

  describe("firstToArrive determination", () => {
    it("returns ownship when ownship arrives first", () => {
      // Ownship: 50 NM at 200 kts = 900s
      // Traffic: 100 NM at 200 kts = 1800s
      const result = calculateDeconfliction(50, 200, 100, 200);
      expect(result.firstToArrive).toBe("ownship");
    });

    it("returns traffic when traffic arrives first", () => {
      // Ownship: 100 NM at 200 kts = 1800s
      // Traffic: 50 NM at 200 kts = 900s
      const result = calculateDeconfliction(100, 200, 50, 200);
      expect(result.firstToArrive).toBe("traffic");
    });

    it("returns simultaneous when arrivals are within 1 second", () => {
      // Both arrive at exactly the same time
      const result = calculateDeconfliction(100, 200, 100, 200);
      expect(result.firstToArrive).toBe("simultaneous");
    });
  });

  describe("status determination", () => {
    it("returns red for simultaneous arrival", () => {
      const result = calculateDeconfliction(100, 200, 100, 200);
      expect(result.status).toBe("red");
    });

    it("returns red for less than 2 minutes separation", () => {
      // 60 seconds separation
      // Ownship: 100 NM at 360 kts = 1000s
      // Traffic: 100 NM at 327.27 kts ≈ 1100s (100s diff)
      const result = calculateDeconfliction(100, 360, 100, 327.27);
      expect(result.timeSeparation).toBeLessThan(120);
      expect(result.status).toBe("red");
    });

    it("returns yellow for 2-5 minutes separation", () => {
      // Ownship: 100 NM at 200 kts = 1800s
      // Traffic: 100 NM at 150 kts = 2400s
      // Separation = 600s = 10 min -> green
      // Need smaller separation for yellow
      // Ownship: 100 NM at 200 kts = 1800s
      // Traffic: 100 NM at 166.67 kts = 2160s
      // Separation = 360s = 6 min -> still green
      // Traffic: 100 NM at 181.82 kts = 1980s
      // Separation = 180s = 3 min -> yellow
      const result = calculateDeconfliction(100, 200, 100, 181.82);
      expect(result.timeSeparation / 60).toBeGreaterThanOrEqual(2);
      expect(result.timeSeparation / 60).toBeLessThan(5);
      expect(result.status).toBe("yellow");
    });

    it("returns green for 5+ minutes separation", () => {
      // Ownship: 100 NM at 200 kts = 1800s
      // Traffic: 100 NM at 100 kts = 3600s
      // Separation = 1800s = 30 min -> green
      const result = calculateDeconfliction(100, 200, 100, 100);
      expect(result.timeSeparation / 60).toBeGreaterThanOrEqual(5);
      expect(result.status).toBe("green");
    });
  });

  describe("CPA calculations", () => {
    it("calculates CPA for equal speeds", () => {
      // Equal speeds meeting at same point = 0 CPA distance
      const result = calculateDeconfliction(100, 200, 100, 200);
      expect(result.cpaDistanceNm).toBe(0);
    });

    it("calculates non-zero CPA for different speeds", () => {
      const result = calculateDeconfliction(100, 200, 100, 100);
      expect(result.cpaDistanceNm).toBeGreaterThan(0);
    });
  });
});

describe("calculateWorstCaseTraffic", () => {
  describe("edge cases", () => {
    it("returns null trafficEta for zero traffic distance", () => {
      const result = calculateWorstCaseTraffic(0, 200, 1800, 10);
      expect(result.trafficEta).toBeNull();
    });

    it("returns null trafficEta for zero traffic speed", () => {
      const result = calculateWorstCaseTraffic(100, 0, 1800, 10);
      expect(result.trafficEta).toBeNull();
    });

    it("returns base GS when no ownship ETA", () => {
      const result = calculateWorstCaseTraffic(100, 200, null, 10);
      expect(result.worstCaseTrafficGs).toBe(200);
      expect(result.trafficEta).toBe(1800); // 100/200 * 3600
    });

    it("returns base GS when MOE is zero", () => {
      const result = calculateWorstCaseTraffic(100, 200, 1800, 0);
      expect(result.worstCaseTrafficGs).toBe(200);
    });
  });

  describe("MOE worst case selection", () => {
    it("uses exact matching speed when base speed matches ownship ETA", () => {
      // Ownship ETA: 1800s
      // Traffic: 100 NM at 200 kts = 1800s (same time)
      // Matching speed = 100 * 3600 / 1800 = 200 kts (within MOE range)
      const result = calculateWorstCaseTraffic(100, 200, 1800, 10);
      expect(result.worstCaseTrafficGs).toBe(200);
      expect(result.trafficEta).toBeCloseTo(1800, 1);
    });

    it("uses matching speed when it falls within MOE range", () => {
      // Ownship ETA: 1636s (would need 220 kts for traffic to match)
      // Traffic base: 200 kts, MOE 10% -> range [180, 220]
      // Matching speed = 100 * 3600 / 1636 ≈ 220 kts (within range)
      const result = calculateWorstCaseTraffic(100, 200, 1636, 10);
      expect(result.worstCaseTrafficGs).toBeCloseTo(220, 0);
      expect(result.trafficEta).toBeCloseTo(1636, 0); // Within 0.5s
    });

    it("clamps to high bound when matching speed exceeds MOE range", () => {
      // Ownship ETA: 900s (arrives in 15 min)
      // Matching speed = 100 * 3600 / 900 = 400 kts (way above range)
      // Traffic base: 200 kts, MOE 10% -> range [180, 220]
      // Should clamp to 220 kts (closest to matching)
      const result = calculateWorstCaseTraffic(100, 200, 900, 10);
      expect(result.worstCaseTrafficGs).toBeCloseTo(220, 5);
    });

    it("clamps to low bound when matching speed is below MOE range", () => {
      // Ownship ETA: 2700s (arrives in 45 min)
      // Matching speed = 100 * 3600 / 2700 ≈ 133 kts (below range)
      // Traffic base: 200 kts, MOE 10% -> range [180, 220]
      // Should clamp to 180 kts (closest to matching)
      const result = calculateWorstCaseTraffic(100, 200, 2700, 10);
      expect(result.worstCaseTrafficGs).toBeCloseTo(180, 5);
    });

    it("finds worst case within range even at high MOE", () => {
      // User's bug case: ownship at 248 kts, traffic base 200 kts
      // Ownship: 200 NM at 248 kts = 2903.2s ETA
      // Traffic: 200 NM, base 200 kts, MOE 25% -> range [150, 250]
      // Matching speed = 200 * 3600 / 2903.2 ≈ 248 kts (within range!)
      const ownEta = (200 / 248) * 3600; // ≈ 2903.2s
      const result = calculateWorstCaseTraffic(200, 200, ownEta, 25);
      expect(result.worstCaseTrafficGs).toBeCloseTo(248, 0);
      expect(result.trafficEta).toBeCloseTo(ownEta, 1); // Near-simultaneous
    });

    it("handles the 24% vs 25% MOE case correctly", () => {
      // With 24% MOE: range is [152, 248] - 248 is at the boundary
      // With 25% MOE: range is [150, 250] - 248 is well within range
      // Both should find 248 kts as worst case if ownship is at 248 kts
      const ownEta = (200 / 248) * 3600;
      
      const result24 = calculateWorstCaseTraffic(200, 200, ownEta, 24);
      const result25 = calculateWorstCaseTraffic(200, 200, ownEta, 25);
      
      // Both should find ~248 kts (matching ownship)
      expect(result24.worstCaseTrafficGs).toBeCloseTo(248, 0);
      expect(result25.worstCaseTrafficGs).toBeCloseTo(248, 0);
      
      // Time separations should be nearly identical (near zero)
      expect(Math.abs(result24.trafficEta! - ownEta)).toBeLessThan(1);
      expect(Math.abs(result25.trafficEta! - ownEta)).toBeLessThan(1);
    });

    it("correctly handles traffic arriving before ownship", () => {
      // Ownship ETA: 3600s (arrives in 60 min)
      // Matching speed = 100 * 3600 / 3600 = 100 kts
      // Traffic base: 200 kts, MOE 10% -> range [180, 220]
      // 100 kts is below range, so clamp to 180 kts
      const result = calculateWorstCaseTraffic(100, 200, 3600, 10);
      expect(result.worstCaseTrafficGs).toBeCloseTo(180, 5);
    });
  });

  describe("symmetric scenarios", () => {
    it("handles case where ownship and traffic are equidistant with same speed", () => {
      // Both 100 NM, ownship at 200 kts -> ETA 1800s
      // Matching speed = 100 * 3600 / 1800 = 200 kts (exactly base)
      const result = calculateWorstCaseTraffic(100, 200, 1800, 10);
      expect(result.worstCaseTrafficGs).toBe(200);
      expect(result.trafficEta).toBeCloseTo(1800, 1);
    });
  });
});

describe("formatTime", () => {
  it("returns em-dash for null", () => {
    expect(formatTime(null)).toBe("—");
  });

  it("formats seconds only when under 1 minute", () => {
    expect(formatTime(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125)).toBe("2m 05s");
  });

  it("pads seconds with leading zero", () => {
    expect(formatTime(65)).toBe("1m 05s");
  });

  it("handles exact minutes", () => {
    expect(formatTime(120)).toBe("2m 00s");
  });

  it("handles large values", () => {
    expect(formatTime(3665)).toBe("61m 05s");
  });

  it("rounds seconds", () => {
    expect(formatTime(65.7)).toBe("1m 06s");
  });
});

