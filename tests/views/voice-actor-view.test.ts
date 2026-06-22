import { describe, it, expect, beforeEach } from 'vitest';
import { initializeVoiceActorView } from '../../src/views/voice-actor-view.js';

describe('voice-actor-view', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="tab-container">
                <button class="tab-link active" data-tab="tab1">Tab 1</button>
                <button class="tab-link" data-tab="tab2">Tab 2</button>
                <div class="tab-content active" id="tab1">Content 1</div>
                <div class="tab-content" id="tab2">Content 2</div>
            </div>
        `;
    });

    it('initializes tab switching', () => {
        initializeVoiceActorView();

        const tab2Btn = document.querySelector('[data-tab="tab2"]') as HTMLButtonElement;
        tab2Btn.click();

        const tab1 = document.getElementById('tab1') as HTMLDivElement;
        const tab2 = document.getElementById('tab2') as HTMLDivElement;
        const tab1Btn = document.querySelector('[data-tab="tab1"]') as HTMLButtonElement;

        expect(tab2Btn.classList.contains('active')).toBe(true);
        expect(tab1Btn.classList.contains('active')).toBe(false);

        expect(tab2.classList.contains('active')).toBe(true);
        expect(tab1.classList.contains('active')).toBe(false);
    });
});
