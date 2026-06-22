import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeDictionaryModal, openDictionaryModal, closeDictionaryModal } from '../../src/components/dictionary-modal.js';
import * as indexeddb from '../../src/services/indexeddb.js';
import { Project } from '../../src/types.js';

describe('dictionary-modal', () => {
    let modalEl: HTMLElement;
    let contentEl: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '';
        modalEl = document.createElement('div');
        modalEl.className = 'hidden';
        contentEl = document.createElement('div');
        document.body.appendChild(modalEl);
        document.body.appendChild(contentEl);

        initializeDictionaryModal(modalEl, contentEl);

        vi.spyOn(indexeddb, 'getDictionaryEntries').mockResolvedValue([
            { id: '1', projectId: 1, word: 'Test', phonetic: 'T', meaning: 'M' },
            { id: '2', projectId: 1, word: 'AudioTest', phonetic: 'A', meaning: 'M', audioData: 'data:audio' }
        ] as any);
        vi.spyOn(indexeddb, 'saveDictionaryEntries').mockResolvedValue(undefined);
        vi.spyOn(indexeddb, 'deleteDictionaryEntry').mockResolvedValue(undefined);
        
        if (!global.crypto) {
            (global as any).crypto = { randomUUID: () => '1234-5678' };
        } else if (!global.crypto.randomUUID) {
            global.crypto.randomUUID = () => '1234-5678';
        }
    });

    it('opens and renders dictionary entries', async () => {
        const project = { id: 1, name: 'P1' } as Project;
        await openDictionaryModal(project);

        expect(modalEl.classList.contains('hidden')).toBe(false);
        const rows = contentEl.querySelectorAll('.dictionary-row');
        expect(rows.length).toBe(2);

        const wordInput = rows[0].querySelector('.dict-word') as HTMLInputElement;
        expect(wordInput.value).toBe('Test');
    });

    it('closes on background click', async () => {
        await openDictionaryModal({ id: 1 } as Project);
        modalEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(modalEl.classList.contains('hidden')).toBe(true);
    });

    it('adds a new entry', async () => {
        await openDictionaryModal({ id: 1 } as Project);
        const addBtn = contentEl.querySelector('#add-dictionary-entry') as HTMLButtonElement;
        addBtn.click();

        const rows = contentEl.querySelectorAll('.dictionary-row');
        expect(rows.length).toBe(3); // 2 initial + 1 new
    });

    it('deletes an entry', async () => {
        await openDictionaryModal({ id: 1 } as Project);
        const deleteBtn = contentEl.querySelector('.dict-delete-btn') as HTMLButtonElement;
        deleteBtn.click();
        
        await new Promise(r => setTimeout(r, 0));
        
        const rows = contentEl.querySelectorAll('.dictionary-row');
        expect(rows.length).toBe(1);
        expect(indexeddb.deleteDictionaryEntry).toHaveBeenCalledWith('1');
    });

    it('saves entries', async () => {
        await openDictionaryModal({ id: 1 } as Project);
        const saveBtn = contentEl.querySelector('#save-dictionary-btn') as HTMLButtonElement;
        
        let eventFired = false;
        window.addEventListener('dictionaryUpdated', () => eventFired = true);
        
        saveBtn.click();
        
        await new Promise(r => setTimeout(r, 0));
        expect(indexeddb.saveDictionaryEntries).toHaveBeenCalled();
        expect(eventFired).toBe(true);
        expect(modalEl.classList.contains('hidden')).toBe(true);
    });
});
