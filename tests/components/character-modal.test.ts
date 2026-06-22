import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeCharacterModal, openModal, closeModal } from '../../src/components/character-modal.js';
import { Character } from '../../src/types.js';

describe('character-modal wrapper', () => {
    let modalEl: HTMLElement;
    let modalContentEl: HTMLElement;
    let mockSave: any;
    let mockDuplicate: any;
    let mockDelete: any;

    beforeEach(() => {
        modalEl = document.createElement('div');
        modalEl.className = 'hidden';
        modalContentEl = document.createElement('div');
        mockSave = vi.fn();
        mockDuplicate = vi.fn();
        mockDelete = vi.fn();

        initializeCharacterModal(
            modalEl,
            modalContentEl,
            [],
            [],
            mockSave,
            mockDuplicate,
            mockDelete
        );
    });

    it('initializes and creates character-modal component', () => {
        expect(modalEl.querySelector('character-modal')).not.toBeNull();
    });

    it('handles modalClosed event', () => {
        const comp = modalEl.querySelector('character-modal');
        modalEl.classList.remove('hidden'); // ensure it's not hidden
        comp?.dispatchEvent(new CustomEvent('modalClosed'));
        expect(modalEl.classList.contains('hidden')).toBe(true);
    });

    it('handles saveCharacter event', () => {
        const comp = modalEl.querySelector('character-modal');
        const character: Character = { id: 1, name: 'Test' } as any;
        comp?.dispatchEvent(new CustomEvent('saveCharacter', {
            detail: { character, artworkFile: null, recordedSample: 'base64...' }
        }));
        expect(mockSave).toHaveBeenCalledWith(character, null, undefined, 'base64...');
    });

    it('handles duplicateCharacter event', () => {
        const comp = modalEl.querySelector('character-modal');
        const character: Character = { id: 1, name: 'Test' } as any;
        comp?.dispatchEvent(new CustomEvent('duplicateCharacter', {
            detail: character
        }));
        expect(mockDuplicate).toHaveBeenCalledWith(character);
    });

    it('handles deleteCharacter event', () => {
        const comp = modalEl.querySelector('character-modal');
        comp?.dispatchEvent(new CustomEvent('deleteCharacter', {
            detail: 1
        }));
        expect(mockDelete).toHaveBeenCalledWith(1);
    });

    it('opens modal', () => {
        const comp = modalEl.querySelector('character-modal') as any;
        comp.open = vi.fn();
        const char = { id: 1 } as Character;
        openModal(char, true);
        expect(modalEl.classList.contains('hidden')).toBe(false);
        expect(comp.open).toHaveBeenCalledWith(char, true);
    });

    it('closes modal', () => {
        modalEl.classList.remove('hidden');
        closeModal();
        expect(modalEl.classList.contains('hidden')).toBe(true);
    });
});
