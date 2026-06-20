export interface Project {
    id: number;
    name: string;
    description: string;
    licensing: string;
    startDate?: string;
    endDate?: string;
}

export interface DictionaryEntry {
    id: string;
    projectId: number;
    word: string;
    phonetic: string;
    meaning: string;
    audioData?: string;
}

export interface Character {
    id: number;
    name: string;
    description: string;
    voice_description: string;
    tags: string[];
    projectId?: number;
    artwork?: string;
    artworkFilename?: string;
    voice_sample?: string;
    pitch?: number;
    pace?: number;
    placement?: number;
    timbre?: number;
}

export interface AuditionFile {
    name: string;
    data: string; // Base64 data URL
}

export interface CastingDirector {
    name: string;
    email: string;
    phone: string;
    company: string;
}

export type AuditionStatus = 'Submitted' | 'Callback' | 'Booked' | 'Rejected' | 'Ghosted';

export interface Audition {
    id: number;
    projectName: string;
    castingDirector: CastingDirector;
    dueDate: string; // ISO date string
    notes: string;
    status: AuditionStatus;
    linkedCharacterIds: number[];
    files: AuditionFile[];
}

export interface VoiceMemo {
    id: number;
    blob: Blob;
    title: string;
    tags: string[];
    projectId?: number | null;
    isHighImportance: boolean;
    date: number; // timestamp
}

export interface Warmup {
    id: number;
    title: string;
    text: string;
    rating: number; // 0 to 5 stars
    tags: string[];
    characterIds: number[];
}

export interface Effect {
    id: number;
    blob: Blob;
    title: string;
    group: string;
    tags: string[];
    characterIds: number[];
    projectIds: number[];
    date: number; // timestamp
}

export interface FeatureVisibility {
    viewVoiceActor: boolean;
    viewDungeonMaster: boolean;
    viewUtility: boolean;
    tabLineReader: boolean;
    tabTeleprompter: boolean;
    tabAuditions: boolean;
    tabEffectLibrary: boolean;
    tabWarmups: boolean;
    tabVoiceMemos: boolean;
}

export interface SystemSettings {
    exportFormat: 'webm' | 'wav';
    audioExportPath: string; // e.g., "audio"
    scriptExportGrouping: 'character' | 'line';
    recordingGear: string;
    effectGroups?: string[];
    featureVisibility?: FeatureVisibility;
}
