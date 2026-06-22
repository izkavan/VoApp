import { SystemSettings, Character, Project, Audition, VoiceMemo } from '../types.js';
import { getVoiceMemos, saveVoiceMemo, deleteVoiceMemos } from './indexeddb.js';
import { convertWebMToWav } from '../utils/audio-utils.js';
import { ZipService } from './ZipService.js';

export class AppBackupService {
    /**
     * Generate a full backup ZIP containing local storage metadata and indexedDB audio files.
     */
    async generateFullBackup(
        settings: SystemSettings,
        characters: Character[],
        projects: Project[],
        auditions: Audition[]
    ): Promise<void> {
        const zip = await ZipService.createZip();
        
        // Add JSON metadata
        zip.file('settings.json', JSON.stringify(settings, null, 2));
        zip.file('characters.json', JSON.stringify(characters, null, 2));
        zip.file('projects.json', JSON.stringify(projects, null, 2));
        zip.file('auditions.json', JSON.stringify(auditions, null, 2));

        // Add IndexedDB Voice Memos
        const memos = await getVoiceMemos();
        const memosMetadata = memos.map(m => {
            const { blob, ...rest } = m;
            return rest;
        });
        zip.file('memos.json', JSON.stringify(memosMetadata, null, 2));

        const memoFolder = zip.folder('memos');
        if (memoFolder) {
            for (const m of memos) {
                if (settings.exportFormat === 'wav') {
                    const wavBlob = await convertWebMToWav(m.blob);
                    memoFolder.file(`${m.id}.wav`, wavBlob);
                } else {
                    memoFolder.file(`${m.id}.webm`, m.blob);
                }
            }
        }

        const dateStr = new Date().toISOString().split('T')[0];
        await ZipService.downloadZip(zip, `VoApp_Backup_${dateStr}.zip`);
    }

    /**
     * Restore the database from a backup ZIP file.
     */
    async restoreFullBackup(
        file: File,
        currentSettings: SystemSettings,
        restoreCallback: (characters: Character[], projects: Project[], auditions: Audition[], settings: SystemSettings) => void
    ): Promise<void> {
        const zip = await ZipService.loadZip(file);

        const restoredSettings = await ZipService.readJsonFile<SystemSettings>(zip, 'settings.json', currentSettings);
        const restoredCharacters = await ZipService.readJsonFile<Character[]>(zip, 'characters.json', []);
        const restoredProjects = await ZipService.readJsonFile<Project[]>(zip, 'projects.json', []);
        const restoredAuditions = await ZipService.readJsonFile<Audition[]>(zip, 'auditions.json', []);
        const memosMetadata = await ZipService.readJsonFile<any[]>(zip, 'memos.json', []);

        // Delete existing voice memos
        const currentMemos = await getVoiceMemos();
        await deleteVoiceMemos(currentMemos.map(m => m.id));

        // Restore voice memos from zip
        for (const meta of memosMetadata) {
            const memoFile = zip.file(`memos/${meta.id}.webm`) || zip.file(`memos/${meta.id}.wav`);
            if (memoFile) {
                const blob = await memoFile.async('blob');
                const newMemo: Omit<VoiceMemo, 'id'> = {
                    blob,
                    title: meta.title,
                    tags: meta.tags,
                    projectId: meta.projectId,
                    isHighImportance: meta.isHighImportance,
                    date: meta.date
                };
                await saveVoiceMemo(newMemo);
            }
        }

        restoreCallback(restoredCharacters, restoredProjects, restoredAuditions, restoredSettings);
    }
}

export const BackupService = new AppBackupService();
