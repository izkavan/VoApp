import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CharacterModalPage extends BasePage {
    readonly newCharacterBtn: Locator;
    readonly nameInput: Locator;
    readonly descInput: Locator;
    readonly saveBtn: Locator;
    readonly deleteBtn: Locator;

    constructor(page: Page) {
        super(page);
        this.newCharacterBtn = page.locator('#new-character-button');
        this.nameInput = page.locator('#wc-edit-name');
        this.descInput = page.locator('#wc-edit-description');
        this.saveBtn = page.locator('#wc-save-btn');
        this.deleteBtn = page.locator('#wc-del-btn');
    }

    async openNewCharacterModal() {
        await this.newCharacterBtn.click();
    }

    async fillCharacterDetails(name: string, description: string) {
        await this.nameInput.fill(name);
        await this.descInput.fill(description);
    }

    async saveCharacter() {
        await this.saveBtn.click();
    }

    async uploadArtwork(filePath: string) {
        // Because the input is visually hidden under a <label>, we can force upload
        await this.page.locator('#wc-edit-artwork').setInputFiles(filePath);
    }

    async deleteCharacter() {
        await this.deleteBtn.click();
    }
}
