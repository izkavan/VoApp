import { test, expect } from '@playwright/test';
import { BasePage } from '../pages/BasePage';
import { ProjectModalPage } from '../pages/ProjectModalPage';
import { CharacterModalPage } from '../pages/CharacterModalPage';
import fs from 'fs';
import JSZip from 'jszip';

/**
 * @purpose Validates the Voice Actor View, including Line Reader, Teleprompter, Auditions, and Effect Library tools, ensuring state consistency, media capture, and export integrity.
 */
test.describe('Voice Actor View @feature-voice-actor', () => {
    let basePage: BasePage;
    let projectModal: ProjectModalPage;
    let characterModal: CharacterModalPage;

    test.beforeEach(async ({ page }) => {
        basePage = new BasePage(page);
        projectModal = new ProjectModalPage(page);
        characterModal = new CharacterModalPage(page);

        await basePage.navigate();

        // Seed data: Create a Project and a Character
        await projectModal.openNewProjectModal();
        await projectModal.fillProjectDetails('Voice Actor Project', 'Test Data');
        await projectModal.saveProject();

        await characterModal.openNewCharacterModal();
        await characterModal.fillCharacterDetails('Voice Actor Hero', 'Test Data');
        await page.selectOption('#wc-character-project', { label: 'Voice Actor Project' });
        await characterModal.saveCharacter();

        // Navigate to Voice Actor View
        await page.click('#nav-voice-actors');
        // Ensure the view is visible
        await expect(page.locator('#voice-actor-view')).not.toHaveClass(/hidden/);
    });

    test.describe('Line Reader @feature-line-reader', () => {
        test('Load Script, Record Take, and Update Metadata', async ({ page }) => {
            // Ensure we are on the Line Reader tab
            await page.click('.tab-link[data-tab="scripts"]');

            // Upload a dummy script file
            const scriptContent = 'This is line 1.\nThis is line 2.';
            const filePath = 'dummy-script.txt';
            fs.writeFileSync(filePath, scriptContent);
            await page.setInputFiles('#script-file-input', filePath);
            fs.unlinkSync(filePath); // Cleanup

            // Verify the script loaded into the container
            const lines = page.locator('#line-container .line-entry');
            await expect(lines).toHaveCount(2);

            // Select the first line in the script container
            await lines.nth(0).click();

            // Click the Read button to move it to the read container
            await page.click('#read-button');

            // Select it in the read container to open the details pane
            const readLines = page.locator('#read-container .line-entry');
            await readLines.nth(0).click();

            // Wait a tick for UI update
            await page.waitForTimeout(100);
            await page.selectOption('#line-character-select', { index: 1 });

            // Record a take
            const recordBtn = page.locator('#record-take-button');
            await recordBtn.click(); // Start recording
            await expect(recordBtn).toHaveClass(/recording/);
            await page.waitForTimeout(500); // Simulate talking
            await recordBtn.click(); // Stop recording

            // Verify a take was added
            const takesList = page.locator('#takes-list .take-item');
            await expect(takesList).toHaveCount(1);

            // Give it a 5-star rating and add notes
            await takesList.nth(0).locator('.star').nth(4).click();
            await takesList.nth(0).locator('.take-note-input').fill('Great energy!');

            // Change line state to Done
            await page.selectOption('#line-state-select', 'Done');

            // Verify UI status indicator updated
            const statusIndicator = lines.nth(0).locator('.status-dot');
            await expect(statusIndicator).toHaveClass(/dot-done/);
        });
    });

    test.describe('Teleprompter @feature-teleprompter', () => {
        test('Teleprompter UI controls and continuous recording', async ({ page }) => {
            // Ensure we are on the Teleprompter tab
            await page.click('.tab-link[data-tab="teleprompt"]');

            // Upload a dummy script file to make it the active file
            const tpScriptContent = 'Teleprompter text line 1.\nTeleprompter text line 2.';
            const tpFilePath = 'teleprompt-script.txt';
            fs.writeFileSync(tpFilePath, tpScriptContent);
            await page.setInputFiles('#teleprompt-file-input', tpFilePath);
            fs.unlinkSync(tpFilePath);
            const fontLabel = page.locator('#teleprompt-font-label');
            const originalFont = await fontLabel.textContent();
            await page.click('#teleprompt-font-plus');
            await expect(fontLabel).not.toHaveText(originalFont || '');

            // Record a take
            const recordBtn = page.locator('#teleprompt-record-button');
            await recordBtn.click(); // Start
            await expect(recordBtn).toHaveClass(/recording/, { timeout: 15000 });
            await page.waitForTimeout(500); // Talk
            await recordBtn.click(); // Stop

            // Verify take appears in the teleprompter list
            const takesList = page.locator('#teleprompt-takes-list .take-item');
            await expect(takesList).toHaveCount(1);
        });
    });

    test.describe('Auditions @feature-auditions', () => {
        test('Creates audition, updates status, and exports valid ZIP', async ({ page }) => {
            // Setup an actor profile first to avoid export block
            await page.click('#nav-character-library');
            await page.click('.tab-link[data-tab="pl-me"]');
            await page.fill('#me-first-name', 'John');
            await page.fill('#me-last-name', 'Doe');
            await page.fill('#me-email', 'john@example.com');
            await page.click('#me-save-btn');
            await page.click('#nav-voice-actors');

            // Navigate to Auditions
            await page.click('.tab-link[data-tab="auditions"]');

            // Create new Audition
            await page.click('#new-audition-button');
            await expect(page.locator('#audition-modal')).not.toHaveClass(/hidden/);

            await page.fill('#aud-project-name', 'Awesome Game');
            await page.fill('#cd-name', 'Casting Director Jane');
            await page.selectOption('#aud-character-select', { label: 'Voice Actor Hero' });

            // Record audio for the audition
            const recordBtn = page.locator('#audition-audio-record-btn');
            await recordBtn.click();
            await expect(recordBtn).toHaveClass(/recording/);
            await page.waitForTimeout(500);
            await recordBtn.click();
            await expect(page.locator('#audition-audio-player')).toBeVisible();

            // Save audition
            await page.click('#save-audition-button');
            await expect(page.locator('#audition-modal')).toHaveClass(/hidden/);

            // Ensure it appears in active list
            const activeCard = page.locator('#active-audition-list .audition-card');
            await expect(activeCard).toHaveCount(1);

            // Check that the export generates a valid zip
            // Click export on the card
            await activeCard.nth(0).locator('.export-audition-btn').click();
            // Wait for export modal to appear
            await expect(page.locator('#audition-export-modal')).not.toHaveClass(/hidden/, { timeout: 1000 }).catch(() => {});

            // Intercept download
            const downloadPromise = page.waitForEvent('download');
            await page.click('#audition-export-confirm-btn');
            const download = await downloadPromise;

            // Save to disk and parse ZIP
            const path = await download.path();
            expect(path).not.toBeNull();
            
            const buffer = fs.readFileSync(path!);
            const zip = await JSZip.loadAsync(buffer);
            
            // Check contents inside 'John Doe' folder
            const folderName = 'John Doe/';
            const folderFiles = Object.keys(zip.files).filter(name => name.startsWith(folderName));
            expect(folderFiles.length).toBeGreaterThan(0);
            expect(folderFiles).toContain(`${folderName}Audition.json`);
            
            // Validate JSON content
            const jsonFile = zip.file(`${folderName}Audition.json`);
            expect(jsonFile).not.toBeNull();
            const jsonData = JSON.parse(await jsonFile!.async('string'));
            expect(jsonData.project).toBe('Awesome Game');
            expect(jsonData.character).toBe('Voice Actor Hero');
            expect(jsonData.actorFirstName).toBe('John');

            // Validate status changing moves it to inactive
            await page.selectOption('.audition-status-dropdown', 'Rejected');
            await expect(page.locator('#active-audition-list .audition-card')).toHaveCount(0);
            await expect(page.locator('#inactive-audition-list .audition-card')).toHaveCount(1);
        });
    });

    test.describe('Effect Library @feature-effects', () => {
        test('Records effect, filters, and exports valid ZIP', async ({ page }) => {
            await page.click('.tab-link[data-tab="effect-library"]');

            // Create new Effect
            await page.click('#new-effect-button');
            await expect(page.locator('#effect-modal')).not.toHaveClass(/hidden/);

            await page.fill('#effect-modal-title-input', 'Evil Laugh');
            
            // Set tag
            const tagInput = page.locator('#effect-modal-tags-input');
            await tagInput.fill('laugh');
            await tagInput.press('Enter');

            // Set character
            await page.selectOption('#effect-modal-character-select', { label: 'Voice Actor Hero' });
            await page.click('#effect-modal-add-character'); // Adds it to the list

            // Record audio
            const recordBtn = page.locator('#effect-record-button');
            await recordBtn.click();
            await expect(recordBtn).toHaveClass(/recording/);
            await page.waitForTimeout(500);
            await recordBtn.click();

            // Save effect
            await page.click('#effect-modal-save-btn');
            await expect(page.locator('#effect-modal')).toHaveClass(/hidden/);

            // Verify it renders
            const cards = page.locator('#effect-cards-grid .effect-card');
            await expect(cards).toHaveCount(1);

            // Test filtering
            await page.fill('#effect-tag-search', 'laugh');
            await expect(cards).toHaveCount(1); // Should still match
            await page.fill('#effect-tag-search', 'cry');
            await expect(cards).toHaveCount(0); // Should hide
            await page.fill('#effect-tag-search', '');
            await expect(cards).toHaveCount(1); // Resets

            // Export ZIP
            await page.click('#effect-select-all-btn');
            
            const downloadPromise = page.waitForEvent('download');
            await page.click('#effect-download-btn');
            const download = await downloadPromise;

            const path = await download.path();
            expect(path).not.toBeNull();

            const buffer = fs.readFileSync(path!);
            const zip = await JSZip.loadAsync(buffer);
            
            // Verify there is an audio file (e.g. .webm or .wav)
            // Verify there is an audio file inside the audio/ folder
            const files = Object.keys(zip.files);
            const audioFile = files.find(f => f.startsWith('audio/') && f.includes('evil_laugh') && (f.endsWith('.webm') || f.endsWith('.wav')));
            expect(audioFile).toBeDefined();
        });
    });
});
