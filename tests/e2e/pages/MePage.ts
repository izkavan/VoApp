import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MePage extends BasePage {
    readonly meTab: Locator;
    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly emailInput: Locator;
    readonly saveBtn: Locator;
    readonly saveBtnBottom: Locator;

    constructor(page: Page) {
        super(page);
        // Assuming we are already in the Project Library view
        this.meTab = page.locator('.tab-link[data-tab="pl-me"]');
        this.firstNameInput = page.locator('#me-first-name');
        this.lastNameInput = page.locator('#me-last-name');
        this.emailInput = page.locator('#me-email');
        this.saveBtn = page.locator('#me-save-btn');
        this.saveBtnBottom = page.locator('#me-save-btn-bottom');
    }

    async navigateToMeTab() {
        await this.meTab.click();
    }

    async fillBasicInfo(firstName: string, lastName: string, email: string) {
        await this.firstNameInput.fill(firstName);
        await this.lastNameInput.fill(lastName);
        await this.emailInput.fill(email);
    }

    async saveProfile() {
        await this.saveBtn.click();
    }

    async uploadHeadshot(filePath: string) {
        await this.page.locator('#me-headshot-upload').setInputFiles(filePath);
    }

    async uploadDemoReel(filePath: string) {
        await this.page.locator('#me-demoreel-upload').setInputFiles(filePath);
    }
}
