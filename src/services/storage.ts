import {
  Character,
  Project,
  Audition,
  ReceivedAudition,
  SystemSettings,
  Warmup,
  UserProfile,
} from "../types.js";
import { saveAppState, saveAudioBlob, saveImageBlob } from "./indexeddb.js";

const STORAGE_KEY_CHARACTERS = "vo_app_characters";
const STORAGE_KEY_PROJECTS = "vo_app_projects";
const STORAGE_KEY_AUDITIONS = "vo_app_auditions";
const STORAGE_KEY_RECEIVED_AUDITIONS = "vo_app_received_auditions";
const STORAGE_KEY_SETTINGS = "vo_app_settings";
const STORAGE_KEY_WARMUPS = "vo_app_warmups";
const STORAGE_KEY_USER_PROFILE = "vo_app_user_profile";

export const defaultSettings: SystemSettings = {
  exportFormat: "webm",
  audioExportPath: "audio",
  scriptExportGrouping: "line",
  recordingGear: "",
  effectGroups: ["Laugh", "Grunt", "Pain", "Breath", "Scream", "Cry"],
  systemFont: "default",
  timerWarningTime: 300,
  timerStopTime: 600,
  featureVisibility: {
    viewVoiceActor: true,
    viewStoryteller: true,
    viewVoiceProduction: true,
    viewUtility: true,
    tabLineReader: true,
    tabTeleprompter: true,
    tabAuditions: true,
    tabEffectLibrary: true,
    tabVpFeedback: true,
    tabVpScript: true,
    tabVpSides: true,
    tabVpAuditions: true,
    tabVpContraster: true,
    tabVpTableRead: true,
    tabDmSession: true,
    tabDmGenerator: true,
    tabDmCharacterNotes: true,
    tabAudioOverlay: true,
    tabWarmups: true,
    tabVoiceMemos: true,
    showRecordTimer: false,
  },
};

export const DEFAULT_WARMUPS: Warmup[] = [
  {
    id: 1,
    title: "Red Leather, Yellow Leather",
    text: "Red leather, yellow leather. Red leather, yellow leather. Red leather, yellow leather.",
    rating: 0,
    tags: ["articulation", "lips"],
    characterIds: [],
  },
  {
    id: 2,
    title: "Lip Trills",
    text: "Perform a continuous lip trill (brrrrr) while gliding your pitch from your lowest comfortable note to your highest, and back down.",
    rating: 0,
    tags: ["breath-support", "warmup"],
    characterIds: [],
  },
  {
    id: 3,
    title: "Unique New York",
    text: "Unique New York, Unique New York. You know you need unique New York.",
    rating: 0,
    tags: ["articulation", "vowels"],
    characterIds: [],
  },
  {
    id: 4,
    title: "The Crisp Crust Crackle",
    text: "Crisp crusts crackle quickly, creating a cacophony of crunchy crumbles caught carefully in cupped hands.",
    rating: 0,
    tags: ["diction", "consonants", "advanced"],
    characterIds: [],
  },
];

function dataURItoBlob(dataURI: string): Blob {
  const parts = dataURI.split(",");
  const byteString = atob(parts[1]);
  const mimeString = parts[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

export async function migrateLegacyStorage(): Promise<boolean> {
  const charactersData = localStorage.getItem(STORAGE_KEY_CHARACTERS);
  const projectsData = localStorage.getItem(STORAGE_KEY_PROJECTS);

  // If no main keys exist, there's nothing to migrate.
  if (!charactersData && !projectsData) {
    return false;
  }

  try {
    console.log("Migrating legacy localStorage to IndexedDB...");

    const characters: Character[] = charactersData
      ? JSON.parse(charactersData)
      : [];
    const projects: Project[] = projectsData ? JSON.parse(projectsData) : [];

    const auditionsData = localStorage.getItem(STORAGE_KEY_AUDITIONS);
    const auditions: Audition[] = auditionsData
      ? JSON.parse(auditionsData)
      : [];

    const receivedAuditionsData = localStorage.getItem(
      STORAGE_KEY_RECEIVED_AUDITIONS,
    );
    const receivedAuditions: ReceivedAudition[] = receivedAuditionsData
      ? JSON.parse(receivedAuditionsData)
      : [];

    const settingsData = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const settings: SystemSettings = settingsData
      ? { ...defaultSettings, ...JSON.parse(settingsData) }
      : defaultSettings;

    const warmupsData = localStorage.getItem(STORAGE_KEY_WARMUPS);
    const warmups: Warmup[] = warmupsData
      ? JSON.parse(warmupsData)
      : DEFAULT_WARMUPS;

    const userProfileData = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
    const userProfile: UserProfile | null = userProfileData
      ? JSON.parse(userProfileData)
      : null;

    // Process Auditions to remove base64
    for (const audition of auditions) {
      if (audition.audioData && audition.audioData.startsWith("data:")) {
        const blob = dataURItoBlob(audition.audioData);
        audition.audioBlobId = await saveAudioBlob(blob);
        delete audition.audioData; // Strip it
      }
      if (audition.files) {
        for (const file of audition.files) {
          if (file.data && file.data.startsWith("data:")) {
            const blob = dataURItoBlob(file.data);
            file.blobId = await saveAudioBlob(blob);
            delete file.data;
          }
        }
      }
    }

    // Process Received Auditions to remove base64
    for (const ra of receivedAuditions) {
      if (ra.audioData && ra.audioData.startsWith("data:")) {
        const blob = dataURItoBlob(ra.audioData);
        ra.audioBlobId = await saveAudioBlob(blob);
        delete ra.audioData;
      }
    }

    // Process Characters to remove base64
    for (const char of characters) {
      if (char.artwork && char.artwork.startsWith("data:")) {
        const blob = dataURItoBlob(char.artwork);
        char.artworkId = await saveImageBlob(blob);
        char.artworkFilename = "migrated_artwork.png";
        delete char.artwork;
      }
    }

    await saveAppState("characters", characters);
    await saveAppState("projects", projects);
    await saveAppState("auditions", auditions);
    await saveAppState("receivedAuditions", receivedAuditions);
    await saveAppState("settings", settings);
    await saveAppState("warmups", warmups);
    await saveAppState("userProfile", userProfile);

    // Clear local storage
    localStorage.removeItem(STORAGE_KEY_CHARACTERS);
    localStorage.removeItem(STORAGE_KEY_PROJECTS);
    localStorage.removeItem(STORAGE_KEY_AUDITIONS);
    localStorage.removeItem(STORAGE_KEY_RECEIVED_AUDITIONS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_WARMUPS);
    localStorage.removeItem(STORAGE_KEY_USER_PROFILE);

    console.log("Migration complete!");
    return true;
  } catch (e) {
    console.error("Failed to migrate legacy storage", e);
    return false;
  }
}
