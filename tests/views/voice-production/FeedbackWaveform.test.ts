import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackWaveform } from '../../../src/views/voice-production/FeedbackWaveform.js';

describe('FeedbackWaveform', () => {
    let container: HTMLElement;
    let canvas: HTMLCanvasElement;
    let mockCtx: any;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="container" style="width: 800px; height: 150px;">
                <canvas id="waveform-canvas"></canvas>
            </div>
        `;
        
        container = document.getElementById('container') as HTMLElement;
        canvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;

        // Mock canvas bounding rect
        container.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 150, top: 0, left: 0, right: 800, bottom: 150, x: 0, y: 0, toJSON: () => {} } as DOMRect));
        canvas.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 150, top: 0, left: 0, right: 800, bottom: 150, x: 0, y: 0, toJSON: () => {} } as DOMRect));

        mockCtx = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: ''
        };

        canvas.getContext = vi.fn(() => mockCtx);
    });

    it('initializes and resizes correctly', () => {
        const waveform = new FeedbackWaveform('waveform-canvas', '#container');
        expect(waveform.getContainer()).toBe(container);
        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(150);
    });

    it('draws nothing and clears canvas if no buffer is provided', () => {
        const waveform = new FeedbackWaveform('waveform-canvas', '#container');
        waveform.draw(null);
        expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 150);
    });

    it('renders markers based on comments', () => {
        const waveform = new FeedbackWaveform('waveform-canvas', '#container');
        const comments = [
            { timeSeconds: 5 },
            { timeSeconds: 10 }
        ];

        waveform.renderMarkers(comments, 20); // Total duration 20s

        const markers = container.querySelectorAll('.vp-orange-marker');
        expect(markers.length).toBe(2);
        
        const firstMarker = markers[0] as HTMLElement;
        expect(firstMarker.style.left).toBe('25%'); // 5 / 20 = 25%
        expect(firstMarker.dataset.time).toBe('5');
    });

    it('calculates click time correctly', () => {
        const waveform = new FeedbackWaveform('waveform-canvas', '#container');
        const mockEvent = { clientX: 400 } as MouseEvent; // Clicked in the middle of 800px

        const time = waveform.getClickTime(mockEvent, 60); // Total duration 60s
        expect(time).toBe(30); // Middle of 60s is 30s
    });
});
