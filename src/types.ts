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
    voice_sample?: string; // Store as base64 Data URL
    tags?: string[];
    artwork?: string; // Store as base64 Data URL
    artworkFilename?: string;
    projectId?: number;
}
