/**
 * Component Tests
 * 
 * Tests for React components using @testing-library/react.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CoordinateDisplay, CoordinateDisplayCompact } from './CoordinateDisplay';
import { BasemapSelector, BasemapButtonGroup } from './BasemapSelector';
import { DrawingTools, DrawingToolsCompact } from './DrawingTools';
import { MapControls, FullscreenButton, SettingsPanel } from './MapControls';
import { useMapStore } from './mapStore';
import { DEFAULT_BASEMAPS } from './mapUtils';

// Reset store before each test
beforeEach(() => {
  useMapStore.setState({
    view: {
      center: [-115.1398, 36.1699],
      zoom: 10,
      rotation: 0,
    },
    coordinateFormat: 'decimal',
    mouseCoordinate: null,
    mouseElevation: null,
    elevationLoading: false,
    activeBasemapId: 'osm',
    availableBasemaps: DEFAULT_BASEMAPS,
    drawMode: 'none',
    drawnFeatures: [],
    selectedFeatureId: null,
    isFullscreen: false,
    showCoordinateDisplay: true,
    showElevation: true,
    showScaleBar: true,
    useNauticalMiles: true,
    showSensorFootprint: false,
    sensorFootprintCenter: null,
    offlineMode: false,
    localTileUrl: null,
  });
});

afterEach(() => {
  cleanup();
});

// ============================================================================
// COORDINATE DISPLAY TESTS
// ============================================================================

describe('CoordinateDisplay', () => {
  it('renders without crashing', () => {
    render(<CoordinateDisplay />);
    
    expect(screen.getByText('Format:')).toBeInTheDocument();
  });

  it('shows format selector buttons', () => {
    render(<CoordinateDisplay />);
    
    expect(screen.getByText('Decimal')).toBeInTheDocument();
    expect(screen.getByText('DMS')).toBeInTheDocument();
    expect(screen.getByText('MGRS')).toBeInTheDocument();
  });

  it('shows placeholder when no coordinate', () => {
    render(<CoordinateDisplay />);
    
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('displays coordinate when set', () => {
    useMapStore.setState({ mouseCoordinate: [-115.14, 36.17] });
    
    render(<CoordinateDisplay />);
    
    expect(screen.getByText(/36\.17/)).toBeInTheDocument();
    expect(screen.getByText(/-115\.14/)).toBeInTheDocument();
  });

  it('changes format when button clicked', () => {
    useMapStore.setState({ mouseCoordinate: [-115.14, 36.17] });
    
    render(<CoordinateDisplay />);
    
    fireEvent.click(screen.getByText('DMS'));
    
    expect(useMapStore.getState().coordinateFormat).toBe('dms');
  });

  it('shows elevation when available', () => {
    useMapStore.setState({ 
      mouseCoordinate: [-115.14, 36.17],
      mouseElevation: 1500,
    });
    
    render(<CoordinateDisplay />);
    
    expect(screen.getByText(/1500m/)).toBeInTheDocument();
  });

  it('shows loading state for elevation', () => {
    useMapStore.setState({ 
      mouseCoordinate: [-115.14, 36.17],
      elevationLoading: true,
    });
    
    render(<CoordinateDisplay />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('CoordinateDisplayCompact', () => {
  it('renders without crashing', () => {
    render(<CoordinateDisplayCompact />);
  });

  it('shows placeholder when no coordinate', () => {
    render(<CoordinateDisplayCompact />);
    
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('displays coordinate when set', () => {
    useMapStore.setState({ mouseCoordinate: [-115.14, 36.17] });
    
    render(<CoordinateDisplayCompact />);
    
    expect(screen.getByText(/36\.17/)).toBeInTheDocument();
  });
});

// ============================================================================
// BASEMAP SELECTOR TESTS
// ============================================================================

describe('BasemapSelector', () => {
  it('renders without crashing', () => {
    render(<BasemapSelector />);
    
    expect(screen.getByText('Basemap')).toBeInTheDocument();
  });

  it('shows current basemap selected', () => {
    render(<BasemapSelector />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('osm');
  });

  it('shows all available basemaps', () => {
    render(<BasemapSelector />);
    
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(DEFAULT_BASEMAPS.length);
  });

  it('changes basemap on selection', () => {
    render(<BasemapSelector />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'opentopomap' } });
    
    expect(useMapStore.getState().activeBasemapId).toBe('opentopomap');
  });
});

describe('BasemapButtonGroup', () => {
  it('renders without crashing', () => {
    render(<BasemapButtonGroup />);
    
    expect(screen.getByText('Basemap')).toBeInTheDocument();
  });

  it('shows quick select buttons', () => {
    render(<BasemapButtonGroup />);
    
    // Should show first few basemaps as buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// DRAWING TOOLS TESTS
// ============================================================================

describe('DrawingTools', () => {
  it('renders without crashing', () => {
    render(<DrawingTools />);
    
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('shows all draw mode buttons', () => {
    render(<DrawingTools />);
    
    expect(screen.getByText('↖')).toBeInTheDocument(); // Select
    expect(screen.getByText('📍')).toBeInTheDocument(); // Point
    expect(screen.getByText('📏')).toBeInTheDocument(); // Line
    expect(screen.getByText('⬡')).toBeInTheDocument(); // Polygon
  });

  it('changes draw mode on button click', () => {
    render(<DrawingTools />);
    
    fireEvent.click(screen.getByText('📍'));
    expect(useMapStore.getState().drawMode).toBe('point');
    
    fireEvent.click(screen.getByText('📏'));
    expect(useMapStore.getState().drawMode).toBe('line');
    
    fireEvent.click(screen.getByText('⬡'));
    expect(useMapStore.getState().drawMode).toBe('polygon');
    
    fireEvent.click(screen.getByText('↖'));
    expect(useMapStore.getState().drawMode).toBe('none');
  });

  it('shows feature count', () => {
    render(<DrawingTools />);
    
    expect(screen.getByText('0 features')).toBeInTheDocument();
  });

  it('updates feature count when features added', () => {
    useMapStore.getState().addFeature({
      type: 'point',
      name: 'Test Point',
      coordinates: [0, 0],
      visible: true,
    });
    
    render(<DrawingTools />);
    
    expect(screen.getByText('1 feature')).toBeInTheDocument();
  });

  it('has disabled export button when no features', () => {
    render(<DrawingTools />);
    
    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeDisabled();
  });

  it('has enabled export button when features exist', () => {
    useMapStore.getState().addFeature({
      type: 'point',
      name: 'Test',
      coordinates: [0, 0],
      visible: true,
    });
    
    render(<DrawingTools />);
    
    const exportButton = screen.getByText('Export');
    expect(exportButton).not.toBeDisabled();
  });
});

describe('DrawingToolsCompact', () => {
  it('renders without crashing', () => {
    render(<DrawingToolsCompact />);
  });

  it('shows draw mode buttons', () => {
    render(<DrawingToolsCompact />);
    
    expect(screen.getByText('↖')).toBeInTheDocument();
    expect(screen.getByText('📍')).toBeInTheDocument();
  });

  it('shows feature count when features exist', () => {
    useMapStore.getState().addFeature({
      type: 'point',
      name: 'Test',
      coordinates: [0, 0],
      visible: true,
    });
    
    render(<DrawingToolsCompact />);
    
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });
});

// ============================================================================
// MAP CONTROLS TESTS
// ============================================================================

describe('MapControls', () => {
  it('renders without crashing', () => {
    render(<MapControls />);
    
    expect(screen.getByText('Display')).toBeInTheDocument();
  });

  it('shows display toggle buttons', () => {
    render(<MapControls />);
    
    expect(screen.getByText('Coords')).toBeInTheDocument();
    expect(screen.getByText('Elev')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();
  });

  it('toggles coordinate display', () => {
    render(<MapControls />);
    
    fireEvent.click(screen.getByText('Coords'));
    expect(useMapStore.getState().showCoordinateDisplay).toBe(false);
    
    fireEvent.click(screen.getByText('Coords'));
    expect(useMapStore.getState().showCoordinateDisplay).toBe(true);
  });

  it('shows unit selector', () => {
    render(<MapControls />);
    
    expect(screen.getByText('NM')).toBeInTheDocument();
    expect(screen.getByText('KM')).toBeInTheDocument();
  });

  it('toggles units', () => {
    render(<MapControls />);
    
    fireEvent.click(screen.getByText('KM'));
    expect(useMapStore.getState().useNauticalMiles).toBe(false);
    
    fireEvent.click(screen.getByText('NM'));
    expect(useMapStore.getState().useNauticalMiles).toBe(true);
  });

  it('shows fullscreen button', () => {
    render(<MapControls />);
    
    expect(screen.getByText('Fullscreen')).toBeInTheDocument();
  });

  it('toggles fullscreen', () => {
    render(<MapControls />);
    
    fireEvent.click(screen.getByText('Fullscreen'));
    expect(useMapStore.getState().isFullscreen).toBe(true);
  });
});

describe('FullscreenButton', () => {
  it('renders without crashing', () => {
    render(<FullscreenButton />);
  });

  it('shows expand icon when not fullscreen', () => {
    render(<FullscreenButton />);
    
    expect(screen.getByText('⛶')).toBeInTheDocument();
  });

  it('shows collapse icon when fullscreen', () => {
    useMapStore.setState({ isFullscreen: true });
    
    render(<FullscreenButton />);
    
    expect(screen.getByText('⊡')).toBeInTheDocument();
  });

  it('toggles fullscreen on click', () => {
    render(<FullscreenButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(useMapStore.getState().isFullscreen).toBe(true);
  });
});

describe('SettingsPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders without crashing', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    expect(screen.getByText('Map Settings')).toBeInTheDocument();
  });

  it('shows close button', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByText('✕'));
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows setting toggles', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    expect(screen.getByText('Show Coordinates')).toBeInTheDocument();
    expect(screen.getByText('Show Elevation')).toBeInTheDocument();
    expect(screen.getByText('Show Scale Bar')).toBeInTheDocument();
  });

  it('shows offline mode indicator when enabled', () => {
    useMapStore.setState({ offlineMode: true });
    
    render(<SettingsPanel onClose={mockOnClose} />);
    
    expect(screen.getByText(/Offline Mode/)).toBeInTheDocument();
  });
});
