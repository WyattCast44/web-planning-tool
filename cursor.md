# Planner - AI Development Guide

## Project Overview

A React-based aviation mission planning toolkit with specialized calculators for flight operations, sensor footprint analysis, satellite communications assessment, air deconfliction, and unit conversions. Built for precision and usability in flight planning contexts.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7 with single-file output plugin
- **Styling**: Tailwind CSS 4 with custom theme
- **State Management**: Zustand 5 (lightweight store)
- **Validation**: Zod 4 (runtime schema validation in core math functions)
- **Testing**: Vitest

## Project Structure

```
src/
├── App.tsx              # Main app - composes panels, manages command palette
├── main.tsx             # React entry point
├── store.ts             # Zustand global state (aircraft params, derived values)
├── types.ts             # Shared TypeScript interfaces, constants, AppConfig
├── index.css            # Global styles, Tailwind config, custom classes
├── config/
│   └── store.ts         # Runtime config store (loaded from app-config.js)
├── core/                # Pure utility functions (no React)
│   ├── math.ts          # Aviation math, coordinate transforms, Zod-validated
│   ├── conversions.ts   # Unit conversions (length, speed)
│   ├── canvas.ts        # Shared canvas drawing utilities
│   ├── groundTrack.ts   # RK4 numerical integration for flight paths
│   ├── niirs.ts         # Image quality calculations (GIQE 4.0)
│   ├── satcom.ts        # Satellite pointing calculations
│   └── deconfliction.ts # Air traffic separation calculations
└── components/
    ├── Panel.tsx             # Reusable bezel-styled container
    ├── CommandPalette.tsx    # Global command palette (Ctrl+K)
    ├── ClassificationBanner.tsx # Classification banner (U/CUI/S/TS)
    ├── shared/               # Reusable input components
    │   ├── InputField.tsx
    │   └── ConversionTable.tsx
    ├── SixPack/              # Primary flight instruments input
    ├── SatcomAssessor/       # Satellite pointing calculator
    ├── WindedVector/         # Wind-corrected turn visualization
    ├── SensorFootprint/      # EO/IR sensor coverage calculator
    ├── GlideSlope/           # Approach path visualizer
    ├── AirDeconfliction.tsx  # Traffic separation calculator
    ├── RangeConversion.tsx   # Ground/slant/depression converter
    ├── LengthConversion.tsx  # Length unit converter
    └── SpeedConversion.tsx   # Speed unit converter
```

## Architecture Patterns

### Component Organization

Each major feature is a self-contained folder with:
- `FeatureName.tsx` - Main component (orchestrates state and layout)
- `InputControls.tsx` - Form inputs specific to the feature
- `DisplayOptions.tsx` - Toggle switches and display settings
- `GraphCanvas.tsx` - Canvas-based visualization
- `*Utils.ts` - Pure helper functions for calculations

Simpler tools (converters, deconfliction) are single-file components.

### State Management

**Two Zustand Stores:**

1. **App Store** (`store.ts`) - Aircraft flight parameters:
   - User inputs: altitude, heading, airspeed, wind
   - Derived values calculated via subscriptions (KTAS, Mach, GS, HAT)
   - Shared across multiple components

2. **Config Store** (`config/store.ts`) - Runtime configuration:
   - Loaded from `public/app-config.js` (or defaults)
   - Sensor systems, display settings, feature flags, classification
   - Convenience hooks: `useSensorConfig()`, `useFeatureConfig()`, etc.

**Local state** (useState):
- Component-specific settings (zoom levels, display toggles)
- Form inputs that don't need to persist globally

**Zustand Patterns:**

```typescript
// Setter functions exported separately for cleaner imports
export const setAltKft = (altKft: number) => useAppStore.setState({ altKft });

// IMPORTANT: Use useShallow for object selectors to prevent infinite loops
import { useShallow } from "zustand/react/shallow";

const state = useAppStore(
  useShallow((state) => ({
    altKft: state.altKft,
    hdgDegCardinal: state.hdgDegCardinal,
  }))
);

// Convenience hooks for config sections
export const useFeatureConfig = () => useConfigStore((state) => state.config.features);
```

### Feature Flags

Tools can be enabled/disabled via `app-config.js`:

```typescript
// In component
const features = useFeatureConfig();

// In JSX
{features.satcomAssessor.enabled && <SatcomAssessor />}
```

### Core Utilities

All core utilities are pure functions with no side effects:
- Heavy use of JSDoc comments for documentation
- Zod schemas for runtime validation in critical math functions
- Functions return calculated values, never modify state directly
- Constants exported with SCREAMING_SNAKE_CASE
- Test files colocated: `*.test.ts`

## Coding Conventions

### TypeScript

- Use `interface` for object shapes, `type` for unions/aliases
- Export types explicitly: `export type { TypeName }`
- Props interfaces defined in the same file as the component
- Avoid `any` - use proper typing or `unknown` if truly dynamic
- Use `as const` for literal arrays/objects used in type inference

### Naming Conventions

**Variables & Functions**:
- camelCase for variables and functions
- Descriptive names that include units: `altKft`, `slantRangeFt`, `hdgDegCardinal`
- Boolean prefixes: `show*`, `is*`, `has*`
- Setters: `set*` (e.g., `setAltKft`)

**Constants**:
- SCREAMING_SNAKE_CASE: `EARTH_RADIUS_FT`, `DEFAULT_CONFIG`
- Grouped in objects when related: `UNITS`, `ATMOSPHERIC_FACTORS`

**Files**:
- PascalCase for React components: `InputControls.tsx`
- camelCase for utility files: `groundTrack.ts`

### React Patterns

**Components**:
- Named exports preferred over default exports
- Props destructured in function signature
- `useMemo` for expensive calculations, especially geometry/math
- `useCallback` for event handlers passed to children or in deps arrays
- Canvas components use `useLayoutEffect` for initial render, `useEffect` for resize handlers

**Event Handlers**:
- Inline for simple cases: `onChange={(e) => setValue(Number(e.target.value))}`
- Named functions for complex logic: `function handleMouseMove(e) { ... }`

**Global Keyboard Shortcuts** (see App.tsx):
```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    setPaletteOpen((open) => !open);
  }
}, []);

useEffect(() => {
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [handleKeyDown]);
```

### CSS/Styling

- Tailwind utility classes in JSX
- Custom theme in `index.css` using `@theme` directive
- Custom classes for repeated patterns: `.bezel`, `.bg-grid`, `.bg-bezel-gradient`
- Color palette: emerald for primary/success, red for headers/warnings, gray for neutrals
- Fonts: Orbitron (`font-display`), Roboto Mono (`font-mono`)
- Input focus styles defined globally with emerald glow effect

### Input Elements

All inputs should have:
- Unique `id` attribute for accessibility and command palette navigation
- Associated `<label>` with `htmlFor` matching the input id
- Appropriate `min`, `max`, `step` for numeric inputs

```tsx
<label htmlFor="altKft">MSL</label>
<input id="altKft" type="number" min={0} max={100} step={0.1} />
```

## Best Practices

### Performance
- Pre-calculate constants outside loops
- Use `useMemo` for geometry calculations that depend on multiple inputs
- **Use `useShallow` from zustand when selecting multiple values** to prevent infinite render loops
- Canvas: setup for device pixel ratio once, then reuse context

### Validation
- Use Zod schemas for runtime validation of numeric inputs in core math
- Use `.catch()` for safe defaults instead of throwing
- Validate at boundaries (user inputs), trust internal code

### Canvas Drawing
- Always handle high-DPI displays with devicePixelRatio scaling
- Clear canvas before redraw
- Group related drawing operations (grid, overlays, data)
- Use shared utilities from `core/canvas.ts`

### Code Organization
- Keep components focused - split into sub-components when >150 lines
- Pure calculation functions go in `core/` or `*Utils.ts` files
- Avoid deep prop drilling - consider colocating state

## Domain-Specific Notes

### Aviation Terminology
- `hdgDegCardinal`: Heading in compass degrees (0/360 = North, 90 = East)
- `degMath`: Math convention (0 = East, CCW positive)
- `kft`: Thousands of feet (altitude)
- `KTAS/KEAS`: True/Equivalent airspeed in knots
- `AOB`: Angle of Bank
- `HAT`: Height Above Target
- `GS`: Ground Speed
- `CPA`: Closest Point of Approach
- `ETA`: Estimated Time of Arrival

### Coordinate Systems
- Canvas: origin top-left, Y increases downward
- Aviation: North-up, cardinal degrees clockwise from North
- Conversion functions: `degCardinalToDegMath()`, `degMathToDegCardinal()`

### Units
- Store values in base units (feet, knots, degrees)
- Convert to display units at render time
- Use explicit unit suffixes in variable names

## Runtime Configuration

The app supports runtime configuration via `public/app-config.js`:
- Loaded as a global `window.APP_CONFIG`
- Falls back to `DEFAULT_APP_CONFIG` in `types.ts`
- Sections: `classification`, `sensors`, `display`, `features`, `performance`

### Classification Banner
- Controlled via `classification.bannerEnabled` and `classification.level`
- Levels: `U` (green), `CUI` (purple), `S`/`TS` (red)
- SAR mode overrides with orange banner

### Feature Flags
```javascript
features: {
  sensorFootprint: { enabled: true, showNIIRS: true },
  satcomAssessor: { enabled: true },
  windedVector: { enabled: true },
  airDeconfliction: { enabled: true },
}
```

## Command Palette

The app includes a command palette (`Ctrl+K` / `Cmd+K`) for:
1. **Quick navigation** - Jump to any tool and focus its first input
2. **Value setting** - Update six-pack values without clicking (e.g., `hdg 180`)

When adding new tools, update `TOOLS` array in `CommandPalette.tsx`:
```typescript
{ id: "mytool", name: "My Tool", selector: "#firstInputId", keywords: ["search", "terms"] }
```

## Development Commands

```bash
yarn dev      # Start development server
yarn build    # TypeScript check + Vite build (outputs single HTML file)
yarn lint     # ESLint check
yarn test     # Run tests in watch mode
yarn test:run # Run tests once
yarn preview  # Preview production build
```

## Common Pitfalls

1. **Zustand infinite loops**: Always use `useShallow` when returning objects from selectors
2. **Missing input IDs**: Every input needs a unique `id` for command palette navigation
3. **Unit confusion**: Variable names should always include unit suffix (`Kft`, `Deg`, `Ft`)
4. **Canvas blurriness**: Always scale for `devicePixelRatio`
