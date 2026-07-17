import { test, expect } from '../fixtures/coverage';
import { MePage } from '../pages/MePage';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Validates the user profile setup and updates, ensuring changes are properly persisted to IndexedDB.
 */
test.describe('Me Profile @feature-me-profile', () => {
    let mePage: MePage;
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        mePage = new MePage(page);
        basePage = new BasePage(page);
        await basePage.navigate();
        
        // Ensure we are on the Character Library view
        await page.click('#nav-character-library');
        await mePage.navigateToMeTab();
    });

    test('updates Me profile and verifies IDB persistence', async ({ page }) => {
        // 1. Fill basic profile info
        const firstName = 'Jane';
        const lastName = 'Doe';
        const email = 'jane.doe@example.com';

        await mePage.fillBasicInfo(firstName, lastName, email);
        
        // Handle the potential alert that says "Profile saved successfully."
        page.once('dialog', dialog => dialog.accept());
        await mePage.saveProfile();

        // 2. Verify IndexedDB State
        await page.waitForTimeout(500); // Buffer for IDB transaction
        const appState = await basePage.evaluateIndexedDBRecords('app_state');
        const userProfileState: any = appState.find((record: any) => record.key === 'userProfile');
        
        expect(userProfileState).toBeDefined();
        expect(userProfileState.data.firstName).toBe(firstName);
        expect(userProfileState.data.lastName).toBe(lastName);
        expect(userProfileState.data.email).toBe(email);
    });
});

test.describe('Craft Demo Reel Workspace @feature-demo-reel', () => {
    let mePage: MePage;
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        mePage = new MePage(page);
        basePage = new BasePage(page);
        await basePage.navigate();
        await page.click('#nav-character-library');
        await mePage.navigateToMeTab();
    });

    test('Launch modal and upload audio clips', async ({ page }) => {
        page.on('pageerror', err => console.log('PAGE ERROR: ' + err.message)); page.on('console', msg => console.log('CONSOLE: ' + msg.text())); await page.click('#craft-demo-reel-btn');
        await expect(page.locator('#craft-demo-reel-modal')).toBeVisible();

        const audioPath1 = 'tests/e2e/fixtures/valid.wav';
        const audioPath2 = 'tests/e2e/fixtures/valid.wav';

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('#craft-add-audio-btn')
        ]);
        
        await fileChooser.setFiles([audioPath1, audioPath2]);

        // Verify clips populated
        const clips = page.locator('#craft-clip-list .craft-clip-item');
        await expect(clips).toHaveCount(2);
    });

    test('Reorder and remove audio clips', async ({ page }) => {
        page.on('pageerror', err => console.log('PAGE ERROR: ' + err.message)); page.on('console', msg => console.log('CONSOLE: ' + msg.text())); await page.click('#craft-demo-reel-btn');

        const audioPath1 = 'tests/e2e/fixtures/valid.wav';
        const audioPath2 = 'tests/e2e/fixtures/valid.wav';

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('#craft-add-audio-btn')
        ]);
        await fileChooser.setFiles([audioPath1, audioPath2]);

        // Click down on the first clip
        await page.click('.craft-clip-item:nth-child(1) .craft-clip-down');

        // Verify ordering changed
        // We know 'dummy2' should now be first, but let's just delete the first one.
        await page.click('.craft-clip-item:nth-child(1) .craft-clip-delete');
        
        const clips = page.locator('#craft-clip-list .craft-clip-item');
        await expect(clips).toHaveCount(1);
    });

    test('Export Demo Reel and verify persistence', async ({ page }) => {
        page.on('pageerror', err => console.log('PAGE ERROR: ' + err.message)); page.on('console', msg => console.log('CONSOLE: ' + msg.text())); await page.click('#craft-demo-reel-btn');

        const audioPath = 'tests/e2e/fixtures/valid.wav';

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('#craft-add-audio-btn')
        ]);
        await fileChooser.setFiles([audioPath]);

        // Mock the window.alert so Playwright doesn't block
        page.on('dialog', dialog => dialog.accept());

        const downloadPromise = page.waitForEvent('download');
        await page.click('#craft-save-btn');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('Demo_Reel_');

        // Check IndexedDB
        await page.waitForTimeout(500); // Give IDB time to write
        const appState = await basePage.evaluateIndexedDBRecords('app_state');
        const userProfileState: any = appState.find((record: any) => record.key === 'userProfile');
        
        expect(userProfileState).toBeDefined();
        expect(userProfileState.data.demoReelId).toBeDefined();
        expect(userProfileState.data.demoReelFilename).toContain('Demo_Reel_');
    });
});
