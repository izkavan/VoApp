import { Character, Project, Audition, ReceivedAudition, SystemSettings, Warmup, UserProfile } from '../types.js';
import { loadFromLocalStorage, saveToLocalStorage, defaultSettings } from './storage.js';
import { EventBus } from './EventBus.js';

class AppDataStore {
    private characters: Character[] = [];
    private projects: Project[] = [];
    private auditions: Audition[] = [];
    private receivedAuditions: ReceivedAudition[] = [];
    private settings: SystemSettings = defaultSettings;
    private warmups: Warmup[] = [];
    private userProfile: UserProfile | null = null;

    /**
     * Load initial state from storage and broadcast it to the application.
     */
    initialize() {
        const data = loadFromLocalStorage();
        this.characters = data.characters;
        this.projects = data.projects;
        this.auditions = data.auditions;
        this.receivedAuditions = data.receivedAuditions;
        this.settings = data.settings;
        this.warmups = data.warmups;
        this.userProfile = data.userProfile;
        
        EventBus.emit('storeInitialized', this.getState());
    }

    /**
     * Internal generic save method that triggers persistence and broadcasts updates.
     */
    private save() {
        saveToLocalStorage(
            this.characters,
            this.projects,
            this.auditions,
            this.receivedAuditions,
            this.settings,
            this.warmups,
            this.userProfile
        );
        EventBus.emit('storeUpdated', this.getState());
    }

    /**
     * Get a shallow copy of the entire application state.
     */
    getState() {
        return {
            characters: [...this.characters],
            projects: [...this.projects],
            auditions: [...this.auditions],
            receivedAuditions: [...this.receivedAuditions],
            settings: { ...this.settings },
            warmups: [...this.warmups],
            userProfile: this.userProfile ? { ...this.userProfile } : null
        };
    }

    // --- Characters ---
    getCharacters() { return this.characters; }
    addCharacter(char: Character) {
        this.characters.push(char);
        this.save();
    }
    updateWarmup(id: number, warmup: Partial<Warmup>) {
        const index = this.warmups.findIndex(w => w.id === id);
        if (index > -1) {
            this.warmups[index] = { ...this.warmups[index], ...warmup };
            this.save();
        }
    }

    // --- User Profile ---
    getUserProfile(): UserProfile | null { return this.userProfile; }
    setUserProfile(profile: UserProfile) {
        this.userProfile = profile;
        this.save();
    }

    updateCharacter(char: Character) {
        const index = this.characters.findIndex(c => c.id === char.id);
        if (index > -1) {
            this.characters[index] = char;
            this.save();
        }
    }
    deleteCharacter(id: number) {
        this.characters = this.characters.filter(c => c.id !== id);
        this.save();
    }

    // --- Projects ---
    getProjects() { return this.projects; }
    addProject(project: Project) {
        this.projects.push(project);
        this.save();
    }
    updateProject(project: Project) {
        const index = this.projects.findIndex(p => p.id === project.id);
        if (index > -1) {
            this.projects[index] = project;
            this.save();
        }
    }
    deleteProject(id: number) {
        this.projects = this.projects.filter(p => p.id !== id);
        this.save();
    }

    // --- Settings ---
    getSettings() { return this.settings; }
    updateSettings(settings: SystemSettings) {
        this.settings = settings;
        this.save();
    }
    
    // --- Auditions ---
    getAuditions() { return this.auditions; }
    updateAuditions(auditions: Audition[]) {
        this.auditions = auditions;
        this.save();
    }
    
    // --- Restore ---
    restoreAll(characters: Character[], projects: Project[], auditions: Audition[], settings: SystemSettings) {
        this.characters = characters;
        this.projects = projects;
        this.auditions = auditions;
        this.settings = settings;
        this.save();
    }
}

export const DataStore = new AppDataStore();
