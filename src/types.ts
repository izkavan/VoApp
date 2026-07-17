/**
 * Represents a top-level Voice Acting Project (e.g. a Video Game or Audio Book).
 * Projects contain characters, scripts, and global settings.
 */
export interface Project {
  id: number;
  name: string;
  description: string;
  licensing: string;
  startDate?: string;
  endDate?: string;
}

/**
 * A phonetic dictionary entry associated with a specific Project.
 * Used by voice actors to maintain consistent pronunciation for invented words or names.
 */
export interface DictionaryEntry {
  id: string;
  projectId: number;
  word: string;
  phonetic: string;
  meaning: string;
  audioData?: string;
}

/**
 * Represents a Voice Acting Character.
 * Contains both creative descriptions and technical vocal sliders (pitch, pace, etc.).
 * Can optionally be assigned to a specific Project.
 */
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
  moodboardType?: "custom" | "pinterest";
  pinterestBoardUrl?: string;
  moodboardMedia?: {
    id: string;
    type: "image" | "video_link";
    urlOrId: string;
    filename?: string;
    objectUrl?: string;
  }[];
  voice_sample?: string;
  pitch?: number;
  pace?: number;
  placement?: number;
  timbre?: number;
  characterOddities?: string;
}

export interface AuditionFile {
  name: string;
  data?: string; // Base64 data URL (deprecated, use blobId)
  blobId?: string; // IndexedDB ID
}

export interface CastingDirector {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export type AuditionStatus =
  "Submitted" | "Callback" | "Booked" | "Rejected" | "Ghosted";

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  yearsOfExperience: string;
  preferredJobTypes: string[];
  headshotId?: string; // IndexedDB ID
  demoReelId?: string; // IndexedDB ID
  demoReelFilename?: string; // For downloading
  socialLinks: {
    twitter: string;
    mastodon: string;
    bluesky: string;
    linkedin: string;
    personalSite: string;
    custom: { name: string; url: string }[];
  };
  roleHistory: number[]; // Array of Character IDs
}

export interface Audition {
  id: number;
  projectName: string;
  castingDirector: CastingDirector;
  dueDate: string; // ISO date string
  notes: string;
  status: AuditionStatus;
  linkedCharacterIds: number[];
  files: AuditionFile[];
  audioData?: string; // base64 encoded audio (deprecated, use audioBlobId)
  audioBlobId?: string; // IndexedDB ID
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
  audioData?: string; // Base64 data URL (deprecated, use audioBlobId)
  audioBlobId?: string; // IndexedDB ID
  rating?: number;
  comments?: string;
  actorProfile?: Omit<UserProfile, "roleHistory">;
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
  viewStoryteller: boolean;
  viewVoiceProduction: boolean;
  viewUtility: boolean;
  tabLineReader: boolean;
  tabTeleprompter: boolean;
  tabAuditions: boolean;
  tabEffectLibrary: boolean;
  tabVpFeedback: boolean;
  tabVpScript: boolean;
  tabVpSides: boolean;
  tabVpAuditions: boolean;
  tabVpContraster: boolean;
  tabVpTableRead: boolean;
  tabDmSession: boolean;
  tabDmGenerator: boolean;
  tabDmCharacterNotes: boolean;
  tabAudioOverlay: boolean;
  tabWarmups: boolean;
  tabVoiceMemos: boolean;
  showRecordTimer: boolean;
}

export interface SystemSettings {
  exportFormat: "webm" | "wav";
  audioExportPath: string; // e.g., "audio"
  scriptExportGrouping: "character" | "line";
  recordingGear: string;
  effectGroups?: string[];
  featureVisibility?: FeatureVisibility;
  actorProfile?: ActorProfile;
  systemFont?: string;
  timerWarningTime?: number;
  timerStopTime?: number;
}

export type JournalEntryType = "text" | "social" | "event";

export interface JournalEntryBase {
  id: string; // unique UUID for entry
  characterId: number; // associated character
  title: string;
  type: JournalEntryType;
  dateCreated: number;
  dateUpdated: number;
}

export interface TextJournalEntry extends JournalEntryBase {
  type: "text";
  content: string; // The massive text content
}

export interface RatingHistoryEvent {
  oldRating: number;
  newRating: number;
  reasoning: string;
  date: number;
}

export interface SocialJournalEntry extends JournalEntryBase {
  type: "social";
  npcName: string;
  occupation: string;
  howTheyMet: string;
  currentOpinion: string;
  eventsInfluencing: string;
  rating: number; // 1 to 8
  ratingHistory: RatingHistoryEvent[];
}

export interface EventJournalEntry extends JournalEntryBase {
  type: "event";
  description: string;
  timeTookPlace: string;
  openNotes: string;
}

export type JournalEntry =
  TextJournalEntry | SocialJournalEntry | EventJournalEntry;
