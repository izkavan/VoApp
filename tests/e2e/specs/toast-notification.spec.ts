import { test, expect } from '@playwright/test';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Validates the global toast notification system rendering and timeouts.
 */
test.describe('Toast Notification Rendering @feature-toast', () => {
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        basePage = new BasePage(page);
        await basePage.navigate();
        await page.waitForTimeout(500);
    });

    test('toast appears and automatically hides after 4 seconds', async ({ page }) => {
        // Trigger the toast programmatically via EventBus
        await page.evaluate(() => {
            (window as any).EventBus.emit('notify', { message: 'This is a test toast', type: 'info' });
        });

        // Toast element should become visible and contain the message
        const toast = page.locator('#toast-container .toast').last();
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('This is a test toast');

        // Check that the class 'show' was added (which triggers the animation)
        await expect(toast).toHaveClass(/show/);

        // Wait for ~4.5 seconds for the toast to disappear automatically
        await page.waitForTimeout(4500);

        // Verify that the 'show' class was removed (or element removed)
        await expect(toast).toBeHidden();
    });
});
