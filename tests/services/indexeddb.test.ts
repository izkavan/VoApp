import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { 
    initDB, saveVoiceMemo, getVoiceMemos, updateVoiceMemo, deleteVoiceMemo, deleteVoiceMemos,
    saveEffect, getEffects, updateEffect, deleteEffect,
    saveImageBlob, getImageBlob, deleteImageBlob,
    saveDictionaryEntries, getDictionaryEntries, deleteDictionaryEntry,
    saveAudioBlob, getAudioBlob, deleteAudioBlob
} from '../../src/services/indexeddb.js';

describe('IndexedDB Service', () => {
    beforeEach(async () => {
        const db = await initDB();
        const stores = ['voice_memos', 'dictionary', 'audio_blobs', 'effects', 'image_blobs'];
        for (const storeName of stores) {
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject();
            });
        }
    });

    it('initializes the database with stores', async () => {
        const db = await initDB();
        expect(db.objectStoreNames.contains('voice_memos')).toBe(true);
        expect(db.objectStoreNames.contains('dictionary')).toBe(true);
        expect(db.objectStoreNames.contains('audio_blobs')).toBe(true);
        expect(db.objectStoreNames.contains('effects')).toBe(true);
        expect(db.objectStoreNames.contains('image_blobs')).toBe(true);
        db.close();
    });

    describe('Voice Memos', () => {
        it('saves, updates, retrieves, and deletes voice memos', async () => {
            const memo = { title: 'Test Memo', tags: ['tag'], blobId: 'blob-1', date: Date.now() };
            const id = await saveVoiceMemo(memo as any);
            expect(id).toBeDefined();

            let memos = await getVoiceMemos();
            expect(memos).toHaveLength(1);
            expect(memos[0].title).toBe('Test Memo');

            await updateVoiceMemo({ ...memos[0], title: 'Updated Memo' });
            memos = await getVoiceMemos();
            expect(memos[0].title).toBe('Updated Memo');

            await deleteVoiceMemo(id);
            memos = await getVoiceMemos();
            expect(memos).toHaveLength(0);
        });

        it('deletes multiple voice memos', async () => {
            const id1 = await saveVoiceMemo({ title: 'Memo 1' } as any);
            const id2 = await saveVoiceMemo({ title: 'Memo 2' } as any);
            await deleteVoiceMemos([id1, id2]);
            const memos = await getVoiceMemos();
            expect(memos).toHaveLength(0);
        });
    });

    describe('Effects', () => {
        it('saves, updates, retrieves, and deletes effects', async () => {
            const effect = { name: 'Test Effect', group: 'Test' };
            const id = await saveEffect(effect as any);
            
            let effects = await getEffects();
            expect(effects).toHaveLength(1);

            await updateEffect({ ...effects[0], name: 'Updated Effect' });
            effects = await getEffects();
            expect(effects[0].name).toBe('Updated Effect');

            await deleteEffect(id);
            effects = await getEffects();
            expect(effects).toHaveLength(0);
        });
    });

    describe('Image Blobs', () => {
        it('saves, gets, and deletes image blobs', async () => {
            const blob = new Blob(['test'], { type: 'image/png' });
            const id = await saveImageBlob(blob);
            expect(id).toMatch(/^img_/);

            const retrieved = await getImageBlob(id);
            expect(retrieved).toBeDefined();

            await deleteImageBlob(id);
            const deleted = await getImageBlob(id);
            expect(deleted).toBeNull();
        });
        
        it('returns null if id is empty', async () => {
            expect(await getImageBlob('')).toBeNull();
            await deleteImageBlob(''); // should not throw
        });
    });

    describe('Dictionary Entries', () => {
        it('saves, gets, and deletes dictionary entries by projectId', async () => {
            const entries = [
                { id: '1', projectId: 1, word: 'Test1' },
                { id: '2', projectId: 1, word: 'Test2' },
                { id: '3', projectId: 2, word: 'Test3' }
            ];
            await saveDictionaryEntries(entries as any);

            let proj1Entries = await getDictionaryEntries(1);
            expect(proj1Entries).toHaveLength(2);

            await deleteDictionaryEntry('1');
            proj1Entries = await getDictionaryEntries(1);
            expect(proj1Entries).toHaveLength(1);
            expect(proj1Entries[0].id).toBe('2');
        });
    });

    describe('Audio Blobs', () => {
        it('saves, gets, and deletes audio blobs', async () => {
            const blob = new Blob(['test audio'], { type: 'audio/webm' });
            const id = await saveAudioBlob(blob);

            const retrieved = await getAudioBlob(id);
            expect(retrieved).toBeDefined();

            await deleteAudioBlob(id);
            const deleted = await getAudioBlob(id);
            expect(deleted).toBeUndefined();
        });
    });
});
