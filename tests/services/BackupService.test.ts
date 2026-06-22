import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService } from '../../src/services/BackupService.js';
import { ZipService } from '../../src/services/ZipService.js';
import { getVoiceMemos, saveVoiceMemo, deleteVoiceMemos } from '../../src/services/indexeddb.js';
import { convertWebMToWav } from '../../src/utils/audio-utils.js';

vi.mock('../../src/services/ZipService.js', () => ({
    ZipService: {
        createZip: vi.fn(),
        loadZip: vi.fn(),
        downloadZip: vi.fn(),
        readJsonFile: vi.fn()
    }
}));

vi.mock('../../src/services/indexeddb.js', () => ({
    getVoiceMemos: vi.fn(),
    saveVoiceMemo: vi.fn(),
    deleteVoiceMemos: vi.fn()
}));

vi.mock('../../src/utils/audio-utils.js', () => ({
    convertWebMToWav: vi.fn()
}));

describe('BackupService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates a full backup', async () => {
        const mockZip = {
            file: vi.fn(),
            folder: vi.fn().mockReturnValue({ file: vi.fn() })
        };
        (ZipService.createZip as any).mockResolvedValue(mockZip);
        
        const memos = [
            { id: 1, title: 'Test Memo', blob: new Blob() }
        ];
        (getVoiceMemos as any).mockResolvedValue(memos);
        
        await BackupService.generateFullBackup({ exportFormat: 'webm' } as any, [], [], []);

        expect(ZipService.createZip).toHaveBeenCalled();
        expect(mockZip.file).toHaveBeenCalledWith('settings.json', expect.any(String));
        expect(mockZip.folder).toHaveBeenCalledWith('memos');
        expect(ZipService.downloadZip).toHaveBeenCalledWith(mockZip, expect.stringContaining('VoApp_Backup_'));
    });

    it('restores a full backup', async () => {
        const mockZip = {
            file: vi.fn((path) => {
                if (path === 'memos/1.webm') {
                    return { async: vi.fn().mockResolvedValue(new Blob()) };
                }
                return null;
            })
        };
        (ZipService.loadZip as any).mockResolvedValue(mockZip);
        
        (ZipService.readJsonFile as any).mockImplementation((zip, name, def) => {
            if (name === 'memos.json') return Promise.resolve([{ id: 1, title: 'Restored Memo' }]);
            return Promise.resolve(def);
        });

        (getVoiceMemos as any).mockResolvedValue([{ id: 99 }]);

        const restoreCallback = vi.fn();
        
        await BackupService.restoreFullBackup(new File([], 'test.zip'), {} as any, restoreCallback);

        expect(deleteVoiceMemos).toHaveBeenCalledWith([99]); // Deletes old
        expect(saveVoiceMemo).toHaveBeenCalledWith(expect.objectContaining({ title: 'Restored Memo' })); // Restores new
        expect(restoreCallback).toHaveBeenCalled();
    });
});
