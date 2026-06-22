import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeSettingsView, updateStorageUsageDisplay } from '../../src/views/settings-view.js';
import * as indexeddb from '../../src/services/indexeddb.js';
import { SystemSettings, Character, Project, Audition } from '../../src/types.js';

vi.mock('jszip', () => {
    const mockFolder = { folder: vi.fn().mockReturnThis(), file: vi.fn(), async: vi.fn().mockResolvedValue('[]') };
    const JSZipMock = vi.fn().mockImplementation(function() {
        return {
            folder: vi.fn().mockReturnValue(mockFolder),
            file: vi.fn().mockReturnValue(mockFolder),
            generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }))
        };
    });
    (JSZipMock as any).loadAsync = vi.fn().mockResolvedValue({
        file: vi.fn().mockReturnValue(mockFolder),
        folder: vi.fn().mockReturnValue(mockFolder)
    });
    return { default: JSZipMock };
});

describe('settings-view', () => {
    let mockSaveSettings: any;
    let mockRestoreCallback: any;

    beforeEach(() => {
        document.body.innerHTML = `
            <select id="settings-export-format">
                <option value="webm">webm</option>
                <option value="wav">wav</option>
            </select>
            <input id="settings-export-path" />
            <select id="settings-export-grouping">
                <option value="line">line</option>
                <option value="character">character</option>
            </select>
            <textarea id="settings-recording-gear"></textarea>
            <select id="settings-system-font">
                <option value="default">default</option>
                <option value="OpenDyslexic">OpenDyslexic</option>
            </select>
            <div id="opendyslexic-warning" style="display: none;"></div>

            <input type="checkbox" id="visibility-view-voice-actor" />
            <input type="checkbox" id="visibility-view-dungeon-master" />
            <input type="checkbox" id="visibility-view-utility" />
            <input type="checkbox" id="visibility-show-record-timer" />
            <input type="checkbox" id="visibility-tab-line-reader" />
            <input type="checkbox" id="visibility-tab-teleprompter" />
            <input type="checkbox" id="visibility-tab-auditions" />
            <input type="checkbox" id="visibility-tab-effect-library" />
            <input type="checkbox" id="visibility-tab-warmups" />
            <input type="checkbox" id="visibility-tab-voice-memos" />

            <span id="settings-storage-usage"></span>
            <button id="settings-clear-cache-btn"></button>

            <button id="settings-full-backup-btn"></button>
            <input type="file" id="settings-restore-file" />
            <button id="settings-restore-btn"></button>
        `;

        mockSaveSettings = vi.fn();
        mockRestoreCallback = vi.fn();

        vi.spyOn(indexeddb, 'getVoiceMemos').mockResolvedValue([]);
        vi.spyOn(indexeddb, 'saveVoiceMemo').mockResolvedValue(1);
        vi.spyOn(indexeddb, 'deleteVoiceMemos').mockResolvedValue();

        vi.stubGlobal('URL', {
            createObjectURL: vi.fn().mockReturnValue('blob:url'),
            revokeObjectURL: vi.fn()
        });

        vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((k) => store[k] || null),
            setItem: vi.fn((k, v) => store[k] = v),
            removeItem: vi.fn((k) => delete store[k]),
            clear: vi.fn(() => {
                for (const k in store) delete store[k];
            })
        });
        
        vi.stubGlobal('indexedDB', {
            deleteDatabase: vi.fn()
        });

        Object.defineProperty(window, 'location', {
            value: { reload: vi.fn() },
            writable: true
        });

        vi.stubGlobal('navigator', {
            storage: {
                estimate: vi.fn().mockResolvedValue({ usage: 1048576 * 5 }) // 5 MB
            }
        });
    });

    it('initializes and binds current settings', () => {
        const settings: SystemSettings = {
            exportFormat: 'wav',
            audioExportPath: 'my_audio',
            scriptExportGrouping: 'character',
            recordingGear: 'Mic1',
            systemFont: 'default',
            featureVisibility: {
                viewVoiceActor: true,
                viewDungeonMaster: false,
                viewUtility: true,
                showRecordTimer: true,
                tabLineReader: true,
                tabTeleprompter: false,
                tabAuditions: true,
                tabEffectLibrary: false,
                tabWarmups: true,
                tabVoiceMemos: false
            }
        };

        initializeSettingsView(settings, [], [], [], mockSaveSettings, mockRestoreCallback);

        expect((document.getElementById('settings-export-format') as HTMLSelectElement).value).toBe('wav');
        expect((document.getElementById('settings-export-path') as HTMLInputElement).value).toBe('my_audio');
        expect((document.getElementById('settings-export-grouping') as HTMLSelectElement).value).toBe('character');
        expect((document.getElementById('visibility-view-dungeon-master') as HTMLInputElement).checked).toBe(false);
    });

    it('triggers save on change', () => {
        const settings: SystemSettings = {
            exportFormat: 'webm',
            audioExportPath: 'audio',
            scriptExportGrouping: 'line',
            recordingGear: '',
            systemFont: 'default',
            featureVisibility: {} as any
        };

        initializeSettingsView(settings, [], [], [], mockSaveSettings, mockRestoreCallback);

        const pathInput = document.getElementById('settings-export-path') as HTMLInputElement;
        pathInput.value = 'new_audio_path';
        pathInput.dispatchEvent(new Event('input'));

        expect(mockSaveSettings).toHaveBeenCalled();
        const calledArgs = mockSaveSettings.mock.calls[0][0];
        expect(calledArgs.audioExportPath).toBe('new_audio_path');
    });

    it('handles clear cache', () => {
        initializeSettingsView({} as any, [], [], [], mockSaveSettings, mockRestoreCallback);

        const btn = document.getElementById('settings-clear-cache-btn') as HTMLButtonElement;
        btn.click();

        expect(window.confirm).toHaveBeenCalled();
        expect(localStorage.clear).toHaveBeenCalled();
        expect(indexedDB.deleteDatabase).toHaveBeenCalledWith('VoAppDatabase');
        expect(window.location.reload).toHaveBeenCalled();
    });

    it('handles backup', async () => {
        initializeSettingsView({} as any, [], [], [], mockSaveSettings, mockRestoreCallback);

        const backupBtn = document.getElementById('settings-full-backup-btn') as HTMLButtonElement;
        backupBtn.click();

        await new Promise(r => setTimeout(r, 50));
        expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('handles restore', async () => {
        initializeSettingsView({} as any, [], [], [], mockSaveSettings, mockRestoreCallback);

        const restoreFile = document.getElementById('settings-restore-file') as HTMLInputElement;
        const file = new File(['zipdata'], 'backup.zip', { type: 'application/zip' });
        Object.defineProperty(restoreFile, 'files', { value: [file] });

        const restoreBtn = document.getElementById('settings-restore-btn') as HTMLButtonElement;
        restoreBtn.click();

        await new Promise(r => setTimeout(r, 50));
        expect(mockRestoreCallback).toHaveBeenCalled();
        expect(indexeddb.deleteVoiceMemos).toHaveBeenCalled();
    });

    it('updates storage usage display', async () => {
        updateStorageUsageDisplay();
        await new Promise(r => setTimeout(r, 0));

        const el = document.getElementById('settings-storage-usage');
        expect(el?.textContent).toContain('5.00 MB');
    });
});
