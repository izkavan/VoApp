import { test, expect } from '@playwright/test';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Exercises the standalone utility tools provided to voice actors (warmups, memos, overlays).
 */
test.describe('Utilities View Interactions @feature-utilities', () => {
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        basePage = new BasePage(page);
        await basePage.navigate();
        await page.click('#nav-utilities');
        await page.waitForSelector('#utility-view', { state: 'visible' });
    });

    test('can switch between utility tabs', async ({ page }) => {
        await expect(page.locator('#warm-ups')).toBeVisible();
        await page.click('.tab-link[data-tab="voice-memos"]');
        await expect(page.locator('#voice-memos')).toBeVisible();
        await page.click('.tab-link[data-tab="audio-overlay"]');
        await expect(page.locator('#audio-overlay')).toBeVisible();
    });

    test.describe('Warmups @feature-warmups', () => {
        test('Full lifecycle: Create, Render, Edit', async ({ page }) => {
            // 1. New Warmup button loads a New Warmup dialog
            await page.click('#new-warmup-button');
            const modal = page.locator('#warmup-modal');
            await expect(modal).not.toHaveClass(/hidden/);
            
            // 2. Inputting data in all fields
            const testTitle = `Test Warmup ${Date.now()}`;
            const testText = 'This is a test warmup text.';
            const testTag = 'e2etest';

            await page.fill('#warmup-modal-title-input', testTitle);
            await page.fill('#warmup-modal-text-input', testText);

            // Add tag
            await page.fill('#warmup-modal-tags-input', testTag);
            await page.keyboard.press('Enter');

            // Select rating (click middle for ~3 stars)
            await page.click('#warmup-modal-rating', { position: { x: 40, y: 5 }, force: true });

            // 3. Press save saves without error
            await page.click('#warmup-modal-save-btn');
            
            // Wait for modal to transition to view mode (save btn hides)
            await expect(page.locator('#warmup-modal-save-btn')).toHaveClass(/hidden/);

            // Close modal
            await page.click('#warmup-modal-close');
            await expect(modal).toHaveClass(/hidden/);

            // 4. Newly made warmup is accessible on the screen
            const warmupCards = page.locator('.warmup-card');
            await expect(warmupCards.filter({ hasText: testTitle })).toBeVisible();

            // 5. Clicking newly made warmup loads detail view and data is preserved
            await warmupCards.filter({ hasText: testTitle }).click();
            await expect(modal).not.toHaveClass(/hidden/);

            await expect(page.locator('#warmup-modal-title')).toHaveText(testTitle);
            await expect(page.locator('#warmup-modal-text')).toHaveText(testText);
            await expect(page.locator('#warmup-modal-tags')).toContainText(testTag);
            
            // We can also edit and delete it to clean up
            await page.click('#warmup-modal-edit-btn');
            page.once('dialog', dialog => dialog.accept()); // accept delete confirm
            await page.click('#warmup-modal-delete-btn');
            
            await expect(warmupCards.filter({ hasText: testTitle })).not.toBeVisible();
        });
    });

    test.describe('Voice Memos @feature-voice-memos', () => {
        test('Full lifecycle: Create, Edit, Toggle, Download, Export, Delete', async ({ page }) => {
            await page.click('.tab-link[data-tab="voice-memos"]');
            
            // 1. New Voice Memo dialog
            await page.click('#new-voice-memo-button');
            const modal = page.locator('#voice-memo-modal');
            await expect(modal).not.toHaveClass(/hidden/);

            const testTitle = `Test Memo ${Date.now()}`;
            await page.fill('#voice-memo-title', testTitle);
            
            await page.fill('#voice-memo-tags', 'voicetest');
            await page.keyboard.press('Enter');

            // Save is disabled until audio track is present
            await expect(page.locator('#save-voice-memo-button')).toBeDisabled();

            // Record fake audio (relies on --use-fake-device-for-media-stream)
            await page.click('#voice-memo-record-button');
            // wait a second for recording to get data
            await page.waitForTimeout(1000);
            await page.click('#voice-memo-record-button'); // Stop recording

            // Save should now be enabled
            await expect(page.locator('#save-voice-memo-button')).toBeEnabled();

            // Mark as important
            await page.check('#voice-memo-importance');

            // Save the memo
            await page.click('#save-voice-memo-button');
            await expect(modal).toHaveClass(/hidden/);

            // 2. Added voice memo has a purple indicator (high-importance class)
            const memoItem = page.locator('.voice-memo-item').filter({ hasText: testTitle });
            await expect(memoItem).toBeVisible();
            await expect(memoItem).toHaveClass(/high-importance/);

            // 3. Edit audio dialog
            const editBtn = memoItem.locator('span', { hasText: '✏️' });
            await editBtn.click();
            
            const editModal = page.locator('#edit-audio-modal');
            await expect(editModal).toBeVisible();
            await page.click('#edit-audio-close');
            await expect(editModal).toBeHidden();

            // 4. Download icon triggers download with filename equivalent to name
            const downloadBtn = memoItem.locator('span', { hasText: '💾' });
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                downloadBtn.click()
            ]);
            
            const expectedPrefix = testTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
            expect(download.suggestedFilename()).toContain(expectedPrefix);

            // 5. Clicking main body toggles checked state
            const checkbox = memoItem.locator('.memo-checkbox');
            await expect(checkbox).not.toBeChecked();
            
            // Click the middle of the memo body (avoiding buttons)
            await memoItem.locator('.memo-info').click();
            await expect(checkbox).toBeChecked();

            // 6. Exporting selected items to zip
            const [zipDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('#export-voice-memos-button')
            ]);
            expect(zipDownload.suggestedFilename()).toBe('voice_memos.zip');

            // 7. Delete selected
            page.once('dialog', dialog => dialog.accept());
            await page.click('#delete-voice-memos-button');

            await expect(memoItem).toHaveCount(0);
        });
    });

    test.describe('Audio Overlay @feature-audio-overlay', () => {
        test('renders all components properly', async ({ page }) => {
            await page.click('.tab-link[data-tab="audio-overlay"]');
            
            await expect(page.locator('#ao-play-btn')).toBeVisible();
            await expect(page.locator('#ao-clear-btn')).toBeVisible();
            await expect(page.locator('#ao-vol1')).toBeVisible();
            await expect(page.locator('#ao-mute1')).toBeVisible();
            await expect(page.locator('#ao-vol2')).toBeVisible();
            await expect(page.locator('#ao-mute2')).toBeVisible();
        });
    });
});
