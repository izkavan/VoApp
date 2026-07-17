import { test, expect } from '../fixtures/coverage';
import { BasePage } from '../pages/BasePage';
import { ProjectModalPage } from '../pages/ProjectModalPage';
import { CharacterModalPage } from '../pages/CharacterModalPage';
import fs from 'fs';
import JSZip from 'jszip';

/**
 * @purpose Validates the Voice Production View, including Script breakdown, Sides generation, Auditions workflow, Table Reads, and Feedback tools.
 */
test.describe('Voice Production View @feature-voice-production', () => {
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
        await projectModal.fillProjectDetails('VP Project', 'Test Data');
        await projectModal.saveProject();
        await characterModal.openNewCharacterModal();
        await characterModal.fillCharacterDetails('VP Character', 'Test Data');
        await page.selectOption('#wc-character-project', { label: 'VP Project' });
        await characterModal.saveCharacter();

        // Navigate to Voice Production View
        await page.click('#nav-voice-production');
        // Ensure the view is visible
        await expect(page.locator('#voice-production-view')).not.toHaveClass(/hidden/);
    });

    test.describe('Script @feature-vp-script', () => {
        test('Upload Script, map characters, and export', async ({ page }) => {
            await page.click('.tab-link[data-tab="vp-script"]');

            const scriptJson = {
                name: 'Test VP Script',
                version: '1.0',
                projectId: undefined,
                lines: [
                    { id: '1', characterName: 'VP Character', characterId: '1', text: 'Hello there!', type: 'line' },
                    { id: '2', characterName: 'Other', characterId: '2', text: 'Hi John.', type: 'line' }
                ]
            };
            const scriptPath = 'test-vp-script.json';
            fs.writeFileSync(scriptPath, JSON.stringify(scriptJson));
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.click('#vp-script-import-btn')
            ]);
            await fileChooser.setFiles(scriptPath);
            fs.unlinkSync(scriptPath);

            await page.fill('#vp-script-name', 'Test VP Script');
            
            // Validate lines populated
            const lines = page.locator('#vp-script-lines .script-line-item');
            await expect(lines).toHaveCount(2);

            // Wait for download event
            const downloadPromise = page.waitForEvent('download');
            await page.click('#vp-script-save-btn');
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toContain('.zip');
        });
    });

    test.describe('Sides @feature-vp-sides', () => {
        test('Generate sides from script', async ({ page }) => {
            await page.click('.tab-link[data-tab="vp-sides"]');

            // Generate a dummy script JSON package to import
            const scriptJson = {
                name: 'Sides Script',
                version: '1.0',
                projectId: undefined,
                lines: [
                    { id: '1', characterName: 'VP Character', text: 'Sides Line 1', dialogue: true },
                    { id: '2', characterName: 'Other', text: 'Context Line', dialogue: true }
                ]
            };
            const scriptPath = 'sides-script.json';
            fs.writeFileSync(scriptPath, JSON.stringify(scriptJson));
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.click('#vp-sides-import-btn')
            ]);
            await fileChooser.setFiles(scriptPath);
            fs.unlinkSync(scriptPath);

            const lines = page.locator('#vp-sides-lines .sides-line-item');
            await expect(lines).toHaveCount(2);
        });
    });

    test.describe('Auditions @feature-vp-auditions', () => {
        test('Import Audition ZIP and mark callback', async ({ page }) => {
            await page.click('.tab-link[data-tab="vp-auditions"]');

            // Build a valid audition ZIP dynamically
            const zip = new JSZip();
            const auditionJson = {
                character: 'VP Character',
                actorFirstName: 'Test',
                actorLastName: 'Actor',
                audioData: 'dummy_audio_base64_data',
                fileName: 'take-1.webm'
            };
            zip.file('Audition.json', JSON.stringify(auditionJson));
            
            // Dummy audio file
            zip.folder('audio')?.file('take-1.webm', 'dummy audio content');

            const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
            const zipPath = 'test-audition.zip';
            fs.writeFileSync(zipPath, zipContent);

            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.click('#vp-auditions-import-btn')
            ]);
            await fileChooser.setFiles(zipPath);
            fs.unlinkSync(zipPath);

            // Wait a moment for processing and select character
            await page.waitForTimeout(500);
            
            // Select the character so the list populates (the character item should be rendered from the parsed audition)
            const chars = page.locator('.vp-auditions-character-item');
            if (await chars.count() > 0) {
                await chars.first().click();
            }

            // Verify it appeared in the list
            const auditions = page.locator('audition-card');
            await expect(auditions).toHaveCount(1);
        });
    });

    test.describe('Table Read @feature-vp-table-read', () => {
        test('Import script and audio to Table Read', async ({ page }) => {
            await page.click('.tab-link[data-tab="vp-table-read"]');

            // Load a dummy script
            const scriptJson = {
                name: 'Table Read Script',
                lines: [
                    { id: '1', characterName: 'VP Character', characterId: '1', text: 'Table Read Line 1', dialogue: true, type: 'line' }
                ]
            };
            const scriptPath = 'tr-script.json';
            fs.writeFileSync(scriptPath, JSON.stringify(scriptJson));
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.click('#vp-table-read-import-master-btn')
            ]);
            await fileChooser.setFiles(scriptPath);
            fs.unlinkSync(scriptPath);

            // Ensure lines are rendered
            const lines = page.locator('#vp-table-read-lines-container table-read-line');
            await expect(lines).toHaveCount(1);
        });
    });

    test.describe('Contraster @feature-vp-contraster', () => {
        test('Load audio into contraster', async ({ page }) => {
            await page.click('.tab-link[data-tab="vp-contraster"]');

            // Set up a basic interaction
            const audioPath = 'dummy-take.webm';
            fs.writeFileSync(audioPath, 'dummy data');
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.click('#vp-contraster-import-btn')
            ]);
            await fileChooser.setFiles(audioPath);
            fs.unlinkSync(audioPath);

            // Click play buttons to ensure they don't crash
            await page.click('#vp-contraster-play-btn');
        });
    });

    test.describe('Feedback @feature-vp-feedback', () => {
        test('Load audio and add feedback notes', async ({ page }) => {
            await page.click('.tab-link[data-tab="vp-feedback"]');

            const audioPath = 'tests/e2e/fixtures/valid.wav';
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.locator('button:has-text("Import File(s)")').click()
            ]);
            await fileChooser.setFiles(audioPath);

            await page.click('#vp-btn-insert-comment');
            await page.fill('#comment-timestamp-input', '0:01');
            await page.fill('#comment-text-input', 'Needs more energy');
            await page.click('#comment-save-btn');

            const notes = page.locator('#vp-comment-list .vp-comment-item');
            await expect(notes).toHaveCount(1);
        });
    });
});
