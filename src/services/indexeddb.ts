/**
 * Core IndexedDB service.
 * Handles the low-level interactions with the browser's IndexedDB API.
 * This is used for persisting heavy media (audio blobs, images) and large collections (effects, journals)
 * that would otherwise block the main thread or exceed LocalStorage quotas.
 */
import { VoiceMemo, DictionaryEntry, Effect, JournalEntry } from "../types.js";

const DB_NAME = "VoAppDatabase";
const DB_VERSION = 7; // Incremented for app_state store
const VOICE_MEMOS_STORE = "voice_memos";
const DICTIONARY_STORE = "dictionary";
const AUDIO_BLOBS_STORE = "audio_blobs";
const EFFECTS_STORE = "effects";
const IMAGE_BLOBS_STORE = "image_blobs";
const JOURNAL_ENTRIES_STORE = "journal_entries";
const APP_STATE_STORE = "app_state";

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error(
        "Database error:",
        (event.target as IDBOpenDBRequest).error,
      );
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VOICE_MEMOS_STORE)) {
        db.createObjectStore(VOICE_MEMOS_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains(DICTIONARY_STORE)) {
        const store = db.createObjectStore(DICTIONARY_STORE, { keyPath: "id" });
        store.createIndex("projectId", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains(AUDIO_BLOBS_STORE)) {
        db.createObjectStore(AUDIO_BLOBS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(EFFECTS_STORE)) {
        db.createObjectStore(EFFECTS_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains(IMAGE_BLOBS_STORE)) {
        db.createObjectStore(IMAGE_BLOBS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
        const store = db.createObjectStore(JOURNAL_ENTRIES_STORE, {
          keyPath: "id",
        });
        store.createIndex("characterId", "characterId", { unique: false });
      }
      if (!db.objectStoreNames.contains(APP_STATE_STORE)) {
        db.createObjectStore(APP_STATE_STORE, { keyPath: "key" });
      }
    };
  });
}

export async function saveVoiceMemo(
  memo: Omit<VoiceMemo, "id">,
): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VOICE_MEMOS_STORE], "readwrite");
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
    const transaction = db.transaction([VOICE_MEMOS_STORE], "readwrite");
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
    const transaction = db.transaction([VOICE_MEMOS_STORE], "readonly");
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
    const transaction = db.transaction([VOICE_MEMOS_STORE], "readwrite");
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
    const transaction = db.transaction([VOICE_MEMOS_STORE], "readwrite");
    const store = transaction.objectStore(VOICE_MEMOS_STORE);
    ids.forEach((id) => store.delete(id));

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      reject((event.target as IDBTransaction).error);
    };
  });
}

// --- Effects Operations ---

export async function saveEffect(effect: Omit<Effect, "id">): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EFFECTS_STORE], "readwrite");
    const store = transaction.objectStore(EFFECTS_STORE);
    const request = store.add(effect);

    request.onsuccess = (event) =>
      resolve((event.target as IDBRequest<number>).result);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function updateEffect(effect: Effect): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EFFECTS_STORE], "readwrite");
    const store = transaction.objectStore(EFFECTS_STORE);
    const request = store.put(effect);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function getEffects(): Promise<Effect[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EFFECTS_STORE], "readonly");
    const store = transaction.objectStore(EFFECTS_STORE);
    const request = store.getAll();

    request.onsuccess = (event) =>
      resolve((event.target as IDBRequest<Effect[]>).result);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function deleteEffect(id: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EFFECTS_STORE], "readwrite");
    const store = transaction.objectStore(EFFECTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

// --- Image Blobs ---
export async function saveImageBlob(blob: Blob): Promise<string> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_BLOBS_STORE], "readwrite");
    const store = transaction.objectStore(IMAGE_BLOBS_STORE);
    const id =
      "img_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const request = store.put({ id, blob });

    request.onsuccess = () => resolve(id);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  if (!id) return null;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_BLOBS_STORE], "readonly");
    const store = transaction.objectStore(IMAGE_BLOBS_STORE);
    const request = store.get(id);

    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest).result;
      resolve(result ? result.blob : null);
    };
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function deleteImageBlob(id: string): Promise<void> {
  if (!id) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGE_BLOBS_STORE], "readwrite");
    const store = transaction.objectStore(IMAGE_BLOBS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

// --- Dictionary Operations ---

export async function saveDictionaryEntries(
  entries: DictionaryEntry[],
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DICTIONARY_STORE], "readwrite");
    const store = transaction.objectStore(DICTIONARY_STORE);

    entries.forEach((entry) => store.put(entry));

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) =>
      reject((event.target as IDBTransaction).error);
  });
}

export async function deleteDictionaryEntry(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DICTIONARY_STORE], "readwrite");
    const store = transaction.objectStore(DICTIONARY_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function getDictionaryEntries(
  projectId: number,
): Promise<DictionaryEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DICTIONARY_STORE], "readonly");
    const store = transaction.objectStore(DICTIONARY_STORE);
    const index = store.index("projectId");
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
    const transaction = db.transaction([AUDIO_BLOBS_STORE], "readwrite");
    const store = transaction.objectStore(AUDIO_BLOBS_STORE);
    const request = store.add({ id, blob });

    request.onsuccess = () => resolve(id);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_BLOBS_STORE], "readonly");
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
    const transaction = db.transaction([AUDIO_BLOBS_STORE], "readwrite");
    const store = transaction.objectStore(AUDIO_BLOBS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

// --- Journal Entries Operations ---

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOURNAL_ENTRIES_STORE], "readwrite");
    const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
    const request = store.put(entry); // Handles both insert and update if id exists

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function getJournalEntries(
  characterId: number,
): Promise<JournalEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOURNAL_ENTRIES_STORE], "readonly");
    const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
    const index = store.index("characterId");
    const request = index.getAll(characterId);

    request.onsuccess = (event) =>
      resolve((event.target as IDBRequest<JournalEntry[]>).result);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOURNAL_ENTRIES_STORE], "readwrite");
    const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

// --- App State Operations ---

export async function saveAppState(key: string, data: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([APP_STATE_STORE], "readwrite");
    const store = transaction.objectStore(APP_STATE_STORE);
    const request = store.put({ key, data });

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function getAppState(key: string): Promise<any> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([APP_STATE_STORE], "readonly");
    const store = transaction.objectStore(APP_STATE_STORE);
    const request = store.get(key);

    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest).result;
      resolve(result ? result.data : null);
    };
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}
