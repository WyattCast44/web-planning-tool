# Heading Change Functionality Usage Guide

## Overview

The `calculateGroundTrack` function now supports precise heading change calculations. Instead of running for a fixed duration, you can specify exactly how much heading change you want the aircraft to perform.

## New Parameter

```typescript
interface Params {
  // ... existing parameters ...
  
  /**
   * Optional: Desired heading change in degrees (absolute value)
   * Turn direction is determined by the AOB sign:
   * - Positive AOB = right turn
   * - Negative AOB = left turn
   * When provided, algorithm calculates optimal rollout timing
   * and ignores durationSeconds
   */
  headingChangeDeg?: number;
}
```

## Usage Examples

### Example 1: 90° Right Turn
```typescript
import { calculateGroundTrack } from './src/core/new';

const params = {
  ktas: 200, // 200 knots
  durationSeconds: 60, // Ignored when headingChangeDeg is provided
  rollRateDegSec: 3, // 3 degrees per second roll rate
  startingHdgDegCardinal: 0, // Starting heading North
  startingAngleOfBankDeg: 0, // Start from level flight
  maxAngleOfBankDeg: 30, // 30 degrees max bank (positive = right turn)
  windDegCardinal: 0, // No wind
  windSpeedKts: 0,
  gravityFtSecS2: 32.174,
  startingPosition: { x: 0, y: 0 },
  headingChangeDeg: 90 // 90 degree turn (direction determined by AOB)
};

const points = calculateGroundTrack(params);
// Aircraft will turn exactly 90° to the right
```

### Example 2: 180° Left Turn
```typescript
const params = {
  // ... same as above ...
  maxAngleOfBankDeg: -30, // -30 degrees max bank (negative = left turn)
  headingChangeDeg: 180 // 180 degree turn
};

const points = calculateGroundTrack(params);
// Aircraft will turn exactly 180° to the left
```

### Example 3: Full 360° Circle
```typescript
const params = {
  // ... same as above ...
  maxAngleOfBankDeg: 30, // Right turn
  headingChangeDeg: 360 // Complete 360° turn
};

const points = calculateGroundTrack(params);
// Aircraft will complete a full circle
```

### Example 4: Small Correction
```typescript
const params = {
  // ... same as above ...
  maxAngleOfBankDeg: -15, // Left turn
  headingChangeDeg: 5 // 5 degree correction
};

const points = calculateGroundTrack(params);
// Aircraft will make a small 5° left turn correction
```

## Backward Compatibility

The original functionality is preserved. When `headingChangeDeg` is not provided, the function behaves exactly as before:

```typescript
const params = {
  // ... other parameters ...
  durationSeconds: 60, // This will be used
  // headingChangeDeg is not provided
};

const points = calculateGroundTrack(params);
// Runs for exactly 60 seconds as before
```

## New Functions

### `calculateTurnPhases()`
Calculates the timing for each phase of a turn:

```typescript
import { calculateTurnPhases } from './src/core/new';

const phases = calculateTurnPhases(
  headingChangeDeg: number,
  ktas: number,
  rollRateDegSec: number,
  maxAngleOfBankDeg: number,
  startingAngleOfBankDeg: number,
  gravityFtSecS2: number
);

console.log(`Roll-in time: ${phases.rollInTimeSeconds}s`);
console.log(`Sustained turn time: ${phases.sustainedTurnTimeSeconds}s`);
console.log(`Roll-out time: ${phases.rollOutTimeSeconds}s`);
console.log(`Total time: ${phases.totalTimeSeconds}s`);
```

### `validateHeadingChange()`
Validates that a heading change is achievable:

```typescript
import { validateHeadingChange } from './src/core/new';

const validation = validateHeadingChange(
  headingChangeDeg: number,
  ktas: number,
  rollRateDegSec: number,
  maxAngleOfBankDeg: number,
  startingAngleOfBankDeg: number,
  gravityFtSecS2: number,
  maxDurationSeconds?: number // Optional, defaults to 300s
);

if (validation.isValid) {
  console.log('Heading change is achievable');
  console.log('Turn phases:', validation.turnPhases);
} else {
  console.error('Heading change not achievable:', validation.error);
}
```

## Key Benefits

1. **Precision**: Aircraft rolls out exactly at the desired heading
2. **No Overshooting**: Eliminates guesswork about when to start rollout
3. **Flexibility**: Works with any achievable heading change (1° to 360°+)
4. **Wind Aware**: Automatically accounts for wind effects
5. **Backward Compatible**: Existing code continues to work unchanged

## Phase Detection

The algorithm now properly detects three phases:

- **`rollingToMaxBank`**: Aircraft is rolling to maximum bank angle
- **`sustainedMaxBank`**: Aircraft is turning at maximum bank angle
- **`rollingToZeroBank`**: Aircraft is rolling out to level flight
- **`sustainedZeroBank`**: Aircraft is in level flight

## Error Handling

The function will throw descriptive errors for invalid inputs:

- `"Invalid heading change: Turn would take 600s, exceeding maximum duration of 300s"`
- `"Invalid heading change: Heading change is too small to be meaningful (minimum 0.1 degrees)"`
- `"Roll rate cannot be zero"`
- `"Airspeed must be positive"`

## Performance

The heading change calculation is mathematically precise and doesn't require iterative approximation, making it fast and reliable.
