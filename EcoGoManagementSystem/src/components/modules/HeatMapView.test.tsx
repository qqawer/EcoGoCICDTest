import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom';

const mocks = vi.hoisted(() => {
    const mockMap = {
        setView: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        fitBounds: vi.fn(),
        removeLayer: vi.fn(),
    };
    const mockLayer = {
        addTo: vi.fn().mockReturnThis(),
    };
    const mockControl = {
        onAdd: vi.fn(),
        addTo: vi.fn(),
    };
    const L = {
        map: vi.fn(() => mockMap),
        tileLayer: vi.fn(() => mockLayer),
        latLngBounds: vi.fn(),
        control: vi.fn(() => mockControl),
        heatLayer: vi.fn(() => mockLayer),
        DomUtil: {
            create: vi.fn(() => document.createElement('div')),
        },
        Layer: class { },
    };
    return L;
});

vi.mock('leaflet', () => ({ default: mocks }));
vi.mock('leaflet.heat', () => ({}));

// @ts-expect-error global L mock mapping
globalThis.L = mocks;

describe('HeatMapView Component', () => {
    let HeatMapView: any;

    beforeAll(async () => {
        // Dynamic import to ensure globalThis.L is set before leaflet.heat is loaded
        const module = await import('./HeatMapView');
        HeatMapView = module.HeatMapView;
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders heatmap container', () => {
        render(<HeatMapView />);
        expect(screen.getByText('Trip Activity Heatmap')).toBeInTheDocument();
        expect(screen.getByText(/No trip coordinate data available/i)).toBeInTheDocument();
    });

    it('initializes map with data', () => {
        const mockData: Array<[number, number, number]> = [[1.2, 103.8, 0.5]];
        render(<HeatMapView heatmapData={mockData} />);

        expect(screen.getByText(/1 data points loaded/i)).toBeInTheDocument();
    });
});
