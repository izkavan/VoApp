import { VoiceMemo, DictionaryEntry, Effect } from './types.js';

const DB_NAME = 'VoAppDatabase';
const DB_VERSION = 4; // Incremented for effects store
const VOICE_MEMOS_STORE = 'voice_memos';
const DICTIONARY_STORE = 'dictionary';
const AUDIO_BLOBS_STORE = 'audio_blobs';
const EFFECTS_STORE = 'effects';

export function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', (event.target as IDBOpenDBRequest).error);
            reject((event.target as IDBOpenDBRequest).error);
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(VOICE_MEMOS_STORE)) {
                db.createObjectStore(VOICE_MEMOS_STORE, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(DICTIONARY_STORE)) {
                const store = db.createObjectStore(DICTIONARY_STORE, { keyPath: 'id' });
                store.createIndex('projectId', 'projectId', { unique: false });
            }
            if (!db.objectStoreNames.contains(AUDIO_BLOBS_STORE)) {
                db.createObjectStore(AUDIO_BLOBS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(EFFECTS_STORE)) {
                db.createObjectStore(EFFECTS_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

export async function saveVoiceMemo(memo: Omit<VoiceMemo, 'id'>): Promise<number> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VOICE_MEMOS_STORE], 'readwrite');
        const store = transaction.objectStore(VOICE_MEMOS_STORE);
        const request = store.add(memo);

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest<number>).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function updateVoiceMemo(memo: VoiceMemo): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VOICE_MEMOS_STORE], 'readwrite');
        const store = transaction.objectStore(VOICE_MEMOS_STORE);
        const request = store.put(memo); // put replaces the record with the same keyPath (id)

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function getVoiceMemos(): Promise<VoiceMemo[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VOICE_MEMOS_STORE], 'readonly');
        const store = transaction.objectStore(VOICE_MEMOS_STORE);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest<VoiceMemo[]>).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function deleteVoiceMemo(id: number): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VOICE_MEMOS_STORE], 'readwrite');
        const store = transaction.objectStore(VOICE_MEMOS_STORE);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function deleteVoiceMemos(ids: number[]): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VOICE_MEMOS_STORE], 'readwrite');
        const store = transaction.objectStore(VOICE_MEMOS_STORE);
        ids.forEach(id => store.delete(id));

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = (event) => {
            reject((event.target as IDBTransaction).error);
        };
    });
}

// --- Effects Operations ---

export async function saveEffect(effect: Omit<Effect, 'id'>): Promise<number> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([EFFECTS_STORE], 'readwrite');
        const store = transaction.objectStore(EFFECTS_STORE);
        const request = store.add(effect);

        request.onsuccess = (event) => resolve((event.target as IDBRequest<number>).result);
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

export async function updateEffect(effect: Effect): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([EFFECTS_STORE], 'readwrite');
        const store = transaction.objectStore(EFFECTS_STORE);
        const request = store.put(effect);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

export async function getEffects(): Promise<Effect[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([EFFECTS_STORE], 'readonly');
        const store = transaction.objectStore(EFFECTS_STORE);
        const request = store.getAll();

        request.onsuccess = (event) => resolve((event.target as IDBRequest<Effect[]>).result);
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

export async function deleteEffect(id: number): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([EFFECTS_STORE], 'readwrite');
        const store = transaction.objectStore(EFFECTS_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

// --- Dictionary Operations ---

export async function saveDictionaryEntries(entries: DictionaryEntry[]): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DICTIONARY_STORE], 'readwrite');
        const store = transaction.objectStore(DICTIONARY_STORE);
        
        entries.forEach(entry => store.put(entry));

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
}

export async function deleteDictionaryEntry(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DICTIONARY_STORE], 'readwrite');
        const store = transaction.objectStore(DICTIONARY_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

export async function getDictionaryEntries(projectId: number): Promise<DictionaryEntry[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DICTIONARY_STORE], 'readonly');
        const store = transaction.objectStore(DICTIONARY_STORE);
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest<DictionaryEntry[]>).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

// --- Audio Blobs Operations ---

export async function saveAudioBlob(blob: Blob): Promise<string> {
    const db = await initDB();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_BLOBS_STORE], 'readwrite');
        const store = transaction.objectStore(AUDIO_BLOBS_STORE);
        const request = store.add({ id, blob });

        request.onsuccess = () => resolve(id);
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_BLOBS_STORE], 'readonly');
        const store = transaction.objectStore(AUDIO_BLOBS_STORE);
        const request = store.get(id);

        request.onsuccess = (event) => {
            const result = (event.target as IDBRequest).result;
            resolve(result ? result.blob : undefined);
        };
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}

export async function deleteAudioBlob(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([AUDIO_BLOBS_STORE], 'readwrite');
        const store = transaction.objectStore(AUDIO_BLOBS_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
}
