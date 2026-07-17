import { test, expect } from '../fixtures/coverage';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Validates Database I/O isolation and concurrency handling.
 */
test.describe('Database I/O Isolation @system-integrity', () => {
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        basePage = new BasePage(page);
        await basePage.navigate();
        await page.waitForTimeout(500);
    });

    test('DataStore only writes the relevant table when saving (e.g. auditions)', async ({ page }) => {
        // We will mock/spy on IDBObjectStore.prototype.put to track database writes
        await page.evaluate(() => {
            (window as any).dbPuts = [];
            const originalPut = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function(value, key) {
                // value might be { key: "auditions", data: [...] } for app_state
                (window as any).dbPuts.push({ storeName: this.name, value, key });
                return originalPut.apply(this, arguments as any);
            };
        });

        // Open Character Library View
        await page.click('#nav-character-library');
        await page.waitForSelector('#character-library-view', { state: 'visible' });

        // Click Add Character
        await page.click('#new-character-button');
        
        // Fill out Character details
        await page.waitForSelector('#wc-edit-name', { state: 'visible' });
        await page.fill('#wc-edit-name', 'Test IO Character');
        
        // Save Character
        await page.click('#wc-save-btn');
        await page.waitForTimeout(500);

        // Fetch captured DB writes
        const dbPuts = await page.evaluate(() => (window as any).dbPuts);
        
        // Assert that we wrote to app_state with key "characters"
        const charactersWrite = dbPuts.find((p: any) => p.storeName === 'app_state' && p.value?.key === 'characters');
        expect(charactersWrite).toBeDefined();

        // Assert that we did NOT write to auditions, projects, or settings
        const auditionsWrite = dbPuts.find((p: any) => p.storeName === 'app_state' && p.value?.key === 'auditions');
        const projectsWrite = dbPuts.find((p: any) => p.storeName === 'app_state' && p.value?.key === 'projects');
        const settingsWrite = dbPuts.find((p: any) => p.storeName === 'app_state' && p.value?.key === 'settings');

        expect(auditionsWrite).toBeUndefined();
        expect(projectsWrite).toBeUndefined();
        expect(settingsWrite).toBeUndefined();
    });
});
