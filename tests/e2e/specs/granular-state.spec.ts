import { test, expect } from '@playwright/test';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Validates granular state management and reactive updates.
 */
test.describe('Granular State Management @system-integrity', () => {
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        basePage = new BasePage(page);
        
        // Inject 50 characters and 10 projects to simulate a heavy load
        await page.addInitScript(() => {
            const chars = Array.from({ length: 50 }).map((_, i) => ({
                id: i + 1,
                name: `Character ${i + 1}`,
                projectId: (i % 10) + 1,
                tags: []
            }));
            const projs = Array.from({ length: 10 }).map((_, i) => ({
                id: i + 1,
                name: `Project ${i + 1}`,
                description: "Test"
            }));
            const settings = {
                theme: "dark",
                systemFont: "default",
                featureScriptReader: true,
                featureTeleprompter: true
            };
            window.localStorage.setItem('vo_app_settings', JSON.stringify(settings));
            window.localStorage.setItem('vo_app_characters', JSON.stringify(chars));
            window.localStorage.setItem('vo_app_projects', JSON.stringify(projs));
        });

        await basePage.navigate();
        await page.waitForTimeout(500); // Wait for migration and rendering
    });

    test('updating settings does not trigger a full re-render of characters view', async ({ page }) => {
        // Wait for character cards to appear
        await page.waitForSelector('character-card');

        // Tag an element in the DOM to check if it gets replaced
        await page.evaluate(() => {
            const card = document.querySelector('character-card');
            if (card) {
                (card as any).__test_marker = true;
            }
        });

        // Open settings view and change a setting
        await page.click('#nav-settings');
        await page.waitForSelector('#settings-view', { state: 'visible' });

        // Change the font setting
        await page.selectOption('#settings-system-font', 'Arial, sans-serif');
        await page.waitForTimeout(500);

        // Verify the setting actually applied (CSS variable)
        const fontVar = await page.evaluate(() => document.documentElement.style.getPropertyValue('--system-font'));
        expect(fontVar).toBe('Arial, sans-serif');

        // Check if the DOM node was preserved (no full re-render)
        const markerExists = await page.evaluate(() => {
            const card = document.querySelector('character-card');
            return card && (card as any).__test_marker === true;
        });

        expect(markerExists).toBe(true);
    });
});
