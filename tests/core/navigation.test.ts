import { describe, it, expect, beforeEach } from 'vitest';
import { initializeNavigation, applyFeatureVisibility } from '../../src/core/navigation.js';

describe('navigation', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <nav id="main-nav">
                <a id="nav-character-library">Lib</a>
                <a id="nav-voice-actors">Actors</a>
                <a id="nav-dungeon-master">DM</a>
                <a id="nav-utilities">Utils</a>
            </nav>
            <div id="character-library-view" class="view"></div>
            <div id="voice-actor-view" class="view hidden"></div>
            <div id="dungeon-master-view" class="view hidden"></div>
            <div id="utility-view" class="view hidden"></div>
            
            <button data-tab="scripts" class="tab-link"></button>
            <button data-tab="teleprompt" class="tab-link"></button>
            <button data-tab="auditions" class="tab-link"></button>
            <button data-tab="effect-library" class="tab-link"></button>
            <button data-tab="warm-ups" class="tab-link"></button>
            <button data-tab="voice-memos" class="tab-link"></button>
        `;
    });

    it('initializes navigation and switches views', () => {
        initializeNavigation();
        const actorLink = document.getElementById('nav-voice-actors');
        const actorView = document.getElementById('voice-actor-view');
        const libView = document.getElementById('character-library-view');

        expect(actorView?.classList.contains('hidden')).toBe(true);
        expect(libView?.classList.contains('hidden')).toBe(false);

        actorLink?.click();

        expect(actorView?.classList.contains('hidden')).toBe(false);
        expect(libView?.classList.contains('hidden')).toBe(true);
    });

    it('applies feature visibility correctly', () => {
        applyFeatureVisibility({
            featureVisibility: {
                viewVoiceActor: false,
                viewDungeonMaster: true,
                viewUtility: false,
                tabLineReader: false,
                tabTeleprompter: true,
                tabAuditions: true,
                tabEffectLibrary: false,
                tabWarmups: true,
                tabVoiceMemos: false,
                showRecordTimer: false
            }
        } as any);

        expect(document.getElementById('nav-voice-actors')?.style.display).toBe('none');
        expect(document.getElementById('nav-utilities')?.style.display).toBe('none');
        expect(document.getElementById('nav-dungeon-master')?.style.display).toBe('');

        expect((document.querySelector('button[data-tab="scripts"]') as HTMLElement).style.display).toBe('none');
        expect((document.querySelector('button[data-tab="teleprompt"]') as HTMLElement).style.display).toBe('');
    });
});
