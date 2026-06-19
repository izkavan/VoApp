import { Character, Project, Audition } from './types.js';

const STORAGE_KEY_CHARACTERS = 'vo_app_characters';
const STORAGE_KEY_PROJECTS = 'vo_app_projects';
const STORAGE_KEY_AUDITIONS = 'vo_app_auditions';

export function saveToLocalStorage(characters: Character[], projects: Project[], auditions: Audition[]): void {
    try {
        localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters));
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
        localStorage.setItem(STORAGE_KEY_AUDITIONS, JSON.stringify(auditions));
    } catch (e) {
        console.error("Failed to save to local storage", e);
    }
}

export function loadFromLocalStorage(): { characters: Character[], projects: Project[], auditions: Audition[] } {
    try {
        const charactersJSON = localStorage.getItem(STORAGE_KEY_CHARACTERS);
        const projectsJSON = localStorage.getItem(STORAGE_KEY_PROJECTS);
        const auditionsJSON = localStorage.getItem(STORAGE_KEY_AUDITIONS);

        const characters = charactersJSON ? JSON.parse(charactersJSON) : [];
        const projects = projectsJSON ? JSON.parse(projectsJSON) : [];
        const auditions = auditionsJSON ? JSON.parse(auditionsJSON) : [];

        return { characters, projects, auditions };
    } catch (e) {
        console.error("Failed to load from local storage", e);
        return { characters: [], projects: [], auditions: [] };
    }
}
