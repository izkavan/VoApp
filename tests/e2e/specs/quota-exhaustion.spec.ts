import { test, expect } from '../fixtures/coverage';
import { BasePage } from '../pages/BasePage';
import { MePage } from '../pages/MePage';
import * as path from 'path';

/**
 * @purpose Validates graceful error handling when IndexedDB quotas are exhausted.
 */
test.describe('Quota Exhaustion Handling @system-integrity', () => {
    let basePage: BasePage;
    let mePage: MePage;

    test.beforeEach(async ({ page }) => {
        basePage = new BasePage(page);
        mePage = new MePage(page);
        await basePage.navigate();
        await page.waitForTimeout(500);
    });

    test('displays an error toast when IndexedDB throws QuotaExceededError', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

        // Intercept IDBObjectStore.put to ALWAYS throw QuotaExceededError
        await page.evaluate(() => {
            const originalPut = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function(value, key) {
                if (this.name === 'app_state') {
                    // Let app_state save so the app can function
                    return originalPut.apply(this, arguments as any);
                }
                
                // Throw quota error for everything else (like blob stores)
                const fakeReq: any = {
                    error: new DOMException('QuotaExceededError', 'QuotaExceededError'),
                    onerror: null,
                    onsuccess: null,
                };
                
                setTimeout(() => {
                    if (fakeReq.onerror) {
                        fakeReq.onerror({ target: fakeReq });
                    }
                }, 10);

                return fakeReq as IDBRequest;
            };
        });

        // Navigate to Me Tab
        await page.click('#nav-character-library');
        await mePage.navigateToMeTab();

        // Attempt to upload a dummy headshot (this writes to image_blobs store)
        const dummyImagePath = path.join(__dirname, '../fixtures/dummy.jpg');
        await mePage.uploadHeadshot(dummyImagePath);

        // Click Save to trigger saveImageBlob
        await page.click('#me-save-btn');

        // Toast element should become visible and contain an error
        const toast = page.locator('#toast-container .toast.toast-error').last();
        
        // Wait for the toast to appear due to the QuotaExceededError
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('Failed to upload image. Storage limit may be reached.');
    });
});
