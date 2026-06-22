import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeTeleprompter } from '../../src/components/teleprompt.js';
import { Project } from '../../src/types.js';
import * as indexeddb from '../../src/services/indexeddb.js';

describe('teleprompt', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        
        container.innerHTML = `
            <input type="file" id="teleprompt-file-input" />
            <select id="teleprompt-project-select"></select>
            <div id="teleprompt-display"></div>
            <input type="range" id="teleprompt-speed" value="2" />
            <button id="teleprompt-font-minus">-</button>
            <button id="teleprompt-font-plus">+</button>
            <span id="teleprompt-font-label"></span>
            <button id="teleprompt-spacing-minus">-</button>
            <button id="teleprompt-spacing-plus">+</button>
            <span id="teleprompt-spacing-label"></span>
            <input type="color" id="teleprompt-color" value="#000000" />
            <input type="color" id="teleprompt-bg-color" value="#ffffff" />
            <input type="checkbox" id="teleprompt-read-toggle" />
            <button id="teleprompt-record-button"></button>
            <ul id="teleprompt-takes-list"></ul>
            <button id="teleprompt-save-session"></button>
            <ul id="teleprompt-toc-list"></ul>
            <button id="teleprompt-toc-toggle"></button>
            <div id="teleprompt-sidebar"></div>
        `;
        document.body.appendChild(container);

        vi.spyOn(indexeddb, 'getDictionaryEntries').mockResolvedValue([]);
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn()
        });
        
        if (!global.crypto) {
            (global as any).crypto = { randomUUID: () => '1234' };
        } else if (!global.crypto.randomUUID) {
            global.crypto.randomUUID = () => '1234';
        }

        const projects: Project[] = [{ id: 1, name: 'P1', description: '', licensing: '' }];
        initializeTeleprompter(projects);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes DOM and loads projects', () => {
        const select = document.getElementById('teleprompt-project-select') as HTMLSelectElement;
        expect(select.options.length).toBe(2); // empty + P1
        expect(select.options[1].textContent).toBe('P1');
    });

    it('changes font size', () => {
        const fontMinus = document.getElementById('teleprompt-font-minus') as HTMLButtonElement;
        const fontPlus = document.getElementById('teleprompt-font-plus') as HTMLButtonElement;
        const fontLabel = document.getElementById('teleprompt-font-label') as HTMLSpanElement;
        const displayDiv = document.getElementById('teleprompt-display') as HTMLDivElement;

        fontPlus.click(); // 24 -> 26
        expect(fontLabel.textContent).toBe('26px');
        expect(displayDiv.style.fontSize).toBe('26px');

        fontMinus.click(); // 26 -> 24
        expect(fontLabel.textContent).toBe('24px');
    });

    it('handles file upload and renders TOC', async () => {
        const fileInput = document.getElementById('teleprompt-file-input') as HTMLInputElement;
        const file = new File(['Hello world!'], 'script.txt', { type: 'text/plain' });
        
        if (!file.text) file.text = async () => 'Hello world!';

        Object.defineProperty(fileInput, 'files', {
            value: [file]
        });

        fileInput.dispatchEvent(new Event('change'));

        await new Promise(r => setTimeout(r, 0));

        const tocList = document.getElementById('teleprompt-toc-list') as HTMLUListElement;
        expect(tocList.children.length).toBe(1);
        expect(tocList.children[0].textContent?.trim()).toBe('script');

        const displayDiv = document.getElementById('teleprompt-display') as HTMLDivElement;
        expect(displayDiv.innerHTML).toContain('Hello world!');
    });

    it('handles dictionary change', async () => {
        const select = document.getElementById('teleprompt-project-select') as HTMLSelectElement;
        select.value = '1';
        select.dispatchEvent(new Event('change'));
        
        await new Promise(r => setTimeout(r, 0));
        expect(indexeddb.getDictionaryEntries).toHaveBeenCalledWith(1);
    });
});
