import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrateLegacyStorage, defaultSettings } from '../../src/services/storage.js';
import * as idb from '../../src/services/indexeddb.js';

vi.mock('../../src/services/indexeddb.js', () => ({
    saveAppState: vi.fn().mockResolvedValue(undefined),
    saveAudioBlob: vi.fn().mockResolvedValue('test-audio-id'),
    saveImageBlob: vi.fn().mockResolvedValue('test-image-id')
}));

describe('Storage Service Migration', () => {
    beforeEach(() => {
        const store: Record<string, string> = {};
        const mockStorage = {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
            clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
            removeItem: vi.fn((key: string) => { delete store[key]; })
        };
        Object.defineProperty(global, 'localStorage', { value: mockStorage, writable: true });
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('returns false if no legacy data exists', async () => {
        const result = await migrateLegacyStorage();
        expect(result).toBe(false);
    });

    it('migrates data and clears localStorage', async () => {
        const characters = [{ id: 1, name: 'Test Char', artwork: 'data:image/png;base64,123' } as any];
        const projects = [{ id: 1, name: 'Test Proj' } as any];
        const auditions = [{ id: 1, audioData: 'data:audio/wav;base64,123' } as any];

        localStorage.setItem('vo_app_characters', JSON.stringify(characters));
        localStorage.setItem('vo_app_projects', JSON.stringify(projects));
        localStorage.setItem('vo_app_auditions', JSON.stringify(auditions));

        const result = await migrateLegacyStorage();
        expect(result).toBe(true);

        expect(idb.saveAppState).toHaveBeenCalledWith('characters', expect.any(Array));
        expect(idb.saveAppState).toHaveBeenCalledWith('projects', expect.any(Array));
        expect(idb.saveAppState).toHaveBeenCalledWith('auditions', expect.any(Array));
        
        // Base64 logic should have triggered blob saves
        expect(idb.saveImageBlob).toHaveBeenCalled();
        expect(idb.saveAudioBlob).toHaveBeenCalled();

        expect(localStorage.getItem('vo_app_characters')).toBeNull();
    });

    it('handles JSON parse errors gracefully by returning false', async () => {
        localStorage.setItem('vo_app_characters', 'invalid json');
        
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await migrateLegacyStorage();
        expect(result).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith('Failed to migrate legacy storage', expect.any(Error));
    });
});
