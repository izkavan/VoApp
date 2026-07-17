import { test, expect } from '../fixtures/coverage';
import { MePage } from '../pages/MePage';
import { BasePage } from '../pages/BasePage';
import * as path from 'path';

/**
 * @purpose Validates system stability and quota handling when saving heavy media files.
 */
test.describe('Heavy Media Storage @system-integrity', () => {
    let mePage: MePage;
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        mePage = new MePage(page);
        basePage = new BasePage(page);
        await basePage.navigate();
        
        await page.click('#nav-character-library');
        await mePage.navigateToMeTab();
    });

    test('uploads heavy media, saves blobs to IndexedDB app_images and app_audio', async ({ page }) => {
        const dummyImagePath = path.join(__dirname, '../fixtures/dummy.jpg');
        const dummyAudioPath = path.join(__dirname, '../fixtures/dummy.wav');

        await mePage.uploadHeadshot(dummyImagePath);
        await mePage.uploadDemoReel(dummyAudioPath);

        // Save profile
        page.once('dialog', dialog => dialog.accept());
        await mePage.saveProfile();

        // Buffer for IDB Blob save
        await page.waitForTimeout(1000);

        // Verify the profile record has imageId and demoReelId but NOT the base64 blobs inline
        const appState = await basePage.evaluateIndexedDBRecords('app_state');
        const userProfileState: any = appState.find((record: any) => record.key === 'userProfile');
        
        expect(userProfileState).toBeDefined();
        
        const profileData = userProfileState.data;
        expect(profileData.headshotId).toBeTruthy();
        expect(profileData.demoReelId).toBeTruthy();
        
        // Assert no massive base64 string is nested inside the JSON structure
        expect(profileData.headshotBlob).toBeUndefined();
        expect(profileData.demoReelBlob).toBeUndefined();

        // 2. Verify Blob Object Stores directly
        const imagesState = await basePage.evaluateIndexedDBRecords('image_blobs');
        const headshotBlobRecord = imagesState.find((record: any) => record.id === profileData.headshotId);
        expect(headshotBlobRecord).toBeDefined();

        const audioState = await basePage.evaluateIndexedDBRecords('audio_blobs');
        const demoReelBlobRecord = audioState.find((record: any) => record.id === profileData.demoReelId);
        expect(demoReelBlobRecord).toBeDefined();
    });
});
