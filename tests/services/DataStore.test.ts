import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataStore } from '../../src/services/DataStore.js';
import { loadFromLocalStorage, saveToLocalStorage } from '../../src/services/storage.js';
import { EventBus } from '../../src/services/EventBus.js';

import { migrateLegacyStorage } from '../../src/services/storage.js';
import { getAppState, saveAppState } from '../../src/services/indexeddb.js';

vi.mock('../../src/services/storage.js', () => ({
    migrateLegacyStorage: vi.fn().mockResolvedValue(true),
    defaultSettings: { exportFormat: 'webm' },
    DEFAULT_WARMUPS: []
}));

vi.mock('../../src/services/indexeddb.js', () => ({
    getAppState: vi.fn(),
    saveAppState: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/services/EventBus.js', () => ({
    EventBus: {
        emit: vi.fn()
    }
}));

describe('DataStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes from indexedDB and emits event', async () => {
        const mockData = {
            characters: [{ id: 1, name: 'Char' }],
            projects: [{ id: 1, name: 'Proj' }],
            auditions: [],
            receivedAuditions: [],
            settings: { exportFormat: 'wav' },
            warmups: []
        };
        (getAppState as any).mockImplementation((key: string) => Promise.resolve((mockData as any)[key]));

        await DataStore.initialize();

        expect(migrateLegacyStorage).toHaveBeenCalled();
        expect(getAppState).toHaveBeenCalledWith('characters');
        expect(DataStore.getCharacters()).toEqual(mockData.characters);
        expect(DataStore.getProjects()).toEqual(mockData.projects);
        expect(DataStore.getSettings()).toEqual(mockData.settings);
        expect(EventBus.emit).toHaveBeenCalledWith('charactersUpdated', mockData.characters);
        expect(EventBus.emit).toHaveBeenCalledWith('projectsUpdated', mockData.projects);
        expect(EventBus.emit).toHaveBeenCalledWith('storeInitialized');
    });

    it('adds a character and triggers save', () => {
        const char = { id: 2, name: 'New Char' } as any;
        DataStore.addCharacter(char);

        expect(DataStore.getCharacters()).toContain(char);
        expect(saveAppState).toHaveBeenCalledWith('characters', expect.any(Array));
        expect(EventBus.emit).toHaveBeenCalledWith('charactersUpdated', expect.any(Array));
    });

    it('updates an existing character', () => {
        // Assume initialized from previous test or setup
        const char = { id: 2, name: 'Updated Char' } as any;
        DataStore.updateCharacter(char);

        const chars = DataStore.getCharacters();
        expect(chars.find(c => c.id === 2)?.name).toBe('Updated Char');
        expect(saveAppState).toHaveBeenCalledWith('characters', expect.any(Array));
    });

    it('deletes a character', () => {
        DataStore.deleteCharacter(2);
        
        expect(DataStore.getCharacters().find(c => c.id === 2)).toBeUndefined();
        expect(saveAppState).toHaveBeenCalledWith('characters', expect.any(Array));
    });

    it('adds, updates, and deletes a project', () => {
        const proj = { id: 3, name: 'New Proj' } as any;
        
        DataStore.addProject(proj);
        expect(DataStore.getProjects()).toContain(proj);

        const updatedProj = { id: 3, name: 'Updated Proj' } as any;
        DataStore.updateProject(updatedProj);
        expect(DataStore.getProjects().find(p => p.id === 3)?.name).toBe('Updated Proj');

        DataStore.deleteProject(3);
        expect(DataStore.getProjects().find(p => p.id === 3)).toBeUndefined();
    });

    it('updates settings', () => {
        const settings = { exportFormat: 'wav', theme: 'dark' } as any;
        DataStore.updateSettings(settings);

        expect(DataStore.getSettings()).toEqual(settings);
        expect(saveAppState).toHaveBeenCalledWith('settings', settings);
    });

    it('restores all data', () => {
        const chars = [{ id: 9, name: 'R' }] as any[];
        const projs = [{ id: 8, name: 'P' }] as any[];
        const auds = [] as any[];
        const sets = { exportFormat: 'webm' } as any;

        DataStore.restoreAll(chars, projs, auds, sets);

        expect(DataStore.getCharacters()).toEqual(chars);
        expect(DataStore.getProjects()).toEqual(projs);
        expect(saveAppState).toHaveBeenCalledWith('characters', chars);
    });

    it('emits a notify error when saveAppState fails', async () => {
        (saveAppState as any).mockRejectedValueOnce(new Error('Quota exceeded'));
        
        const char = { id: 99, name: 'Fail Char' } as any;
        DataStore.addCharacter(char);

        // Allow promises to resolve
        await new Promise(process.nextTick);

        expect(EventBus.emit).toHaveBeenCalledWith('notify', expect.objectContaining({
            type: 'error',
            message: expect.stringContaining('Failed to save Characters')
        }));
    });
});
