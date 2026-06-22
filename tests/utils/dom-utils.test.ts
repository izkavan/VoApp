import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleArtworkPreview, createButton } from '../../src/utils/dom-utils.js';

describe('dom-utils', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    it('creates a button with correct attributes and listener', () => {
        const onClick = vi.fn();
        const button = createButton('test-btn', 'Click Me', onClick);
        
        expect(button.id).toBe('test-btn');
        expect(button.textContent).toBe('Click Me');
        
        button.click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('handles artwork preview with valid file', () => {
        document.body.innerHTML = `
            <div id="artwork-preview-container"></div>
            <div id="file-name"></div>
        `;
        
        const file = new File([''], 'test.png', { type: 'image/png' });
        const input = document.createElement('input');
        Object.defineProperty(input, 'files', { value: [file] });
        
        const event = { target: input } as unknown as Event;
        
        // Mock FileReader
        const mockFileReader = {
            readAsDataURL: vi.fn(),
            onload: null as any
        };
        (window as any).FileReader = function() { return mockFileReader; };
        
        handleArtworkPreview(event);
        
        expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
        
        // Trigger onload
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mock' } });
        
        const container = document.getElementById('artwork-preview-container');
        expect(container?.innerHTML).toContain('mock');
        expect(document.getElementById('file-name')?.textContent).toBe('test.png');
    });

    it('clears preview when no file is selected', () => {
        document.body.innerHTML = `
            <div id="artwork-preview-container">Old content</div>
            <div id="file-name">Old name</div>
        `;
        
        const input = document.createElement('input');
        Object.defineProperty(input, 'files', { value: [] });
        
        const event = { target: input } as unknown as Event;
        
        handleArtworkPreview(event);
        
        expect(document.getElementById('artwork-preview-container')?.innerHTML).toBe('');
        expect(document.getElementById('file-name')?.textContent).toBe('');
    });
});
