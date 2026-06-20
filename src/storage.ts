import { Character, Project, Audition, SystemSettings, Warmup } from './types.js';

const STORAGE_KEY_CHARACTERS = 'vo_app_characters';
const STORAGE_KEY_PROJECTS = 'vo_app_projects';
const STORAGE_KEY_AUDITIONS = 'vo_app_auditions';
const STORAGE_KEY_SETTINGS = 'vo_app_settings';
const STORAGE_KEY_WARMUPS = 'vo_app_warmups';

const DEFAULT_WARMUPS: Warmup[] = [
    { id: 1, title: 'Red Leather, Yellow Leather', text: 'Red leather, yellow leather. Red leather, yellow leather. Red leather, yellow leather.', rating: 0, tags: ['articulation', 'lips'], characterIds: [] },
    { id: 2, title: 'Lip Trills', text: 'Perform a continuous lip trill (brrrrr) while gliding your pitch from your lowest comfortable note to your highest, and back down.', rating: 0, tags: ['breath-support', 'warmup'], characterIds: [] },
    { id: 3, title: 'Unique New York', text: 'Unique New York, Unique New York. You know you need unique New York.', rating: 0, tags: ['articulation', 'vowels'], characterIds: [] },
    { id: 4, title: 'The Crisp Crust Crackle', text: 'Crisp crusts crackle quickly, creating a cacophony of crunchy crumbles caught carefully in cupped hands.', rating: 0, tags: ['diction', 'consonants', 'advanced'], characterIds: [] }
];

export const defaultSettings: SystemSettings = {
    exportFormat: 'webm',
    audioExportPath: 'audio',
    scriptExportGrouping: 'line',
    recordingGear: '',
    effectGroups: ['Laugh', 'Grunt', 'Pain']
};

export function saveToLocalStorage(characters: Character[], projects: Project[], auditions: Audition[], settings: SystemSettings = defaultSettings, warmups?: Warmup[]): void {
    try {
        localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters));
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
        localStorage.setItem(STORAGE_KEY_AUDITIONS, JSON.stringify(auditions));
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        if (warmups) {
            localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(warmups));
        }
    } catch (e) {
        console.error("Failed to save to local storage", e);
    }
}

export function loadFromLocalStorage(): { characters: Character[], projects: Project[], auditions: Audition[], settings: SystemSettings, warmups: Warmup[] } {
    try {
        const charactersJSON = localStorage.getItem(STORAGE_KEY_CHARACTERS);
        const projectsJSON = localStorage.getItem(STORAGE_KEY_PROJECTS);
        const auditionsJSON = localStorage.getItem(STORAGE_KEY_AUDITIONS);
        const settingsJSON = localStorage.getItem(STORAGE_KEY_SETTINGS);
        const warmupsJSON = localStorage.getItem(STORAGE_KEY_WARMUPS);

        const characters = charactersJSON ? JSON.parse(charactersJSON) : [];
        const projects = projectsJSON ? JSON.parse(projectsJSON) : [];
        const auditions = auditionsJSON ? JSON.parse(auditionsJSON) : [];
        const settings = settingsJSON ? { ...defaultSettings, ...JSON.parse(settingsJSON) } : defaultSettings;
        
        let warmups: Warmup[] = [];
        if (warmupsJSON) {
            warmups = JSON.parse(warmupsJSON);
        } else {
            // First time loading, populate with defaults
            warmups = [...DEFAULT_WARMUPS];
            localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(warmups));
        }

        return { characters, projects, auditions, settings, warmups };
    } catch (e) {
        console.error("Failed to load from local storage", e);
        return { characters: [], projects: [], auditions: [], settings: defaultSettings, warmups: [...DEFAULT_WARMUPS] };
    }
}
