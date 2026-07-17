import { test, expect } from '../fixtures/coverage';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Validates legacy data migration from older app versions.
 */
test.describe('Legacy Data Migration @system-integrity', () => {
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        basePage = new BasePage(page);
    });

    test('migrates legacy localStorage data to IndexedDB and purges localStorage', async ({ page }) => {
        const legacyCharacters = [
            { id: 101, name: 'Legacy Character 1', tags: ['hero'] },
            { id: 102, name: 'Legacy Character 2', tags: ['villain'] }
        ];

        const legacySettings = {
            exportFormat: 'wav',
            audioExportPath: 'legacy_audio'
        };

        // Inject legacy data BEFORE the page loads using an init script
        await page.addInitScript((data) => {
            localStorage.setItem('vo_app_characters', JSON.stringify(data.legacyCharacters));
            localStorage.setItem('vo_app_settings', JSON.stringify(data.legacySettings));
        }, { legacyCharacters, legacySettings });

        // 1. Navigate to the app (this will trigger migration on boot)
        await basePage.navigate();

        // Give it a moment to run the migration logic
        await page.waitForTimeout(1000);

        // 3. Verify localStorage is purged
        const postStorageChars = await page.evaluate(() => localStorage.getItem('vo_app_characters'));
        const postStorageSettings = await page.evaluate(() => localStorage.getItem('vo_app_settings'));
        expect(postStorageChars).toBeNull();
        expect(postStorageSettings).toBeNull();

        // 4. Verify IndexedDB contains the migrated data
        const appState = await basePage.evaluateIndexedDBRecords('app_state');
        
        const charactersState: any = appState.find((record: any) => record.key === 'characters');
        expect(charactersState).toBeDefined();
        expect(charactersState.data.length).toBeGreaterThanOrEqual(2);
        expect(charactersState.data.some((c: any) => c.name === 'Legacy Character 1')).toBeTruthy();

        const settingsState: any = appState.find((record: any) => record.key === 'settings');
        expect(settingsState).toBeDefined();
        expect(settingsState.data.exportFormat).toBe('wav');
        expect(settingsState.data.audioExportPath).toBe('legacy_audio');
    });
});
