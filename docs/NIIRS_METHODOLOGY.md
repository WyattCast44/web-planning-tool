# NIIRS Estimation Methodology (Updated)

## Overview

This document describes the NIIRS (National Imagery Interpretability Rating Scale) estimation implementation used in the EO/IR Footprint planning tool for airborne platforms (e.g., remotely piloted aircraft such as the MQ-9 Reaper). The implementation uses a simplified, empirically tuned version of the General Image Quality Equation (GIQE) optimized for mission planning purposes with EO and IR sensors.

## What is NIIRS?

NIIRS is a 0-9 scale used to rate the interpretability of imagery. Higher values indicate better image quality and the ability to discern finer details. The table below reflects standard Visible NIIRS criteria (IR imagery uses a separate but similar scale; adjustments are applied here for IR sensors).

| NIIRS | Interpretation Capability                                      |
|-------|----------------------------------------------------------------|
| 0     | Interpretability precluded by obscuration or degradation       |
| 1     | Detect large facilities (airfields, harbors)                   |
| 2     | Detect large buildings, identify road patterns                 |
| 3     | Detect individual buildings, vehicles as point targets         |
| 4     | Identify trucks vs cars, count rail cars                        |
| 5     | Identify vehicle types, detect aircraft components             |
| 6     | Identify aircraft type, detect vehicle features                |
| 7     | Identify aircraft variants, read vehicle markings              |
| 8     | Identify equipment details, read license plates                |
| 9     | Identify rivets, count wire strands                            |

## The General Image Quality Equation (GIQE)

### Reference GIQE Formula

The most widely used version for visible-band prediction is GIQE 4.0:

```
NIIRS ≈ 10.251 − 3.32 log₁₀(GSD_GM) + 1.559 log₁₀(RER) − 0.656 H − 0.344 (G/SNR)
```

Where GSD_GM is the geometric mean of horizontal and vertical ground-projected GSD (inches), RER is Relative Edge Response, H is overshoot height, and G/SNR is noise term.

Later versions (GIQE 5.0) introduce additional factors but are not publicly detailed in exact form.

### Why We Simplified

Full GIQE requires detailed sensor MTF, noise, and processing data that are rarely available during mission planning. For planning purposes, GSD dominates interpretability (typically 80–90% of variance). We therefore use a GSD-based model with practical adjustments calibrated against real airborne EO/IR system performance.

## Our Simplified Implementation

### Base Formula

```
NIIRS_base = 10.251 − 3.32 log₁₀(GSD_effective_inches)
```

The constant **10.251** is the standard GIQE 4.0 intercept for visible-band imagery and aligns well with empirical NIIRS ratings from modern airborne EO sensors (e.g., MTS-B, MX-20, and similar gimbal systems) under typical processing conditions.

### Ground Sample Distance (GSD) Calculation

GSD is calculated separately for horizontal (cross-track) and vertical (along-track) directions:

```
GSD_horizontal = (Slant_Range × pixel_IFOV_horizontal)
GSD_vertical   = (Slant_Range × pixel_IFOV_vertical)
```

Where pixel IFOV = FOV (radians) / number of pixels in that dimension.

We use the **geometric mean** for the effective GSD input to the equation (standard GIQE practice):

```
GSD_effective_nadir = √(GSD_horizontal × GSD_vertical)
```

All distances are converted to inches for the formula.

## Adjustment Factors

### Oblique Viewing (Off-Nadir) Correction

Off-nadir viewing primarily degrades resolution through GSD elongation on the ground plane.

Standard approximation for gimbal/staring systems:

- Cross-track GSD scales approximately with slant range (~1 / sin(depression angle))
- Along-track GSD is less affected or similarly scaled depending on sensor design

We use the widely accepted geometric mean approximation:

```
GSD_effective = GSD_effective_nadir × √(1 / sin(depression_angle))
```

This factor is applied directly in the base formula (increasing effective GSD → reducing NIIRS).

| Depression Angle | Grazing Angle | Elongation Factor | Approx. NIIRS Impact (from GSD term) |
|------------------|---------------|-------------------|-------------------------------------|
| 90° (nadir)      | 90°           | 1.00×             | 0.00                                |
| 60°              | 30°           | 1.07×             | −0.10                               |
| 45°              | 45°           | 1.19×             | −0.24                               |
| 30°              | 60°           | 1.41×             | −0.50                               |
| 20°              | 70°           | 1.73×             | −0.79                               |
| 15°              | 75°           | 1.97×             | −1.01                               |
| 10°              | 80°           | 2.40×             | −1.26                               |
| 5°               | 85°           | 3.39×             | −1.76                               |

#### Graduated Depression Angle Warnings

The tool provides estimates at low depression angles with graduated warnings:

| Depression Range | Warning Level | Message |
|------------------|---------------|---------|
| 30°+ | None | Normal operations |
| 15° – 30° | None | Acceptable for most targets |
| 10° – 15° | Caution | "Low depression - increased uncertainty" |
| 5° – 10° | Warning | "Very low depression - estimate may be optimistic" |
| < 5° | Invalid | N/A displayed - extreme obliquity |

#### When Low-Depression Estimates Are Reliable

Low-depression NIIRS estimates (5°–15°) are **more reliable** for:

- **Large targets**: Ships (500+ ft), large aircraft, facility-scale objects
- **Uncluttered backgrounds**: Open water, desert, sparse terrain
- **Detection/classification tasks**: "Is there a ship?" vs "What type of ship?"
- **Maritime ISR**: Surface combatant identification at standoff ranges

Low-depression estimates are **less reliable** for:

- **Small targets**: Vehicles, personnel, equipment details
- **Cluttered environments**: Urban areas, forests, complex terrain
- **Fine identification tasks**: License plates, markings, equipment specifics
- **Targets subject to occlusion**: Objects that may be hidden behind terrain/structures

No separate atmospheric path-length penalty is applied, as its effect is small compared to GSD elongation for typical planning altitudes and moderate obliquity.

### Atmospheric Degradation

| Condition   | Visibility | NIIRS Penalty | Rationale                          |
|-------------|------------|---------------|------------------------------------|
| Excellent   | >10 nm     | 0.0           | Near-ideal conditions              |
| Good        | 7–10 nm    | −0.2          | Minor haze effects                 |
| Moderate    | 4–7 nm     | −0.5          | Noticeable contrast loss           |
| Poor        | 2–4 nm     | −1.0          | Significant degradation            |
| Very Poor   | <2 nm      | −1.8          | Severe visibility limits           |

Penalties derived from empirical correlations between meteorological visibility and observed interpretability.

### Sensor Type Adjustment

IR sensors generally deliver lower NIIRS than visible sensors at equivalent GSD due to diffraction, detector noise, and contrast differences.

| Sensor Type | NIIRS Penalty | Rationale                                          |
|-------------|---------------|----------------------------------------------------|
| Visible (EO)| 0.0           | Baseline — highest contrast and resolution         |
| SWIR        | −0.1          | Slightly lower contrast than visible               |
| MWIR        | −0.3          | Thermal noise, typical detector resolution         |
| LWIR        | −0.5          | Diffraction limits, NETD, lower resolution arrays  |

### Digital Zoom Degradation

Digital zoom interpolates pixels without adding information:

```
Zoom_Penalty = 1.66 × log₁₀(Zoom_Factor)
```

(Equivalent to 0.5 × log₂(Zoom_Factor). Each 2× zoom costs ~0.5 NIIRS.)

| Digital Zoom | NIIRS Penalty |
|--------------|---------------|
| 1×           | 0.00          |
| 2×           | −0.50         |
| 4×           | −1.00         |
| 8×           | −1.50         |

## Final Formula

```
NIIRS = 10.251 
        − 3.32 log₁₀(GSD_effective_inches) 
        − Atmospheric_Penalty 
        − Sensor_Type_Penalty 
        − Zoom_Penalty
```

Where `GSD_effective_inches` already incorporates oblique elongation via the √(1/sin(depression)) factor.

Result is clamped to [0, 9]. Marked **N/A** if depression angle < 5°.

## Default Sensor Resolutions

| Sensor Type | Default Resolution | Basis                              |
|-------------|--------------------|------------------------------------|
| Visible/EO  | 1920 × 1080        | Common HD/Full-HD EO sensors       |
| MWIR        | 1280 × 1024 or 640 × 512 | Typical cooled MWIR arrays    |
| SWIR        | 640 × 512          | Common InGaAs arrays               |
| LWIR        | 640 × 512 or 640 × 480 | Common microbolometer arrays   |

## Maritime ISR Planning Considerations

For maritime surveillance and surface combatant identification at standoff ranges:

### Target Size Reference

| Target Class | Typical Length | NIIRS for Detection | NIIRS for Classification |
|--------------|----------------|---------------------|--------------------------|
| Small boat | 20-50 ft | 3-4 | 5-6 |
| Patrol craft | 100-200 ft | 2-3 | 4-5 |
| Frigate/Corvette | 300-400 ft | 1-2 | 3-4 |
| Destroyer/Cruiser | 500-600 ft | 1 | 2-3 |
| Carrier/Large deck | 800+ ft | 1 | 2 |

### Standoff Range Planning

At survivable standoff ranges (e.g., outside MRBM/ASCM threat rings), depression angles will typically be low (5°–20°). For large surface combatants:

- **NIIRS 2-3** is generally sufficient for classification (ship type)
- **NIIRS 4-5** enables identification of major features (weapons systems, deck equipment)
- Even with 2-3× GSD elongation, large combatants remain identifiable

### Example Scenario

- **Platform**: MQ-9 at 25,000 ft MSL
- **Target**: Surface combatant at 40 nm standoff
- **Depression angle**: ~6°
- **GSD elongation**: ~3×

Even with significant elongation, a 500 ft ship subtends many pixels, enabling reliable classification. The tool will display a warning but provide a usable NIIRS estimate.

## Limitations and Caveats

### Key Assumptions

The following assumptions are inherent in all calculations:

| Assumption | Description | Impact |
|------------|-------------|--------|
| **Line-of-sight** | Clear optical path from sensor to target; no terrain masking or obstructions | Tool does not account for terrain between aircraft and target |
| **Standard atmosphere** | No specific refraction modeling; assumes typical atmospheric light propagation | Minor effect at operational altitudes; visibility selector captures gross atmospheric effects |
| **Flat terrain at target** | Footprint calculated assuming flat ground at target elevation MSL | Sloped terrain will distort actual footprint shape |
| **Depression at target center** | Depression angle calculated to target point, not terrain surface | Actual depression to ground features may vary with local terrain |
| **Nadir-projected footprint** | Footprint corners projected vertically to target elevation plane | Does not model 3D terrain intersection |

### Not Modeled
- Detailed MTF/RER, SNR, overshoot, or motion blur
- Compression artifacts or advanced processing gains
- Geometric distortions (layover, foreshortening)
- Occlusion, shadows, or target-specific contrast/aspect effects
- Video-specific benefits (temporal cues in FMV)
- Sea state effects on maritime targets
- Atmospheric refraction at very long ranges

### Applicability Note
This model predicts **still-frame NIIRS**. For full-motion video (primary MQ-9 output), actual task performance may exceed predictions due to motion cues (consider Video NIIRS for video-specific planning when available).

### Expected Accuracy

| Condition | Expected Accuracy |
|-----------|-------------------|
| Clear, near-nadir, known sensor | ±0.5 NIIRS |
| Typical planning scenario | ±1.0 NIIRS |
| Low depression (10°–30°) | ±1.0 NIIRS (may be conservative for large targets) |
| Very low depression (5°–10°) | ±1.5 NIIRS (more reliable for large targets/maritime) |
| Poor visibility or IR sensors | Additional ±0.5 NIIRS uncertainty |

## References

1. Leachtenauer, J.C., et al. "General Image Quality Equation: GIQE." Applied Optics, 1997.
2. Driggers, R.G., et al. "Infrared Target Detectability and NIIRS." SPIE, various.
3. NGA documentation on NIIRS and GIQE (unclassified portions).
4. Empirical performance data from airborne EO/IR systems (MTS-B, MX-series, etc.).

## Version History

| Version | Date       | Changes                                                                 |
|---------|------------|-------------------------------------------------------------------------|
| 1.0     | 2024       | Initial implementation                                                  |
| 2.0     | 2025-12-30 | Updated to align with standard GIQE 4.0 practices; refined oblique model; removed separate path penalty; clarified still-frame vs. video applicability |
| 2.1     | 2025-12-30 | Lowered minimum depression to 5°; added graduated warnings; added maritime ISR planning guidance for large target identification at standoff ranges |
| 2.2     | 2025-12-30 | Added explicit Key Assumptions section documenting line-of-sight, terrain, and atmospheric assumptions |