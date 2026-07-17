import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectModalPage extends BasePage {
    readonly newProjectBtn: Locator;
    readonly nameInput: Locator;
    readonly descInput: Locator;
    readonly saveBtn: Locator;
    readonly deleteBtn: Locator;

    constructor(page: Page) {
        super(page);
        this.newProjectBtn = page.locator('#new-project-button');
        this.nameInput = page.locator('#project-name');
        this.descInput = page.locator('#project-description');
        this.saveBtn = page.locator('#save-project-button');
        this.deleteBtn = page.locator('#delete-project-button');
    }

    async openNewProjectModal() {
        await this.newProjectBtn.click();
    }

    async fillProjectDetails(name: string, description: string) {
        await this.nameInput.fill(name);
        await this.descInput.fill(description);
    }

    async saveProject() {
        await this.saveBtn.click();
    }

    async deleteProject() {
        await this.deleteBtn.click();
    }
}
