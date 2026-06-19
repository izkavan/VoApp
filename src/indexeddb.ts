import { VoiceMemo } from './types.js';

const DB_NAME = 'VoAppDatabase';
const DB_VERSION = 1;
const VOICE_MEMOS_STORE = 'voice_memos';

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
        
        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };

        ids.forEach(id => store.delete(id));
    });
}
