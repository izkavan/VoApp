import { Project, Character, Audition, ReceivedAudition } from './types.js';
import { DataStore } from './services/DataStore.js';
import { EventBus } from './services/EventBus.js';
import { CharacterManager } from './managers/CharacterManager.js';
import { ProjectManager } from './managers/ProjectManager.js';
import { migrateLegacyArtwork } from './managers/LegacyMigration.js';

import { initializeCharacterRenderer } from './components/character-renderer.js';
import { initializeCharacterModal, openModal, closeModal } from './components/character-modal.js';
import { initializeProjectModal, openProjectModal, closeProjectModal, saveProject } from './components/project-modal.js';
import { initializeFilterSearch, filterCharacters, updateFilterData } from './components/filter-search.js';
import { initializeTheme } from './core/theme.js';
import { initializeNavigation, applyFeatureVisibility } from './core/navigation.js';
import { initializeMeView, loadMeViewData } from './views/me-view.js';
import { initializeVoiceActorView } from './views/voice-actor-view.js';
import { initializeLineReader, refreshLineReaderView } from './views/line-reader.js';
import { initializeUtilityView } from './views/utility-view.js';
import { initializeAuditionView, refreshAuditionView } from './views/audition-view.js';
import { initializeTeleprompter, refreshTeleprompterProjects } from './components/teleprompt.js';
import { initializeDungeonMasterView, refreshDungeonMasterView } from './views/dungeon-master-view.js';
import { initializeCharacterNotesView, refreshCharacterNotesView } from './views/character-notes-view.js';
import { initializeSettingsView } from './views/settings-view.js';
import { initializeDictionaryModal, openDictionaryModal } from './components/dictionary-modal.js';
import { initializeDictionaryHighlighter } from './components/dictionary-highlighter.js';
import { initializeWarmupView, refreshWarmupView } from './views/warmup-view.js';
import { initializeEffectLibrary, refreshEffectLibraryView } from './views/effect-library.js';
import { initializeVoiceProductionFeedback } from './views/voice-production/vp-feedback.js';
import { initializeScriptView, refreshScriptView } from './views/voice-production/vp-script.js';
import { initializeSidesView, refreshSidesView } from './views/voice-production/vp-sides.js';
import { initializeContrasterView } from './views/voice-production/vp-contraster.js';
import { initializeVPAuditionsView, refreshVPAuditionsView } from './views/voice-production/vp-auditions.js';
import { initializeTableReadView, setTableReadData } from './views/voice-production/vp-table-read.js';
import { initializeAudioOverlay } from './views/utilities/audio-overlay.js';
import { initializeVoiceMemos, refreshVoiceMemosProjects } from './views/utility/voice-memos.js';
import { initializeRecordTimer } from './components/record-timer.js';
import { initializeCraftDemoReel } from './views/craft-demo-reel.js';
import { initializeEditAudioModal } from './views/edit-audio-modal.js';
import { initializeScriptImportModal } from './components/script-import-modal.js';

// --- Main Page Elements ---
const characterListElement = document.getElementById('character-list');
const newCharacterButton = document.getElementById('new-character-button');
const newProjectButton = document.getElementById('new-project-button');
const importProjectButton = document.getElementById('import-project-button');
const filterTagsInput = document.getElementById('filter-tags') as HTMLInputElement;
const tagSuggestionsElement = document.getElementById('tag-suggestions');
const activeTagsContainer = document.getElementById('active-tags-container');
const exclusiveToggle = document.getElementById('exclusive-toggle') as HTMLInputElement;

// --- Modal Elements ---
const modalElement = document.getElementById('modal');
const modalContentElement = document.getElementById('modal-view-content');
const modalCloseButton = document.getElementById('modal-close');

// --- Project Modal Elements ---
const projectModalElement = document.getElementById('project-modal');
const projectModalCloseButton = document.getElementById('project-modal-close');
const saveProjectButton = document.getElementById('save-project-button');
const exportProjectButton = document.getElementById('export-project-button') as HTMLButtonElement;
const deleteProjectButton = document.getElementById('delete-project-button') as HTMLButtonElement;
const projectNameInput = document.getElementById('project-name') as HTMLInputElement;
const projectDescriptionInput = document.getElementById('project-description') as HTMLTextAreaElement;
const projectLicensingInput = document.getElementById('project-licensing') as HTMLInputElement;
const projectStartDateInput = document.getElementById('project-start-date') as HTMLInputElement;
const projectEndDateInput = document.getElementById('project-end-date') as HTMLInputElement;

// --- Dictionary Modal ---
const dictionaryModalElement = document.getElementById('dictionary-modal') as HTMLElement;
const dictionaryModalContentElement = document.getElementById('dictionary-modal-content') as HTMLElement;

export function renderApp() {
    const characters = DataStore.getCharacters();
    const projects = DataStore.getProjects();
    
    updateFilterData(characters, projects);
    filterCharacters();
    refreshDungeonMasterView(projects, characters);
    refreshCharacterNotesView(projects, characters);
    refreshScriptView(projects, characters);
    refreshSidesView(characters);
    loadMeViewData();
    
    refreshLineReaderView(projects, characters);
    refreshTeleprompterProjects(projects);
    refreshEffectLibraryView(projects, characters);
    refreshWarmupView(projects, characters);
    refreshAuditionView(characters);
    refreshVoiceMemosProjects(projects);
    refreshVPAuditionsView(projects, characters);
}

// Subscribe to store updates to keep the UI fresh
EventBus.on('storeUpdated', renderApp);

// --- Event Listeners ---
newCharacterButton?.addEventListener('click', () => openModal());
modalCloseButton?.addEventListener('click', closeModal);
newProjectButton?.addEventListener('click', () => openProjectModal());
projectModalCloseButton?.addEventListener('click', closeProjectModal);
saveProjectButton?.addEventListener('click', saveProject);
importProjectButton?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
        const selectedFile = (e.target as HTMLInputElement).files?.[0];
        if (selectedFile) {
            await ProjectManager.importProject(selectedFile);
        }
    };
    input.click();
});

window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('modal')) {
        if (target.id === 'modal') closeModal();
        else if (target.id === 'project-modal') closeProjectModal();
        else target.style.display = 'none';
    }
});

async function initApp() {
    DataStore.initialize();
    
    // Grab snapshots for legacy initialize functions. 
    // They will be refactored in Phase 5 to rely on DataStore directly.
    let characters = DataStore.getCharacters();
    let projects = DataStore.getProjects();
    let auditions = DataStore.getAuditions();
    let receivedAuditions = DataStore.getState().receivedAuditions;
    let warmups = DataStore.getState().warmups;
    let currentSettings = DataStore.getSettings();

    if (currentSettings.systemFont && currentSettings.systemFont !== 'default') {
        document.documentElement.style.setProperty('--system-font', currentSettings.systemFont);
    } else {
        document.documentElement.style.setProperty('--system-font', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif");
    }

    const migrated = await migrateLegacyArtwork(characters);
    if (migrated) {
        DataStore.restoreAll(characters, projects, auditions, currentSettings);
    }
    
    initializeCharacterRenderer(openModal, openProjectModal, openDictionaryModal);

    initializeCharacterModal(
        modalElement as HTMLElement,
        modalContentElement as HTMLElement,
        characters,
        projects,
        (char, art, samp, rec) => CharacterManager.saveCharacter(char, art, samp, rec),
        (char) => CharacterManager.duplicateCharacter(char),
        (id) => CharacterManager.deleteCharacter(id)
    );

    initializeDictionaryModal(dictionaryModalElement, dictionaryModalContentElement);

    initializeProjectModal(
        projectModalElement as HTMLElement,
        projectNameInput,
        projectDescriptionInput,
        projectLicensingInput,
        projectStartDateInput,
        projectEndDateInput,
        exportProjectButton,
        deleteProjectButton,
        projects,
        characters,
        currentSettings,
        renderApp,
        (id) => ProjectManager.deleteProject(id),
        (updatedProjects) => {
            updatedProjects.forEach(p => DataStore.updateProject(p));
        }
    );

    initializeFilterSearch(
        filterTagsInput,
        tagSuggestionsElement as HTMLElement,
        activeTagsContainer as HTMLElement,
        exclusiveToggle,
        characterListElement as HTMLElement,
        characters,
        projects,
        (cId, pId) => CharacterManager.onCharacterDrop(cId, pId),
        renderApp
    );

    initializeTheme();
    initializeNavigation();
    initializeMeView();
    applyFeatureVisibility(currentSettings);
    initializeAudioOverlay();
    initializeRecordTimer(currentSettings);
    initializeCraftDemoReel();
    initializeEditAudioModal();
    initializeScriptImportModal();

    // Data Load
    initializeVoiceActorView();
    initializeVoiceProductionFeedback();
    initializeLineReader(characters, projects, currentSettings, openModal);
    initializeDungeonMasterView(characters, projects, openModal);
    initializeCharacterNotesView(characters, projects, openModal);
    initializeUtilityView();
    initializeScriptView(projects, characters, openDictionaryModal);
    initializeSidesView(characters, openModal);
    
    initializeContrasterView(receivedAuditions, (updatedReceived) => {
        // Temporary patch until contraster is refactored
        const state = DataStore.getState();
        DataStore.restoreAll(state.characters, state.projects, state.auditions, state.settings); 
    });

    setTableReadData(characters, projects);
    initializeTableReadView(openModal);

    initializeVPAuditionsView(receivedAuditions, projects, characters, (updatedReceived) => {
        // Temporary patch
    });
    
    initializeAuditionView(auditions, characters, currentSettings, (updatedAuditions) => {
        DataStore.updateAuditions(updatedAuditions);
    }, (updatedSettings) => {
        DataStore.updateSettings(updatedSettings);
    });

    initializeDictionaryHighlighter();
    initializeTeleprompter(projects);

    initializeWarmupView(warmups, characters, projects, (updatedWarmups) => {
        // Temporary patch
    });

    initializeEffectLibrary(characters, projects, currentSettings, (updatedSettings) => {
        DataStore.updateSettings({ ...currentSettings, ...updatedSettings });
    });

    initializeSettingsView(
        currentSettings,
        characters,
        projects,
        auditions,
        (newSettings) => {
            DataStore.updateSettings({ ...currentSettings, ...newSettings });
            applyFeatureVisibility(DataStore.getSettings());
        },
        (newChars, newProjs, newAuds, newSets) => {
            DataStore.restoreAll(newChars, newProjs, newAuds, newSets);
            renderApp();
            location.reload(); 
        }
    );

    renderApp();
}

initApp();
