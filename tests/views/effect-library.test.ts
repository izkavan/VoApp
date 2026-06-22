import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeEffectLibrary } from '../../src/views/effect-library.js';
import * as indexeddb from '../../src/services/indexeddb.js';
import { SystemSettings, Effect } from '../../src/types.js';

describe('effect-library', () => {
    let mockSaveSettings: any;

    beforeEach(() => {
        document.body.innerHTML = `
            <input id="effect-tag-search" />
            <select id="effect-group-select"></select>
            <select id="effect-project-select"></select>
            <select id="effect-character-select"></select>
            <button id="effect-clear-filters-btn"></button>
            <button id="new-effect-button"></button>
            <button id="effect-select-all-btn"></button>
            <button id="effect-clear-selection-btn"></button>
            <button id="effect-download-btn"></button>
            <span id="effect-selection-count"></span>
            <div id="effect-cards-grid"></div>

            <div id="effect-modal" class="hidden"></div>
            <button id="effect-modal-close"></button>
            <button id="effect-modal-save-btn"></button>
            <button id="effect-modal-delete-btn"></button>
            <button id="effect-modal-add-character"></button>
            <button id="effect-modal-add-project"></button>
            <input id="effect-modal-title-input" />
            <input id="effect-modal-tags-input" />
            <select id="effect-modal-group-select"></select>
            <input id="effect-modal-new-group-input" class="hidden" />
            <div id="effect-audio-preview"></div>
            <select id="effect-modal-character-select"></select>
            <select id="effect-modal-project-select"></select>
            <div id="effect-modal-character-list"></div>
            <div id="effect-modal-project-list"></div>
            <button id="effect-record-button"></button>
            <span id="effect-record-status"></span>
        `;

        mockSaveSettings = vi.fn();

        vi.spyOn(indexeddb, 'getEffects').mockResolvedValue([]);
        vi.spyOn(indexeddb, 'saveEffect').mockResolvedValue(1);
        vi.spyOn(indexeddb, 'updateEffect').mockResolvedValue();
        vi.spyOn(indexeddb, 'deleteEffect').mockResolvedValue();

        const mockFolder = { folder: vi.fn().mockReturnThis(), file: vi.fn() };
        (global as any).JSZip = vi.fn().mockImplementation(function() {
            return {
                folder: vi.fn().mockReturnValue(mockFolder),
                file: vi.fn(),
                generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }))
            };
        });

        vi.stubGlobal('URL', {
            createObjectURL: vi.fn().mockReturnValue('blob:url'),
            revokeObjectURL: vi.fn()
        });
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('initializes and renders effects', async () => {
        const effects: Effect[] = [
            { id: 1, title: 'E1', group: 'Laugh', tags: ['funny'], characterIds: [], projectIds: [], date: 1, blob: new Blob() }
        ];
        vi.mocked(indexeddb.getEffects).mockResolvedValue(effects);

        await initializeEffectLibrary([], [], { effectGroups: ['Laugh'] } as SystemSettings, mockSaveSettings);

        const grid = document.getElementById('effect-cards-grid') as HTMLDivElement;
        expect(grid.children.length).toBe(1);
        expect(grid.innerHTML).toContain('E1');
    });

    it('filters effects', async () => {
        const effects: Effect[] = [
            { id: 1, title: 'E1', group: 'Laugh', tags: ['funny'], characterIds: [], projectIds: [], date: 1 },
            { id: 2, title: 'E2', group: 'Pain', tags: ['ouch'], characterIds: [], projectIds: [], date: 1 }
        ];
        vi.mocked(indexeddb.getEffects).mockResolvedValue(effects);

        await initializeEffectLibrary([], [], { effectGroups: ['Laugh', 'Pain'] } as SystemSettings, mockSaveSettings);

        const groupSelect = document.getElementById('effect-group-select') as HTMLSelectElement;
        groupSelect.value = 'Laugh';
        groupSelect.dispatchEvent(new Event('change'));

        const grid = document.getElementById('effect-cards-grid') as HTMLDivElement;
        expect(grid.children.length).toBe(1);
        expect(grid.innerHTML).toContain('E1');
    });

    it('selects and downloads effects', async () => {
        const effects: Effect[] = [
            { id: 1, title: 'E1', group: 'Laugh', tags: [], characterIds: [], projectIds: [], date: 1, blob: new Blob(['audio']) }
        ];
        vi.mocked(indexeddb.getEffects).mockResolvedValue(effects);

        await initializeEffectLibrary([], [], { effectGroups: ['Laugh'] } as SystemSettings, mockSaveSettings);

        const selectAll = document.getElementById('effect-select-all-btn') as HTMLButtonElement;
        selectAll.click();

        const count = document.getElementById('effect-selection-count') as HTMLSpanElement;
        expect(count.textContent).toBe('1 selected');

        const downloadBtn = document.getElementById('effect-download-btn') as HTMLButtonElement;
        downloadBtn.click();
        
        await new Promise(r => setTimeout(r, 50));
        expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('opens new effect modal', async () => {
        await initializeEffectLibrary([], [], { effectGroups: ['Laugh'] } as SystemSettings, mockSaveSettings);

        const newBtn = document.getElementById('new-effect-button') as HTMLButtonElement;
        newBtn.click();

        const modal = document.getElementById('effect-modal') as HTMLDivElement;
        expect(modal.classList.contains('hidden')).toBe(false);

        const title = document.getElementById('effect-modal-title-input') as HTMLInputElement;
        expect(title.value).toBe('');
    });
});
