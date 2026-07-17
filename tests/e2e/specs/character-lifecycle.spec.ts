import { test, expect } from '@playwright/test';
import { CharacterModalPage } from '../pages/CharacterModalPage';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Validates character creation and deletion within projects, ensuring appropriate relational constraints (cascading deletes) behave properly.
 */
test.describe('Character Lifecycle & Cascading Deletes @feature-characters', () => {
    let characterModal: CharacterModalPage;
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        characterModal = new CharacterModalPage(page);
        basePage = new BasePage(page);
        await basePage.navigate();
        
        // Ensure we are on the Character Library view
        await page.click('#nav-character-library');
    });

    test('creates and deletes a character, verifying IndexedDB cleanup', async ({ page }) => {
        // 1. Create Character
        await page.click('#new-character-button');
        
        const characterName = 'Test Automaton';
        const characterDesc = 'A robot designed for E2E testing.';
        
        await characterModal.fillCharacterDetails(characterName, characterDesc);
        
        // Intercept the save call or just wait for UI to update
        await characterModal.saveCharacter();

        // 2. Verify Character appears in the UI
        // The characters are rendered in #character-list
        const characterCard = page.locator('.character-card', { hasText: characterName });
        await expect(characterCard).toBeVisible();

        // 3. Verify IndexedDB State (Wait a moment for IDB to sync)
        await page.waitForTimeout(500); // Small buffer for IDB transaction
        const initialCharacters = await basePage.evaluateIndexedDBRecords('app_state');
        // app_state uses keys, we need to find the 'characters' key
        const charState: any = initialCharacters.find((record: any) => record.key === 'characters');
        expect(charState).toBeDefined();
        expect(charState.data.some((c: any) => c.name === characterName)).toBeTruthy();

        // 4. Delete the Character
        // We need to click the card to open the view modal, then click delete
        await characterCard.click();
        
        page.on('dialog', dialog => dialog.accept()); // Accept the confirmation alert
        await characterModal.deleteCharacter();

        // 5. Verify Character disappears from UI
        await expect(characterCard).toHaveCount(0);

        // 6. Verify IndexedDB Cleanup
        await page.waitForTimeout(500); // Small buffer for IDB transaction
        const finalCharacters = await basePage.evaluateIndexedDBRecords('app_state');
        const finalCharState: any = finalCharacters.find((record: any) => record.key === 'characters');
        expect(finalCharState.data.some((c: any) => c.name === characterName)).toBeFalsy();
    });
});
