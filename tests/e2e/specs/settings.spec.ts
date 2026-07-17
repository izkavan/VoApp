import { test, expect } from '@playwright/test';
import { SettingsPage } from '../pages/SettingsPage';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Tests the application settings view, ensuring user preferences are captured and applied.
 */
test.describe('Settings @feature-settings', () => {
    let settingsPage: SettingsPage;
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        settingsPage = new SettingsPage(page);
        basePage = new BasePage(page);
        await basePage.navigate();
        await settingsPage.navigateToSettings();
    });

    test('updates export format and verifies IDB persistence', async ({ page }) => {
        // 1. Check initial state
        await page.waitForTimeout(500); // Buffer for initial render
        const initialAppState = await basePage.evaluateIndexedDBRecords('app_state');
        const initialSettingsState: any = initialAppState.find((record: any) => record.key === 'settings');
        // If settings weren't modified yet, they might not exist in IDB or default to webm
        
        // 2. Change format to wav
        await settingsPage.setExportFormat('wav');
        
        // 3. Verify IDB updated
        await page.waitForTimeout(500); // Buffer for IDB transaction
        const updatedAppState = await basePage.evaluateIndexedDBRecords('app_state');
        const updatedSettingsState: any = updatedAppState.find((record: any) => record.key === 'settings');
        
        expect(updatedSettingsState).toBeDefined();
        expect(updatedSettingsState.data.exportFormat).toBe('wav');

        // 4. Change format back to webm
        await settingsPage.setExportFormat('webm');

        // 5. Verify IDB updated again
        await page.waitForTimeout(500); // Buffer for IDB transaction
        const finalAppState = await basePage.evaluateIndexedDBRecords('app_state');
        const finalSettingsState: any = finalAppState.find((record: any) => record.key === 'settings');
        
        expect(finalSettingsState).toBeDefined();
        expect(finalSettingsState.data.exportFormat).toBe('webm');
    });
});
