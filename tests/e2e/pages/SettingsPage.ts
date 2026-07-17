import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
    readonly exportFormatSelect: Locator;
    readonly systemFontSelect: Locator;

    constructor(page: Page) {
        super(page);
        this.exportFormatSelect = page.locator('#settings-export-format');
        this.systemFontSelect = page.locator('#settings-system-font');
    }

    async navigateToSettings() {
        await this.page.click('#nav-settings');
    }

    async setExportFormat(format: 'webm' | 'wav') {
        await this.exportFormatSelect.selectOption(format);
    }

    async setSystemFont(font: string) {
        await this.systemFontSelect.selectOption(font);
    }
}
