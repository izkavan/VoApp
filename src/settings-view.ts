import { Character, Project, Audition, SystemSettings, VoiceMemo } from './types.js';
import { getVoiceMemos, saveVoiceMemo, deleteVoiceMemos } from './indexeddb.js';
import JSZip from 'jszip';

export function initializeSettingsView(
    settings: SystemSettings,
    characters: Character[],
    projects: Project[],
    auditions: Audition[],
    saveCallback: (settings: SystemSettings) => void,
    restoreCallback: (characters: Character[], projects: Project[], auditions: Audition[], settings: SystemSettings) => void
) {
    const formatSelect = document.getElementById('settings-export-format') as HTMLSelectElement;
    const pathInput = document.getElementById('settings-export-path') as HTMLInputElement;
    const groupingSelect = document.getElementById('settings-export-grouping') as HTMLSelectElement;
    const gearInput = document.getElementById('settings-recording-gear') as HTMLTextAreaElement;

    const backupBtn = document.getElementById('settings-full-backup-btn') as HTMLButtonElement;
    const restoreFile = document.getElementById('settings-restore-file') as HTMLInputElement;
    const restoreBtn = document.getElementById('settings-restore-btn') as HTMLButtonElement;

    // Load initial values
    if (formatSelect) formatSelect.value = settings.exportFormat;
    if (pathInput) pathInput.value = settings.audioExportPath;
    if (groupingSelect) groupingSelect.value = settings.scriptExportGrouping;
    if (gearInput) gearInput.value = settings.recordingGear;

    // Attach listeners
    const triggerSave = () => {
        const newSettings: SystemSettings = {
            exportFormat: (formatSelect?.value as 'webm' | 'wav') || 'webm',
            audioExportPath: pathInput?.value || 'audio',
            scriptExportGrouping: (groupingSelect?.value as 'character' | 'line') || 'line',
            recordingGear: gearInput?.value || ''
        };
        saveCallback(newSettings);
    };

    formatSelect?.addEventListener('change', triggerSave);
    pathInput?.addEventListener('input', triggerSave);
    groupingSelect?.addEventListener('change', triggerSave);
    gearInput?.addEventListener('input', triggerSave);

    backupBtn?.addEventListener('click', async () => {
        backupBtn.textContent = 'Generating Backup...';
        backupBtn.disabled = true;
        
        try {
            const zip = new JSZip();
            
            // Local storage data
            zip.file('settings.json', JSON.stringify(settings, null, 2));
            zip.file('characters.json', JSON.stringify(characters, null, 2));
            zip.file('projects.json', JSON.stringify(projects, null, 2));
            zip.file('auditions.json', JSON.stringify(auditions, null, 2));

            // IndexedDB data (Voice Memos)
            const memos = await getVoiceMemos();
            const memosMetadata = memos.map(m => {
                const { blob, ...rest } = m; // Exclude blob from json
                return rest;
            });
            zip.file('memos.json', JSON.stringify(memosMetadata, null, 2));

            const memoFolder = zip.folder('memos');
            if (memoFolder) {
                memos.forEach(m => {
                    memoFolder.file(`${m.id}.webm`, m.blob);
                });
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(zipBlob);
            
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `VoApp_Backup_${dateStr}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (e) {
            console.error("Backup failed", e);
            alert("Backup failed. See console for details.");
        } finally {
            backupBtn.textContent = 'Download Full Backup';
            backupBtn.disabled = false;
        }
    });

    restoreBtn?.addEventListener('click', async () => {
        if (!restoreFile || !restoreFile.files || restoreFile.files.length === 0) {
            alert('Please select a backup zip file first.');
            return;
        }

        const confirmed = confirm("WARNING: This will completely overwrite all your existing data, including characters, projects, scripts, and voice memos. Are you sure you want to proceed?");
        if (!confirmed) return;

        restoreBtn.textContent = 'Restoring...';
        restoreBtn.disabled = true;

        try {
            const file = restoreFile.files[0];
            const zip = await JSZip.loadAsync(file);

            const getJson = async (filename: string, defaultVal: any) => {
                const f = zip.file(filename);
                if (!f) return defaultVal;
                const text = await f.async('string');
                return JSON.parse(text);
            };

            const restoredSettings = await getJson('settings.json', settings);
            const restoredCharacters = await getJson('characters.json', []);
            const restoredProjects = await getJson('projects.json', []);
            const restoredAuditions = await getJson('auditions.json', []);
            const memosMetadata = await getJson('memos.json', []);

            // Delete existing voice memos
            const currentMemos = await getVoiceMemos();
            await deleteVoiceMemos(currentMemos.map(m => m.id));

            // Restore voice memos from zip
            for (const meta of memosMetadata) {
                const memoFile = zip.file(`memos/${meta.id}.webm`);
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

            // Restore everything else
            restoreCallback(restoredCharacters, restoredProjects, restoredAuditions, restoredSettings);
            alert("Restore completed successfully!");
            
        } catch (e) {
            console.error("Restore failed", e);
            alert("Restore failed. The zip file may be corrupted or in an invalid format.");
        } finally {
            restoreBtn.textContent = 'Restore Backup';
            restoreBtn.disabled = false;
            restoreFile.value = ''; // clear input
        }
    });
}
