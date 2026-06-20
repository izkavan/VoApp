import { Project, Character, Audition } from './types.js';
import { loadFromLocalStorage, saveToLocalStorage } from './storage.js';
import { initializeCharacterRenderer } from './character-renderer.js';
import { initializeCharacterModal, openModal, closeModal } from './character-modal.js';
import { initializeProjectModal, openProjectModal, closeProjectModal, saveProject } from './project-modal.js';
import { initializeFilterSearch, filterCharacters } from './filter-search.js';
import { initializeTheme } from './theme.js';
import { initializeNavigation } from './navigation.js';
import { initializeVoiceActorView } from './voice-actor-view.js';
import { initializeLineReader } from './line-reader.js';
import { initializeUtilityView } from './utility-view.js';
import { initializeAuditionView } from './audition-view.js';
import { initializeTeleprompter } from './teleprompt.js';
import { initializeDungeonMasterView, refreshDungeonMasterView } from './dungeon-master-view.js';
import { initializeSettingsView } from './settings-view.js';
import { initializeDictionaryModal, openDictionaryModal } from './dictionary-modal.js';
import { initializeDictionaryHighlighter } from './dictionary-highlighter.js';
import { initializeWarmupView } from './warmup-view.js';
import { initializeEffectLibrary } from './effect-library.js';
import { SystemSettings, Warmup } from './types.js';
import JSZip from 'jszip';

let characters: Character[] = [];
let projects: Project[] = [];
let auditions: Audition[] = [];
let warmups: Warmup[] = [];
let currentSettings: SystemSettings;

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
    filterCharacters();
    refreshDungeonMasterView();
}

function onCharacterDrop(characterId: number, projectId?: number) {
    const charIndex = characters.findIndex(c => c.id === characterId);
    if (charIndex > -1) {
        characters[charIndex].projectId = projectId;
        saveToLocalStorage(characters, projects, auditions, currentSettings);
        renderApp();
    }
}

async function saveCharacter(character: Character, artworkFile?: File, sampleFile?: File, recordedSample?: string) {
    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    if (recordedSample) {
        character.voice_sample = recordedSample;
    } else if (sampleFile) {
        character.voice_sample = await readFileAsDataURL(sampleFile);
    }

    if (artworkFile) {
        character.artwork = await readFileAsDataURL(artworkFile);
        character.artworkFilename = artworkFile.name;
    }

    const charIndex = characters.findIndex(c => c.id === character.id);
    if (charIndex > -1) {
        characters[charIndex] = character;
    } else {
        characters.push(character);
    }

    saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
    renderApp();
    closeModal();
}

function duplicateCharacter(characterToDuplicate: Character) {
    const newCharacter: Character = {
        ...characterToDuplicate,
        id: Date.now(),
        name: `${characterToDuplicate.name} (Copy)`
    };
    characters.push(newCharacter);
    saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
    renderApp();
    closeModal();
}

function deleteCharacter(id: number) {
    if (confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
        const indexToDelete = characters.findIndex(char => char.id === id);
        if (indexToDelete > -1) {
            characters.splice(indexToDelete, 1);
        }
        saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
        renderApp();
        closeModal();
    }
}

function deleteProject(id: number) {
    if (confirm('Are you sure you want to delete this project? All characters within this project will be moved to "Unassigned".')) {
        projects = projects.filter(p => p.id !== id);
        characters.forEach(c => {
            if (c.projectId === id) c.projectId = undefined;
        });
        saveToLocalStorage(characters, projects, auditions, currentSettings);
        renderApp();
        closeProjectModal();
    }
}

async function importProject(zipFile: File) {
    try {
        const zip = await new JSZip().loadAsync(zipFile);
        const projectJsonFile = zip.file('project.json');
        if (!projectJsonFile) {
            alert('Invalid project file: project.json not found in the zip.');
            return;
        }

        const projectData: Project = JSON.parse(await projectJsonFile.async('string'));
        const newProject: Project = { ...projectData, id: Date.now() };
        projects.push(newProject);

        const charactersFolder = zip.folder('characters');
        if (charactersFolder) {
            const characterJsonFiles = charactersFolder.filter((relativePath) => relativePath.endsWith('character.json'));

            for (const charJsonFile of characterJsonFiles) {
                const charData: Character = JSON.parse(await charJsonFile.async('string'));
                const newCharacter: Character = { ...charData, id: Date.now(), projectId: newProject.id };

                const charFolderPath = charJsonFile.name.substring(0, charJsonFile.name.lastIndexOf('/') + 1);

                if (newCharacter.artworkFilename) {
                    const artworkZipFile = zip.file(`${charFolderPath}${newCharacter.artworkFilename}`);
                    if (artworkZipFile) {
                        const artworkBase64 = await artworkZipFile.async('base64');
                        newCharacter.artwork = `data:image/png;base64,${artworkBase64}`;
                    }
                }

                const voiceSampleZipFile = zip.file(`${charFolderPath}voice_sample.webm`);
                if (voiceSampleZipFile) {
                    const voiceBase64 = await voiceSampleZipFile.async('base64');
                    newCharacter.voice_sample = `data:audio/webm;base64,${voiceBase64}`;
                }
                
                characters.push(newCharacter);
            }
        }

        saveToLocalStorage(characters, projects, auditions);
        renderApp();
        alert(`Project "${newProject.name}" and its characters imported successfully!`);

    } catch (error) {
        console.error('Error importing project:', error);
        alert('Failed to import project. Please ensure it is a valid project zip file.');
    }
}

// --- Event Listeners & Initial Load ---
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
            await importProject(selectedFile);
        }
    };
    input.click();
});


const { characters: loadedCharacters, projects: loadedProjects, auditions: loadedAuditions, settings: loadedSettings, warmups: loadedWarmups } = loadFromLocalStorage();
characters = loadedCharacters;
projects = loadedProjects;
auditions = loadedAuditions;
warmups = loadedWarmups;
currentSettings = loadedSettings;

initializeCharacterRenderer(openModal, openProjectModal, openDictionaryModal);

initializeCharacterModal(
    modalElement as HTMLElement,
    modalContentElement as HTMLElement,
    characters,
    projects,
    (char, art, samp, rec) => saveCharacter(char, art, samp, rec),
    duplicateCharacter,
    deleteCharacter
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
    (id) => deleteProject(id),
    (updatedProjects) => {
        projects = updatedProjects;
        saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
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
    onCharacterDrop,
    renderApp
);

initializeTheme();
initializeNavigation();
initializeVoiceActorView();
initializeLineReader(characters, projects, currentSettings, openModal);
initializeDungeonMasterView(characters, projects, openModal);
initializeUtilityView(currentSettings);
initializeAuditionView(auditions, characters, (updatedAuditions) => {
    auditions = updatedAuditions;
    saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
});
initializeDictionaryHighlighter();
initializeTeleprompter(projects);
initializeWarmupView(warmups, characters, projects, (updatedWarmups) => {
    warmups = updatedWarmups;
    saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
});
initializeEffectLibrary(characters, projects, currentSettings, (updatedSettings) => {
    Object.assign(currentSettings, updatedSettings);
    saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
});
initializeSettingsView(
    currentSettings,
    characters,
    projects,
    auditions,
    (newSettings) => {
        currentSettings = newSettings;
        saveToLocalStorage(characters, projects, auditions, currentSettings, warmups);
        // Force re-initialize modules that depend on settings if needed, 
        // though lineReader/projectModal get the currentSettings ref via initialization closure
        // Wait, they only get the object reference. If we replace `currentSettings = newSettings`, 
        // the closure in line-reader won't see the new object.
        // We should instead update properties of currentSettings to preserve the reference.
        Object.assign(currentSettings, newSettings);
        saveToLocalStorage(characters, projects, auditions, currentSettings);
    },
    (newChars, newProjs, newAuds, newSets) => {
        characters = newChars;
        projects = newProjs;
        auditions = newAuds;
        Object.assign(currentSettings, newSets);
        saveToLocalStorage(characters, projects, auditions, currentSettings);
        renderApp();
        location.reload(); // Hard reload to reinitialize all states properly
    }
);
renderApp();
