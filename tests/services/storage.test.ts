import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveToLocalStorage, loadFromLocalStorage, defaultSettings } from '../../src/services/storage.js';

describe('Storage Service', () => {
    beforeEach(() => {
        const store: Record<string, string> = {};
        const mockStorage = {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
            clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
        };
        Object.defineProperty(global, 'localStorage', { value: mockStorage, writable: true });
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('loads default values when localStorage is empty', () => {
        const data = loadFromLocalStorage();
        expect(data.characters).toEqual([]);
        expect(data.projects).toEqual([]);
        expect(data.auditions).toEqual([]);
        expect(data.receivedAuditions).toEqual([]);
        expect(data.settings).toEqual(defaultSettings);
        expect(data.warmups.length).toBeGreaterThan(0); // Loads default warmups
        
        // Verify warmups were saved to localStorage
        expect(JSON.parse(localStorage.getItem('vo_app_warmups')!)).toEqual(data.warmups);
    });

    it('saves and loads data correctly', () => {
        const characters = [{ id: 1, name: 'Test Char' } as any];
        const projects = [{ id: 1, name: 'Test Proj' } as any];
        const auditions = [{ id: 1, title: 'Test Audition' } as any];
        const received = [{ id: 1, fileUrl: 'test' } as any];
        const settings = { ...defaultSettings, exportFormat: 'wav' } as any;
        const warmups = [{ id: 100, title: 'Custom Warmup', text: 'Test', tags: [] } as any];

        saveToLocalStorage(characters, projects, auditions, received, settings, warmups);

        const loaded = loadFromLocalStorage();
        expect(loaded.characters).toEqual(characters);
        expect(loaded.projects).toEqual(projects);
        expect(loaded.auditions).toEqual(auditions);
        expect(loaded.receivedAuditions).toEqual(received);
        expect(loaded.settings).toEqual(settings);
        expect(loaded.warmups).toEqual(warmups);
    });

    it('handles JSON parse errors gracefully by returning defaults', () => {
        localStorage.setItem('vo_app_characters', 'invalid json');
        
        // Spy on console.error
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const data = loadFromLocalStorage();
        expect(data.characters).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith('Failed to load from local storage', expect.any(Error));
    });
    
    it('handles save errors gracefully', () => {
        const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new Error('Storage Full');
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        saveToLocalStorage([], [], [], []);
        
        expect(errorSpy).toHaveBeenCalledWith('Failed to save to local storage', expect.any(Error));
    });
});
