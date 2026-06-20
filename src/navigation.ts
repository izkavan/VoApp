import { SystemSettings } from './types.js';
import { updateStorageUsageDisplay } from './settings-view.js';

export function initializeNavigation() {
    const navLinks = document.querySelectorAll('#main-nav a');
    const views = document.querySelectorAll('.view');

    const navCharacterLibrary = document.getElementById('nav-character-library');
    const navVoiceActors = document.getElementById('nav-voice-actors');
    const navVoiceProduction = document.getElementById('nav-voice-production');
    const navDungeonMaster = document.getElementById('nav-dungeon-master');
    const navUtilities = document.getElementById('nav-utilities');
    const navSettings = document.getElementById('nav-settings');

    const characterLibraryView = document.getElementById('character-library-view');
    const voiceActorView = document.getElementById('voice-actor-view');
    const voiceProductionView = document.getElementById('voice-production-view');
    const dungeonMasterView = document.getElementById('dungeon-master-view');
    const utilityView = document.getElementById('utility-view');
    const settingsView = document.getElementById('settings-view');

    const showView = (viewToShow: HTMLElement) => {
        views.forEach(view => (view as HTMLElement).classList.add('hidden'));
        viewToShow.classList.remove('hidden');
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const id = link.id;
            if (id === 'nav-character-library' && characterLibraryView) {
                showView(characterLibraryView);
            } else if (id === 'nav-voice-actors' && voiceActorView) {
                showView(voiceActorView);
            } else if (id === 'nav-voice-production' && voiceProductionView) {
                showView(voiceProductionView);
            } else if (id === 'nav-dungeon-master' && dungeonMasterView) {
                showView(dungeonMasterView);
            } else if (id === 'nav-utilities' && utilityView) {
                showView(utilityView);
            } else if (id === 'nav-settings' && settingsView) {
                showView(settingsView);
                updateStorageUsageDisplay();
            }
        });
    });
}

export function applyFeatureVisibility(settings: SystemSettings) {
    if (!settings.featureVisibility) return;
    const fv = settings.featureVisibility;

    // View links
    const navVoiceActors = document.getElementById('nav-voice-actors');
    const navDungeonMaster = document.getElementById('nav-dungeon-master');
    const navUtilities = document.getElementById('nav-utilities');

    if (navVoiceActors) navVoiceActors.style.display = fv.viewVoiceActor ? '' : 'none';
    if (navDungeonMaster) navDungeonMaster.style.display = fv.viewDungeonMaster ? '' : 'none';
    if (navUtilities) navUtilities.style.display = fv.viewUtility ? '' : 'none';

    // Tab links (Voice Actor)
    const tabLineReader = document.querySelector('button[data-tab="scripts"]') as HTMLElement;
    const tabTeleprompt = document.querySelector('button[data-tab="teleprompt"]') as HTMLElement;
    const tabAuditions = document.querySelector('button[data-tab="auditions"]') as HTMLElement;
    const tabEffectLibrary = document.querySelector('button[data-tab="effect-library"]') as HTMLElement;

    if (tabLineReader) tabLineReader.style.display = fv.tabLineReader ? '' : 'none';
    if (tabTeleprompt) tabTeleprompt.style.display = fv.tabTeleprompter ? '' : 'none';
    if (tabAuditions) tabAuditions.style.display = fv.tabAuditions ? '' : 'none';
    if (tabEffectLibrary) tabEffectLibrary.style.display = fv.tabEffectLibrary ? '' : 'none';

    // Tab links (Utility)
    const tabWarmups = document.querySelector('button[data-tab="warm-ups"]') as HTMLElement;
    const tabVoiceMemos = document.querySelector('button[data-tab="voice-memos"]') as HTMLElement;

    if (tabWarmups) tabWarmups.style.display = fv.tabWarmups ? '' : 'none';
    if (tabVoiceMemos) tabVoiceMemos.style.display = fv.tabVoiceMemos ? '' : 'none';

    // Fallback logic for active elements that are now hidden
    
    // Fallback Views
    const activeNavLinks = Array.from(document.querySelectorAll('#main-nav a.active')) as HTMLElement[];
    for (const link of activeNavLinks) {
        if (link.style.display === 'none') {
            // Find first visible view link and click it
            const visibleLinks = Array.from(document.querySelectorAll('#main-nav a')).filter(l => (l as HTMLElement).style.display !== 'none');
            if (visibleLinks.length > 0) {
                (visibleLinks[0] as HTMLElement).click();
            }
        }
    }

    // Fallback Tabs
    const activeTabLinks = Array.from(document.querySelectorAll('.tab-link.active')) as HTMLElement[];
    for (const tab of activeTabLinks) {
        if (tab.style.display === 'none') {
            // Find sibling tabs that are visible and click the first one
            const parent = tab.parentElement;
            if (parent) {
                const visibleTabs = Array.from(parent.querySelectorAll('.tab-link')).filter(t => (t as HTMLElement).style.display !== 'none');
                if (visibleTabs.length > 0) {
                    (visibleTabs[0] as HTMLElement).click();
                }
            }
        }
    }
}
