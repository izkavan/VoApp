import { Page, expect } from '@playwright/test';

export class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async navigate() {
        await this.page.goto('/');
    }

    async waitForToastMessage(expectedMessage: string) {
        const toast = this.page.locator('#toast-container .toast');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText(expectedMessage);
    }

    async evaluateIndexedDBRecords(storeName: string) {
        return await this.page.evaluate(async (store) => {
            return new Promise((resolve, reject) => {
                const request = window.indexedDB.open('VoAppDatabase', 7);
                request.onsuccess = (event: any) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(store)) {
                        resolve([]);
                        return;
                    }
                    const transaction = db.transaction([store], 'readonly');
                    const objectStore = transaction.objectStore(store);
                    const allRecords = objectStore.getAll();
                    
                    allRecords.onsuccess = () => {
                        // Strip blobs because they cannot be serialized over CDP
                        const safeRecords = allRecords.result.map((r: any) => ({
                            id: r.id || r.key,
                            key: r.key,
                            data: r.data, // preserve JSON data from app_state
                            // don't send blob, just a boolean flag to indicate it exists
                            hasBlob: !!r.blob
                        }));
                        resolve(safeRecords);
                    };
                    allRecords.onerror = () => {
                        reject('Failed to read IDB');
                    };
                };
                request.onerror = () => {
                    reject('Failed to open IDB');
                };
            });
        }, storeName);
    }
}
