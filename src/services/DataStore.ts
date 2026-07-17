import {
  Character,
  Project,
  Audition,
  ReceivedAudition,
  SystemSettings,
  Warmup,
  UserProfile,
} from "../types.js";
import {
  migrateLegacyStorage,
  defaultSettings,
  DEFAULT_WARMUPS,
} from "./storage.js";
import { getAppState, saveAppState } from "./indexeddb.js";
import { EventBus } from "./EventBus.js";

/**
 * Central State Management Singleton.
 * Manages the in-memory state for Characters, Projects, Settings, etc.,
 * and handles dispatching granular EventBus updates when data changes,
 * preventing expensive full-app re-renders.
 */
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
  async initialize() {
    await migrateLegacyStorage();

    this.characters = (await getAppState("characters")) || [];
    this.projects = (await getAppState("projects")) || [];
    this.auditions = (await getAppState("auditions")) || [];
    this.receivedAuditions = (await getAppState("receivedAuditions")) || [];
    this.settings = (await getAppState("settings")) || defaultSettings;
    this.warmups = (await getAppState("warmups")) || DEFAULT_WARMUPS;
    this.userProfile = (await getAppState("userProfile")) || null;

    EventBus.emit("charactersUpdated", this.characters);
    EventBus.emit("projectsUpdated", this.projects);
    EventBus.emit("auditionsUpdated", this.auditions);
    EventBus.emit("receivedAuditionsUpdated", this.receivedAuditions);
    EventBus.emit("settingsUpdated", this.settings);
    EventBus.emit("warmupsUpdated", this.warmups);
    EventBus.emit("userProfileUpdated", this.userProfile);

    EventBus.emit("storeInitialized");
  }

  private saveCharacters() {
    saveAppState("characters", this.characters).catch((e) => {
      console.error(e);
      EventBus.emit("notify", {
        message: "Failed to save Characters. Storage might be full.",
        type: "error",
      });
    });
    EventBus.emit("charactersUpdated", this.characters);
  }
  private saveProjects() {
    saveAppState("projects", this.projects).catch((e) => {
      console.error(e);
      EventBus.emit("notify", {
        message: "Failed to save Projects. Storage might be full.",
        type: "error",
      });
    });
    EventBus.emit("projectsUpdated", this.projects);
  }
  private saveAuditions() {
    saveAppState("auditions", this.auditions).catch((e) => {
      console.error(e);
      EventBus.emit("notify", {
        message: "Failed to save Auditions. Storage might be full.",
        type: "error",
      });
    });
    EventBus.emit("auditionsUpdated", this.auditions);
  }
  private saveReceivedAuditions() {
    saveAppState("receivedAuditions", this.receivedAuditions).catch((e) => {
      console.error(e);
      EventBus.emit("notify", {
        message: "Failed to save Received Auditions. Storage might be full.",
        type: "error",
      });
    });
    EventBus.emit("receivedAuditionsUpdated", this.receivedAuditions);
  }
  private saveSettings() {
    saveAppState("settings", this.settings).catch((e) => {
      console.error(e);
      EventBus.emit("notify", {
        message: "Failed to save Settings. Storage might be full.",
        type: "error",
      });
    });
    EventBus.emit("settingsUpdated", this.settings);
  }
  private saveWarmups() {
    saveAppState("warmups", this.warmups).catch((e) => {
      console.error(e);
      EventBus.emit("notify", {
        message: "Failed to save Warmups. Storage might be full.",
        type: "error",
      });
    });
    EventBus.emit("warmupsUpdated", this.warmups);
  }
  private saveUserProfile() {
    saveAppState("userProfile", this.userProfile).catch((e) => {
      console.error(e);
      EventBus.emit("notify", {
        message: "Failed to save User Profile. Storage might be full.",
        type: "error",
      });
    });
    EventBus.emit("userProfileUpdated", this.userProfile);
  }

  // --- Characters ---
  getCharacters() {
    return this.characters;
  }
  addCharacter(char: Character) {
    this.characters.push(char);
    this.saveCharacters();
  }
  getWarmups() {
    return this.warmups;
  }
  updateWarmup(id: number, warmup: Partial<Warmup>) {
    const index = this.warmups.findIndex((w) => w.id === id);
    if (index > -1) {
      this.warmups[index] = { ...this.warmups[index], ...warmup };
      this.saveWarmups();
    }
  }

  // --- User Profile ---
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }
  setUserProfile(profile: UserProfile) {
    this.userProfile = profile;
    this.saveUserProfile();
  }

  updateCharacter(char: Character) {
    const index = this.characters.findIndex((c) => c.id === char.id);
    if (index > -1) {
      this.characters[index] = char;
      this.saveCharacters();
    }
  }
  deleteCharacter(id: number) {
    this.characters = this.characters.filter((c) => c.id !== id);
    this.saveCharacters();
  }

  // --- Projects ---
  getProjects() {
    return this.projects;
  }
  addProject(project: Project) {
    this.projects.push(project);
    this.saveProjects();
  }
  updateProject(project: Project) {
    const index = this.projects.findIndex((p) => p.id === project.id);
    if (index > -1) {
      this.projects[index] = project;
      this.saveProjects();
    }
  }
  deleteProject(id: number) {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.saveProjects();
  }

  // --- Settings ---
  getSettings() {
    return this.settings;
  }
  updateSettings(settings: SystemSettings) {
    this.settings = settings;
    this.saveSettings();
  }

  // --- Auditions ---
  getAuditions() {
    return this.auditions;
  }
  updateAuditions(auditions: Audition[]) {
    this.auditions = auditions;
    this.saveAuditions();
  }

  // --- Received Auditions ---
  getReceivedAuditions() {
    return this.receivedAuditions;
  }
  updateReceivedAuditions(received: ReceivedAudition[]) {
    this.receivedAuditions = received;
    this.saveReceivedAuditions();
  }

  // --- Restore ---
  restoreAll(
    characters: Character[],
    projects: Project[],
    auditions: Audition[],
    settings: SystemSettings,
  ) {
    this.characters = characters;
    this.projects = projects;
    this.auditions = auditions;
    this.settings = settings;
    this.saveCharacters();
    this.saveProjects();
    this.saveAuditions();
    this.saveSettings();
  }
}

export const DataStore = new AppDataStore();
