import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrateLegacyArtwork } from '../../src/managers/LegacyMigration.js';
import * as indexeddb from '../../src/services/indexeddb.js';

vi.mock('../../src/services/indexeddb.js', () => ({
    saveImageBlob: vi.fn(),
    getImageBlob: vi.fn()
}));

describe('LegacyMigration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            blob: vi.fn().mockResolvedValue(new Blob())
        });
        global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    });

    it('migrates base64 artwork to blob storage', async () => {
        const characters = [{ name: 'Test', artwork: 'data:image/png;base64,mock' } as any];
        (indexeddb.saveImageBlob as any).mockResolvedValue('img_123');
        (indexeddb.getImageBlob as any).mockResolvedValue(new Blob());
        
        const migrated = await migrateLegacyArtwork(characters);
        expect(migrated).toBe(true);
        expect(indexeddb.saveImageBlob).toHaveBeenCalled();
        expect(characters[0].artworkId).toBe('img_123');
        expect(characters[0].artwork).toBe('blob:test'); // since next block creates url
    });

    it('creates object URL if artworkId exists but no artwork', async () => {
        const characters = [{ name: 'Test', artworkId: 'img_123' } as any];
        (indexeddb.getImageBlob as any).mockResolvedValue(new Blob());
        
        const migrated = await migrateLegacyArtwork(characters);
        expect(migrated).toBe(true);
        expect(indexeddb.getImageBlob).toHaveBeenCalledWith('img_123');
        expect(characters[0].artwork).toBe('blob:test');
    });

    it('migrates moodboard media', async () => {
        const characters = [{ 
            name: 'Test', 
            moodboardMedia: [{ type: 'image', urlOrId: 'img_456' }] 
        } as any];
        (indexeddb.getImageBlob as any).mockResolvedValue(new Blob());
        
        const migrated = await migrateLegacyArtwork(characters);
        expect(migrated).toBe(true);
        expect(characters[0].moodboardMedia[0].objectUrl).toBe('blob:test');
    });

    it('returns false if no migration needed', async () => {
        const characters = [{ name: 'Test', artwork: 'blob:already_migrated' } as any];
        const migrated = await migrateLegacyArtwork(characters);
        expect(migrated).toBe(false);
    });
});
