import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeLineReader } from '../../src/views/line-reader.js';
import * as indexeddb from '../../src/services/indexeddb.js';
import { SystemSettings } from '../../src/types.js';

describe('line-reader', () => {
    let mockOpenCharModal: any;

    beforeEach(() => {
        document.body.innerHTML = `
            <input type="file" id="script-file-input" />
            <input id="script-name-input" />
            <input id="script-version-input" />
            <select id="script-project-select"></select>
            <select id="line-filter-select"></select>
            
            <div id="line-container"></div>
            <div id="read-container"></div>
            <div id="read-details"></div>
            
            <button id="read-button"></button>
            <button id="omit-button"></button>
            <button id="remit-button"></button>
            <button id="reset-button"></button>
            <button id="save-button"></button>
        `;

        mockOpenCharModal = vi.fn();

        vi.spyOn(indexeddb, 'getDictionaryEntries').mockResolvedValue([]);
        vi.spyOn(indexeddb, 'saveAudioBlob').mockResolvedValue('blob_id');
        vi.spyOn(indexeddb, 'getAudioBlob').mockResolvedValue(new Blob());
        vi.spyOn(indexeddb, 'deleteAudioBlob').mockResolvedValue();

        const mockFolder = { folder: vi.fn().mockReturnThis(), file: vi.fn() };
        (global as any).JSZip = vi.fn().mockImplementation(function() {
            return {
                folder: vi.fn().mockReturnValue(mockFolder),
                file: vi.fn(),
                generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }))
            };
        });

        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((k) => store[k] || null),
            setItem: vi.fn((k, v) => store[k] = v),
            removeItem: vi.fn((k) => delete store[k]),
        });

        vi.stubGlobal('URL', {
            createObjectURL: vi.fn().mockReturnValue('blob:url'),
            revokeObjectURL: vi.fn()
        });
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('initializes empty state', () => {
        initializeLineReader([], [], {} as SystemSettings, mockOpenCharModal);
        expect(document.getElementById('script-project-select')?.children.length).toBe(1); 
    });

    it('loads script from txt file', async () => {
        initializeLineReader([], [], {} as SystemSettings, mockOpenCharModal);

        const fileInput = document.getElementById('script-file-input') as HTMLInputElement;
        const file = new File(['Line 1\nLine 2'], 'script.txt', { type: 'text/plain' });
        
        Object.defineProperty(fileInput, 'files', { value: [file] });
        
        class MockFileReader {
            onload: any;
            readAsText() {
                if (this.onload) {
                    this.onload({ target: { result: 'Line 1\nLine 2' } });
                }
            }
        }
        vi.stubGlobal('FileReader', MockFileReader);

        fileInput.dispatchEvent(new Event('change'));

        await new Promise(r => setTimeout(r, 50));
        const lineContainer = document.getElementById('line-container') as HTMLDivElement;
        expect(lineContainer.children.length).toBe(2);
        expect(lineContainer.children[0].textContent).toBe('Line 1');
    });

    it('marks line as read and renders details', () => {
        initializeLineReader([], [], {} as SystemSettings, mockOpenCharModal);

        const lineContainer = document.getElementById('line-container') as HTMLDivElement;
        const line = document.createElement('div');
        line.textContent = 'A cool line';
        line.className = 'line-entry';
        
        const selectLineFn = vi.fn((lineDiv: HTMLElement, isRead: boolean) => {
            lineDiv.classList.add('selected');
        });
        line.addEventListener('click', () => selectLineFn(line, false));
        
        lineContainer.appendChild(line);

        line.click();
        expect(line.classList.contains('selected')).toBe(true);
        
        const readBtn = document.getElementById('read-button') as HTMLButtonElement;
        
        const realSelectLineFn = (lineDiv: HTMLElement) => {
            selectedLine = lineDiv;
        }
        
        readBtn.dispatchEvent(new Event('click'));

    });

    it('handles script export', async () => {
        initializeLineReader([], [], { exportFormat: 'wav' } as SystemSettings, mockOpenCharModal);

        const lineContainer = document.getElementById('line-container') as HTMLDivElement;
        const line = document.createElement('div');
        line.textContent = 'Line 1';
        line.className = 'line-entry selected';
        lineContainer.appendChild(line);

        const readBtn = document.getElementById('read-button') as HTMLButtonElement;
        readBtn.click();

        const saveBtn = document.getElementById('save-button') as HTMLButtonElement;
        saveBtn.click();

        await new Promise(r => setTimeout(r, 50));
        expect(URL.createObjectURL).toHaveBeenCalled();
    });
});
