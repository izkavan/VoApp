import { Character, Project, Audition, SystemSettings, VoiceMemo } from './types.js';
import { getVoiceMemos, saveVoiceMemo, deleteVoiceMemos } from './indexeddb.js';
import { convertWebMToWav } from './audio-utils.js';
import JSZip from 'jszip';
import { updateRecordTimerVisibility } from './record-timer.js';

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
    const fontSelect = document.getElementById('settings-system-font') as HTMLSelectElement;
    const fontWarning = document.getElementById('opendyslexic-warning') as HTMLElement;

    // Feature Visibility Toggles
    const visViewVoiceActor = document.getElementById('visibility-view-voice-actor') as HTMLInputElement;
    const visViewDungeonMaster = document.getElementById('visibility-view-dungeon-master') as HTMLInputElement;
    const visViewUtility = document.getElementById('visibility-view-utility') as HTMLInputElement;
    const visShowRecordTimer = document.getElementById('visibility-show-record-timer') as HTMLInputElement;
    const visTabLineReader = document.getElementById('visibility-tab-line-reader') as HTMLInputElement;
    const visTabTeleprompter = document.getElementById('visibility-tab-teleprompter') as HTMLInputElement;
    const visTabAuditions = document.getElementById('visibility-tab-auditions') as HTMLInputElement;
    const visTabEffectLibrary = document.getElementById('visibility-tab-effect-library') as HTMLInputElement;
    const visTabWarmups = document.getElementById('visibility-tab-warmups') as HTMLInputElement;
    const visTabVoiceMemos = document.getElementById('visibility-tab-voice-memos') as HTMLInputElement;

    const storageUsageEl = document.getElementById('settings-storage-usage');
    const clearCacheBtn = document.getElementById('settings-clear-cache-btn');

    const backupBtn = document.getElementById('settings-full-backup-btn') as HTMLButtonElement;
    const restoreFile = document.getElementById('settings-restore-file') as HTMLInputElement;
    const restoreBtn = document.getElementById('settings-restore-btn') as HTMLButtonElement;

    // Load initial values
    if (formatSelect) formatSelect.value = settings.exportFormat;
    if (pathInput) pathInput.value = settings.audioExportPath;
    if (groupingSelect) groupingSelect.value = settings.scriptExportGrouping;
    if (gearInput) gearInput.value = settings.recordingGear;
    if (fontSelect) fontSelect.value = settings.systemFont || 'default';
    
    const checkFontWarning = () => {
        if (fontSelect && fontWarning) {
            if (fontSelect.value.includes('OpenDyslexic')) {
                const isInstalled = isFontInstalled('OpenDyslexic');
                fontWarning.style.display = isInstalled ? 'none' : 'block';
            } else {
                fontWarning.style.display = 'none';
            }
        }
    };
    checkFontWarning();

    if (settings.featureVisibility) {
        if (visViewVoiceActor) visViewVoiceActor.checked = settings.featureVisibility.viewVoiceActor;
        if (visViewDungeonMaster) visViewDungeonMaster.checked = settings.featureVisibility.viewDungeonMaster;
        if (visViewUtility) visViewUtility.checked = settings.featureVisibility.viewUtility;
        if (visShowRecordTimer) visShowRecordTimer.checked = settings.featureVisibility.showRecordTimer || false;
        if (visTabLineReader) visTabLineReader.checked = settings.featureVisibility.tabLineReader;
        if (visTabTeleprompter) visTabTeleprompter.checked = settings.featureVisibility.tabTeleprompter;
        if (visTabAuditions) visTabAuditions.checked = settings.featureVisibility.tabAuditions;
        if (visTabEffectLibrary) visTabEffectLibrary.checked = settings.featureVisibility.tabEffectLibrary;
        if (visTabWarmups) visTabWarmups.checked = settings.featureVisibility.tabWarmups;
        if (visTabVoiceMemos) visTabVoiceMemos.checked = settings.featureVisibility.tabVoiceMemos;
    }

    updateStorageUsageDisplay();

    clearCacheBtn?.addEventListener('click', () => {
        if (confirm("WARNING: This is a complete system reset! All local storage and audio database data will be completely erased. Are you sure you want to proceed?")) {
            localStorage.clear();
            indexedDB.deleteDatabase('VoAppDatabase');
            alert("Cache cleared. The application will now reload.");
            window.location.reload();
        }
    });

    // Attach listeners
    const triggerSave = () => {
        const newSettings: SystemSettings = {
            ...settings, // preserve effectGroups, etc.
            exportFormat: (formatSelect?.value as 'webm' | 'wav') || 'webm',
            audioExportPath: pathInput?.value || 'audio',
            scriptExportGrouping: (groupingSelect?.value as 'character' | 'line') || 'line',
            recordingGear: gearInput?.value || '',
            featureVisibility: {
                viewVoiceActor: visViewVoiceActor?.checked ?? true,
                viewDungeonMaster: visViewDungeonMaster?.checked ?? true,
                viewUtility: visViewUtility?.checked ?? true,
                showRecordTimer: visShowRecordTimer?.checked ?? false,
                tabLineReader: visTabLineReader?.checked ?? true,
                tabTeleprompter: visTabTeleprompter?.checked ?? true,
                tabAuditions: visTabAuditions?.checked ?? true,
                tabEffectLibrary: visTabEffectLibrary?.checked ?? true,
                tabWarmups: visTabWarmups?.checked ?? true,
                tabVoiceMemos: visTabVoiceMemos?.checked ?? true
            },
            systemFont: fontSelect?.value || 'default'
        };
        
        if (newSettings.systemFont && newSettings.systemFont !== 'default') {
            document.documentElement.style.setProperty('--system-font', newSettings.systemFont);
        } else {
            document.documentElement.style.setProperty('--system-font', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif");
        }
        
        checkFontWarning();
        updateRecordTimerVisibility(newSettings);
        saveCallback(newSettings);
    };

    formatSelect?.addEventListener('change', triggerSave);
    pathInput?.addEventListener('input', triggerSave);
    groupingSelect?.addEventListener('change', triggerSave);
    gearInput?.addEventListener('input', triggerSave);
    fontSelect?.addEventListener('change', triggerSave);
    
    visViewVoiceActor?.addEventListener('change', triggerSave);
    visViewDungeonMaster?.addEventListener('change', triggerSave);
    visViewUtility?.addEventListener('change', triggerSave);
    visShowRecordTimer?.addEventListener('change', triggerSave);
    visTabLineReader?.addEventListener('change', triggerSave);
    visTabTeleprompter?.addEventListener('change', triggerSave);
    visTabAuditions?.addEventListener('change', triggerSave);
    visTabEffectLibrary?.addEventListener('change', triggerSave);
    visTabWarmups?.addEventListener('change', triggerSave);
    visTabVoiceMemos?.addEventListener('change', triggerSave);

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
                for (const m of memos) {
                    if (settings.exportFormat === 'wav') {
                        const wavBlob = await convertWebMToWav(m.blob);
                        memoFolder.file(`${m.id}.wav`, wavBlob);
                    } else {
                        memoFolder.file(`${m.id}.webm`, m.blob);
                    }
                }
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

export function updateStorageUsageDisplay() {
    const storageUsageEl = document.getElementById('settings-storage-usage');
    if (storageUsageEl) {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                if (estimate.usage !== undefined) {
                    const bytes = estimate.usage;
                    let formatted = '';
                    if (bytes < 1024) formatted = bytes + ' B';
                    else if (bytes < 1048576) formatted = (bytes / 1024).toFixed(2) + ' KB';
                    else if (bytes < 1073741824) formatted = (bytes / 1048576).toFixed(2) + ' MB';
                    else formatted = (bytes / 1073741824).toFixed(2) + ' GB';
                    storageUsageEl.textContent = formatted;
                } else {
                    storageUsageEl.textContent = "Unknown";
                }
            }).catch(() => {
                storageUsageEl.textContent = "Error calculating";
            });
        } else {
            storageUsageEl.textContent = "Not supported in this browser";
        }
    }
}

function isFontInstalled(fontFamily: string): boolean {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return true; // fallback
    
    const text = "abcdefghijklmnopqrstuvwxyz0123456789";
    context.font = "72px monospace";
    const baselineWidth = context.measureText(text).width;
    
    context.font = `72px "${fontFamily}", monospace`;
    const newWidth = context.measureText(text).width;
    
    return baselineWidth !== newWidth;
}
