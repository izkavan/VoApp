import { Character, Project, Audition, SystemSettings } from './types.js';

const STORAGE_KEY_CHARACTERS = 'vo_app_characters';
const STORAGE_KEY_PROJECTS = 'vo_app_projects';
const STORAGE_KEY_AUDITIONS = 'vo_app_auditions';
const STORAGE_KEY_SETTINGS = 'vo_app_settings';

export const defaultSettings: SystemSettings = {
    exportFormat: 'webm',
    audioExportPath: 'audio',
    scriptExportGrouping: 'line',
    recordingGear: ''
};

export function saveToLocalStorage(characters: Character[], projects: Project[], auditions: Audition[], settings: SystemSettings = defaultSettings): void {
    try {
        localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters));
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
        localStorage.setItem(STORAGE_KEY_AUDITIONS, JSON.stringify(auditions));
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save to local storage", e);
    }
}

export function loadFromLocalStorage(): { characters: Character[], projects: Project[], auditions: Audition[], settings: SystemSettings } {
    try {
        const charactersJSON = localStorage.getItem(STORAGE_KEY_CHARACTERS);
        const projectsJSON = localStorage.getItem(STORAGE_KEY_PROJECTS);
        const auditionsJSON = localStorage.getItem(STORAGE_KEY_AUDITIONS);
        const settingsJSON = localStorage.getItem(STORAGE_KEY_SETTINGS);

        const characters = charactersJSON ? JSON.parse(charactersJSON) : [];
        const projects = projectsJSON ? JSON.parse(projectsJSON) : [];
        const auditions = auditionsJSON ? JSON.parse(auditionsJSON) : [];
        const settings = settingsJSON ? { ...defaultSettings, ...JSON.parse(settingsJSON) } : defaultSettings;

        return { characters, projects, auditions, settings };
    } catch (e) {
        console.error("Failed to load from local storage", e);
        return { characters: [], projects: [], auditions: [], settings: defaultSettings };
    }
}
