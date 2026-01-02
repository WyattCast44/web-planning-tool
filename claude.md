# Planner - AI Development Guide

## Project Overview

A React-based aviation mission planning toolkit with specialized calculators for flight operations, sensor footprint analysis, satellite communications assessment, and unit conversions. Built for precision and usability in flight planning contexts.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7 with single-file output plugin
- **Styling**: Tailwind CSS 4 with custom theme
- **State Management**: Zustand 5 (lightweight store)
- **Validation**: Zod 4 (runtime schema validation in core math functions)
- **Testing**: Vitest (available but tests not yet written)

## Project Structure

```
src/
├── App.tsx              # Main app component - composes all panels
├── main.tsx             # React entry point
├── store.ts             # Zustand global state (aircraft params)
├── types.ts             # Shared TypeScript interfaces and constants
├── index.css            # Global styles, Tailwind config, custom classes
├── core/                # Pure utility functions (no React)
│   ├── math.ts          # Aviation math, coordinate transforms, Zod-validated
│   ├── conversions.ts   # Unit conversions (length, speed)
│   ├── canvas.ts        # Shared canvas drawing utilities
│   ├── groundTrack.ts   # RK4 numerical integration for flight paths
│   └── niirs.ts         # Image quality calculations (GIQE 4.0)
└── components/
    ├── Panel.tsx        # Reusable bezel-styled container
    ├── shared/          # Reusable input components
    │   ├── InputField.tsx
    │   └── ConversionTable.tsx
    ├── SixPack/         # Primary flight instruments input
    ├── SatcomAssessor/  # Satellite pointing calculator
    ├── WindedVector/    # Wind-corrected turn visualization
    ├── SensorFootprint/ # EO/IR sensor coverage calculator
    ├── GlideSlope/      # Approach path visualizer (unused currently)
    ├── LengthConversion.tsx
    └── SpeedConversion.tsx
```

## Architecture Patterns

### Component Organization

Each major feature is a self-contained folder with:
- `FeatureName.tsx` - Main component (orchestrates state and layout)
- `InputControls.tsx` - Form inputs specific to the feature
- `DisplayOptions.tsx` - Toggle switches and display settings
- `GraphCanvas.tsx` - Canvas-based visualization
- `*Utils.ts` - Pure helper functions for calculations

### State Management

**Global state** (Zustand in `store.ts`):
- Aircraft flight parameters: altitude, heading, airspeed, wind
- Derived values calculated via subscriptions
- Used for values shared across multiple components

**Local state** (useState):
- Component-specific settings (zoom levels, display toggles)
- Form inputs that don't need to persist globally

**Pattern**: Setter functions are exported separately from the store for cleaner imports:
```typescript
export const setAltKft = (altKft: number) => useAppStore.setState({ altKft });
```

### Core Utilities

All core utilities are pure functions with no side effects:
- Heavy use of JSDoc comments for documentation
- Zod schemas for runtime validation in critical math functions
- Functions return calculated values, never modify state directly
- Constants exported with SCREAMING_SNAKE_CASE

## Coding Conventions

### TypeScript

- Use `interface` for object shapes, `type` for unions/aliases
- Export types explicitly: `export type { TypeName }`
- Props interfaces defined in the same file as the component
- Avoid `any` - use proper typing or `unknown` if truly dynamic

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
- Canvas components use `useLayoutEffect` for initial render, `useEffect` for resize handlers

**Event Handlers**:
- Inline for simple cases: `onChange={(e) => setValue(Number(e.target.value))}`
- Named functions for complex logic: `function handleMouseMove(e) { ... }`

### CSS/Styling

- Tailwind utility classes in JSX
- Custom theme in `index.css` using `@theme` directive
- Custom classes for repeated patterns: `.bezel`, `.bg-grid`, `.bg-bezel-gradient`
- Color palette: emerald for primary/success, red for headers/errors, gray for neutrals
- Fonts: Orbitron (display), Roboto Mono (monospace data)

## Best Practices

### Performance
- Pre-calculate constants outside loops
- Use `useMemo` for geometry calculations that depend on multiple inputs
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

### Coordinate Systems
- Canvas: origin top-left, Y increases downward
- Aviation: North-up, cardinal degrees clockwise from North
- Conversion functions: `degCardinalToDegMath()`, `degMathToDegCardinal()`

### Units
- Store values in base units (feet, knots, degrees)
- Convert to display units at render time
- Use explicit unit suffixes in variable names

## External Configuration

The app supports runtime sensor configuration via `public/sensor-config.js`:
- Loaded as a global `window.SENSOR_CONFIG`
- Falls back to `DEFAULT_CONFIG` in `types.ts`
- Used for EO/IR sensor specifications (FOV, resolution, zoom levels)

## Development Commands

```bash
yarn dev      # Start development server
yarn build    # TypeScript check + Vite build (outputs single HTML file)
yarn lint     # ESLint check
yarn preview  # Preview production build
```

