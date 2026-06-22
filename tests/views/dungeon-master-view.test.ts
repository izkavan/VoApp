import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeDungeonMasterView, refreshDungeonMasterView } from '../../src/views/dungeon-master-view.js';
import { Character, Project } from '../../src/types.js';

describe('dungeon-master-view', () => {
    let mockOpenModal: any;

    beforeEach(() => {
        document.body.innerHTML = `
            <select id="dm-session-project"><option value="none">None</option></select>
            <select id="dm-session-character"></select>
            <button id="dm-session-add-character"></button>
            <button id="dm-session-reset"></button>
            <div id="dm-session-characters"></div>
            <div id="dm-session-trash" class="hidden" style="display: none;"></div>

            <select id="dm-generator-project"><option value="none">None</option></select>
            <button id="dm-generator-button"></button>
        `;

        mockOpenModal = vi.fn();
    });

    it('initializes selects correctly', () => {
        const characters: Character[] = [
            { id: 1, projectId: 1, name: 'C1', artwork: '', voice_sample: '' },
            { id: 2, projectId: 2, name: 'C2', artwork: '', voice_sample: '' }
        ];
        const projects: Project[] = [
            { id: 1, name: 'P1', description: '', licensing: '' },
            { id: 2, name: 'P2', description: '', licensing: '' }
        ];

        initializeDungeonMasterView(characters, projects, mockOpenModal);

        const projSelect = document.getElementById('dm-session-project') as HTMLSelectElement;
        expect(projSelect.options.length).toBe(3); // None + P1 + P2

        const charSelect = document.getElementById('dm-session-character') as HTMLSelectElement;
        expect(charSelect.options.length).toBe(2);

        projSelect.value = '1';
        projSelect.dispatchEvent(new Event('change'));

        expect(charSelect.options.length).toBe(1);
        expect(charSelect.options[0].textContent).toBe('C1');
    });

    it('adds character to session and resets', () => {
        const characters: Character[] = [{ id: 1, projectId: 1, name: 'C1', artwork: '', voice_sample: '' }];
        initializeDungeonMasterView(characters, [], mockOpenModal);

        const charSelect = document.getElementById('dm-session-character') as HTMLSelectElement;
        charSelect.value = '1';
        
        const addBtn = document.getElementById('dm-session-add-character') as HTMLButtonElement;
        addBtn.click();

        const container = document.getElementById('dm-session-characters') as HTMLDivElement;
        expect(container.children.length).toBe(1);
        expect(container.innerHTML).toContain('C1');

        const resetBtn = document.getElementById('dm-session-reset') as HTMLButtonElement;
        resetBtn.click();
        expect(container.children.length).toBe(0);
    });

    it('handles dragging to trash', () => {
        const characters: Character[] = [{ id: 1, projectId: 1, name: 'C1', artwork: '', voice_sample: '' }];
        initializeDungeonMasterView(characters, [], mockOpenModal);

        const charSelect = document.getElementById('dm-session-character') as HTMLSelectElement;
        charSelect.value = '1';
        const addBtn = document.getElementById('dm-session-add-character') as HTMLButtonElement;
        addBtn.click();

        const container = document.getElementById('dm-session-characters') as HTMLDivElement;
        const card = container.firstElementChild as HTMLElement;
        const trash = document.getElementById('dm-session-trash') as HTMLDivElement;

        const dragStart = new Event('dragstart', { bubbles: true }) as any;
        dragStart.dataTransfer = { setData: vi.fn() };
        card.dispatchEvent(dragStart);
        
        expect(trash.style.display).toBe('flex');

        const dragEnd = new Event('dragend', { bubbles: true });
        card.dispatchEvent(dragEnd);
        
        expect(trash.style.display).toBe('none');

        const dragOver = new Event('dragover', { bubbles: true });
        dragOver.preventDefault = vi.fn();
        trash.dispatchEvent(dragOver);
        expect(dragOver.preventDefault).toHaveBeenCalled();

        trash.dispatchEvent(new Event('dragleave'));

        const drop = new Event('drop', { bubbles: true }) as any;
        drop.preventDefault = vi.fn();
        drop.dataTransfer = { getData: vi.fn().mockReturnValue('1') };
        trash.dispatchEvent(drop);
        
        expect(container.children.length).toBe(0);
    });

    it('generates random character', () => {
        const projects: Project[] = [{ id: 1, name: 'P1', description: '', licensing: '' }];
        initializeDungeonMasterView([], projects, mockOpenModal);

        const genProj = document.getElementById('dm-generator-project') as HTMLSelectElement;
        genProj.value = '1';

        const genBtn = document.getElementById('dm-generator-button') as HTMLButtonElement;
        genBtn.click();

        expect(mockOpenModal).toHaveBeenCalled();
        const callArgs = mockOpenModal.mock.calls[0];
        expect(callArgs[0].projectId).toBe(1);
        expect(callArgs[1]).toBe(true);
    });

    it('refreshes view correctly', () => {
        const characters: Character[] = [{ id: 1, projectId: 1, name: 'C1', artwork: '', voice_sample: '' }];
        initializeDungeonMasterView(characters, [], mockOpenModal);
        
        const charSelect = document.getElementById('dm-session-character') as HTMLSelectElement;
        charSelect.innerHTML = ''; // wipe it to test refresh
        
        refreshDungeonMasterView();
        
        expect(charSelect.options.length).toBe(1);
    });
});
