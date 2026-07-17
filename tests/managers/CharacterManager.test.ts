import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterManager } from '../../src/managers/CharacterManager.js';
import { DataStore } from '../../src/services/DataStore.js';
import { saveImageBlob, deleteImageBlob } from '../../src/services/indexeddb.js';
import { closeModal } from '../../src/components/character-modal.js';

vi.mock('../../src/services/DataStore.js', () => ({
    DataStore: {
        getCharacters: vi.fn(),
        addCharacter: vi.fn(),
        updateCharacter: vi.fn(),
        deleteCharacter: vi.fn(),
        getWarmups: vi.fn().mockReturnValue([])
    }
}));

vi.mock('../../src/services/indexeddb.js', () => ({
    saveImageBlob: vi.fn(),
    deleteImageBlob: vi.fn(() => Promise.resolve()),
    getJournalEntries: vi.fn().mockResolvedValue([]),
    deleteJournalEntry: vi.fn().mockResolvedValue(undefined),
    getEffects: vi.fn().mockResolvedValue([]),
    updateEffect: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/components/character-modal.js', () => ({
    closeModal: vi.fn()
}));

describe('CharacterManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.URL.createObjectURL = vi.fn(() => 'mock-url');
        global.confirm = vi.fn(() => true);
    });

    it('adds a new character', async () => {
        (DataStore.getCharacters as any).mockReturnValue([]);
        
        const newChar = { id: 1, name: 'Test' } as any;
        await CharacterManager.saveCharacter(newChar);

        expect(DataStore.addCharacter).toHaveBeenCalledWith(newChar);
        expect(closeModal).toHaveBeenCalled();
    });

    it('updates an existing character', async () => {
        const existingChar = { id: 1, name: 'Old' };
        (DataStore.getCharacters as any).mockReturnValue([existingChar]);
        
        const updatedChar = { id: 1, name: 'New' } as any;
        await CharacterManager.saveCharacter(updatedChar);

        expect(DataStore.updateCharacter).toHaveBeenCalledWith(updatedChar);
        expect(closeModal).toHaveBeenCalled();
    });

    it('duplicates a character', () => {
        const charToDuplicate = { id: 1, name: 'Source' } as any;
        CharacterManager.duplicateCharacter(charToDuplicate);

        expect(DataStore.addCharacter).toHaveBeenCalled();
        expect(closeModal).toHaveBeenCalled();
    });

    it('deletes a character and its media', async () => {
        const charToDelete = { id: 1, artworkId: 'img1', moodboardMedia: [{ type: 'image', urlOrId: 'img2' }] } as any;
        (DataStore.getCharacters as any).mockReturnValue([charToDelete]);

        await CharacterManager.deleteCharacter(1);

        expect(global.confirm).toHaveBeenCalled();
        expect(deleteImageBlob).toHaveBeenCalledWith('img1');
        expect(deleteImageBlob).toHaveBeenCalledWith('img2');
        expect(DataStore.deleteCharacter).toHaveBeenCalledWith(1);
        expect(closeModal).toHaveBeenCalled();
    });

    it('assigns character to a project on drop', () => {
        const char = { id: 1, projectId: undefined } as any;
        (DataStore.getCharacters as any).mockReturnValue([char]);

        CharacterManager.onCharacterDrop(1, 42);

        expect(char.projectId).toBe(42);
        expect(DataStore.updateCharacter).toHaveBeenCalledWith(char);
    });
});
