import { SystemSettings } from '../types.js';
import { updateStorageUsageDisplay } from '../views/settings-view.js';

export function initializeNavigation() {
    const navLinks = document.querySelectorAll('#main-nav a');
    const views = document.querySelectorAll('.view');

    const navCharacterLibrary = document.getElementById('nav-character-library');
    const navVoiceActors = document.getElementById('nav-voice-actors');
    const navVoiceProduction = document.getElementById('nav-voice-production');
    const navStoryteller = document.getElementById('nav-dungeon-master');
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
    const navStoryteller = document.getElementById('nav-dungeon-master');
    const navVoiceProduction = document.getElementById('nav-voice-production');
    const navUtilities = document.getElementById('nav-utilities');

    if (navVoiceActors) navVoiceActors.style.display = fv.viewVoiceActor ? '' : 'none';
    if (navStoryteller) navStoryteller.style.display = fv.viewStoryteller ? '' : 'none';
    if (navVoiceProduction) navVoiceProduction.style.display = fv.viewVoiceProduction ? '' : 'none';
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

    // Tab links (Voice Production)
    const tabVpFeedback = document.querySelector('button[data-tab="vp-feedback"]') as HTMLElement;
    const tabVpScript = document.querySelector('button[data-tab="vp-script"]') as HTMLElement;
    const tabVpSides = document.querySelector('button[data-tab="vp-sides"]') as HTMLElement;
    const tabVpAuditions = document.querySelector('button[data-tab="vp-auditions"]') as HTMLElement;
    const tabVpContraster = document.querySelector('button[data-tab="vp-contraster"]') as HTMLElement;
    const tabVpTableRead = document.querySelector('button[data-tab="vp-table-read"]') as HTMLElement;

    if (tabVpFeedback) tabVpFeedback.style.display = fv.tabVpFeedback ? '' : 'none';
    if (tabVpScript) tabVpScript.style.display = fv.tabVpScript ? '' : 'none';
    if (tabVpSides) tabVpSides.style.display = fv.tabVpSides ? '' : 'none';
    if (tabVpAuditions) tabVpAuditions.style.display = fv.tabVpAuditions ? '' : 'none';
    if (tabVpContraster) tabVpContraster.style.display = fv.tabVpContraster ? '' : 'none';
    if (tabVpTableRead) tabVpTableRead.style.display = fv.tabVpTableRead ? '' : 'none';

    // Tab links (Storyteller)
    const tabDmSession = document.querySelector('button[data-tab="dm-session"]') as HTMLElement;
    const tabDmGenerator = document.querySelector('button[data-tab="dm-generator"]') as HTMLElement;
    const tabDmCharacterNotes = document.querySelector('button[data-tab="dm-character-notes"]') as HTMLElement;

    if (tabDmSession) tabDmSession.style.display = fv.tabDmSession ? '' : 'none';
    if (tabDmGenerator) tabDmGenerator.style.display = fv.tabDmGenerator ? '' : 'none';
    if (tabDmCharacterNotes) tabDmCharacterNotes.style.display = fv.tabDmCharacterNotes ? '' : 'none';

    // Tab links (Utility)
    const tabWarmups = document.querySelector('button[data-tab="warm-ups"]') as HTMLElement;
    const tabVoiceMemos = document.querySelector('button[data-tab="voice-memos"]') as HTMLElement;
    const tabAudioOverlay = document.querySelector('button[data-tab="audio-overlay"]') as HTMLElement;

    if (tabWarmups) tabWarmups.style.display = fv.tabWarmups ? '' : 'none';
    if (tabVoiceMemos) tabVoiceMemos.style.display = fv.tabVoiceMemos ? '' : 'none';
    if (tabAudioOverlay) tabAudioOverlay.style.display = fv.tabAudioOverlay ? '' : 'none';

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
