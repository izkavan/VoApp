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
    artwork?: string; // Memory object URL or legacy base64
    artworkId?: string; // IndexedDB ID
    artworkFilename?: string;
    moodboardMedia?: {
        id: string;
        type: 'image' | 'video_link';
        urlOrId: string;
        filename?: string;
        objectUrl?: string;
    }[];
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
    audioData?: string; // base64 encoded audio
    audioFileName?: string;
    actorRate?: string;
    actorAvailability?: string;
}

export interface ReceivedAudition {
    id: number;
    actorFirstName: string;
    actorLastName: string;
    actorEmail: string;
    actorRate: string;
    actorPhone: string;
    actorAddress: string;
    actorAvailability: string;
    character: string;
    project: string;
    dateSubmitted: string; // ISO date string
    fileName: string;
    audioData: string; // Base64 data URL
    rating?: number;
    comments?: string;
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

export interface ActorProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
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
    actorProfile?: ActorProfile;
}
