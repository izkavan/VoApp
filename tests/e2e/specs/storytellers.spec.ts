import { test, expect } from '@playwright/test';
import { BasePage } from '../pages/BasePage';
import { ProjectModalPage } from '../pages/ProjectModalPage';
import { CharacterModalPage } from '../pages/CharacterModalPage';

/**
 * @purpose Validates the Storytellers features (Dungeon Master View), including the Session builder, Generator, and Character Notes journal, ensuring state consistency and data isolation across tools.
 */
test.describe('Storytellers View @feature-storytellers', () => {
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
        await projectModal.fillProjectDetails('Storyteller Project', 'Test Data');
        await projectModal.saveProject();

        await characterModal.openNewCharacterModal();
        await characterModal.fillCharacterDetails('Storyteller Hero', 'Test Data');
        await page.selectOption('#wc-character-project', { label: 'Storyteller Project' });
        await characterModal.saveCharacter();

        // Navigate to Storytellers
        await page.click('#nav-dungeon-master');
        await page.waitForSelector('#dungeon-master-view', { state: 'visible' });
    });

    test('Session Builder: Adds, renders, and resets characters', async ({ page }) => {
        // Switch to Session tab (should be default but we enforce)
        await page.click('.tab-link[data-tab="dm-session"]');
        
        // Ensure character select is populated
        const charSelect = page.locator('#dm-session-character');
        await expect(charSelect).toContainText('Storyteller Hero');

        // Add character to session
        // Assuming the option value gets selected automatically or we just use the selected one
        await page.selectOption('#dm-session-character', { label: 'Storyteller Hero' });
        await page.click('#dm-session-add-character');

        // Verify the character card appears in the session board
        const sessionBoard = page.locator('#dm-session-characters');
        await expect(sessionBoard.locator('.character-card', { hasText: 'Storyteller Hero' })).toBeVisible();

        // Reset the session
        await page.click('#dm-session-reset');
        await expect(sessionBoard.locator('.character-card')).toHaveCount(0);
    });

    test('Character Generator: Creates random character', async ({ page }) => {
        await page.click('.tab-link[data-tab="dm-generator"]');

        // Select the specific project
        await page.selectOption('#dm-generator-project', { label: 'Storyteller Project' });

        // Generate character
        await page.click('#dm-generator-button');

        // The Character Modal should pop up with a random character
        const modal = page.locator('character-modal');
        await expect(modal).not.toHaveClass(/hidden/);
        await expect(page.locator('#wc-edit-name')).not.toBeEmpty();

        // Close it without saving to avoid polluting
        await page.click('#modal-close');
        await expect(modal).toBeHidden();
    });

    test('Character Notes (Journal): Text, Social, and Event Entries', async ({ page }) => {
        await page.click('.tab-link[data-tab="dm-character-notes"]');

        // Select Project and Character to reveal journal
        await page.selectOption('#dm-notes-project-select', { label: 'Storyteller Project' });
        await page.selectOption('#dm-notes-character-select', { label: 'Storyteller Hero' });

        // Verify container is visible
        const container = page.locator('#dm-notes-container');
        await expect(container).toBeVisible();

        // 1. Text Entry
        await page.click('#dm-notes-add-text');
        await expect(page.locator('#dm-notes-editor')).toBeVisible();
        await page.fill('#j-edit-title', 'My Secret Text Note');
        await page.fill('#j-edit-content', 'This is a deep secret.');
        await page.click('#j-edit-save');
        
        // Verify it appears in the list
        const notesList = page.locator('#dm-notes-list');
        await expect(notesList.locator('.journal-list-item', { hasText: 'My Secret Text Note' })).toBeVisible();

        // 2. Social Entry
        await page.click('#dm-notes-add-social');
        // Wait for social editor fields
        await expect(page.locator('#j-edit-npcName')).toBeVisible();
        await page.fill('#j-edit-npcName', 'Mysterious Merchant');
        await page.fill('#j-edit-occupation', 'Vendor');
        await page.click('#j-edit-save');

        await expect(notesList.locator('.journal-list-item', { hasText: 'Mysterious Merchant' })).toBeVisible();

        // 3. Event Entry
        await page.click('#dm-notes-add-event');
        await expect(page.locator('#j-edit-timeTookPlace')).toBeVisible();
        await page.fill('#j-edit-title', 'The Grand Festival');
        await page.fill('#j-edit-timeTookPlace', 'Spring Equinox');
        await page.click('#j-edit-save');

        await expect(notesList.locator('.journal-list-item', { hasText: 'The Grand Festival' })).toBeVisible();

        // Filtering
        await page.selectOption('#dm-notes-type-filter', { value: 'social' });
        await expect(notesList.locator('.journal-list-item', { hasText: 'Mysterious Merchant' })).toBeVisible();
        await expect(notesList.locator('.journal-list-item', { hasText: 'My Secret Text Note' })).toBeHidden();

        // Reset filter
        await page.selectOption('#dm-notes-type-filter', { value: 'all' });

        // Deleting an entry
        await notesList.locator('.journal-list-item', { hasText: 'The Grand Festival' }).click();
        
        page.once('dialog', dialog => dialog.accept());
        await page.click('#j-edit-delete');
        
        await expect(notesList.locator('.journal-list-item', { hasText: 'The Grand Festival' })).toBeHidden();
    });
});
