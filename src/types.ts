export interface Project {
    id: number;
    name: string;
    description: string;
    licensing: string;
    startDate?: string;
    endDate?: string;
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

export interface SystemSettings {
    exportFormat: 'webm' | 'wav';
    audioExportPath: string; // e.g., "audio"
    scriptExportGrouping: 'character' | 'line';
    recordingGear: string;
}
