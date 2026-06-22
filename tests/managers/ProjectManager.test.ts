import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectManager } from '../../src/managers/ProjectManager.js';
import { DataStore } from '../../src/services/DataStore.js';
import { closeProjectModal } from '../../src/components/project-modal.js';
import JSZip from 'jszip';

vi.mock('../../src/services/DataStore.js', () => ({
    DataStore: {
        getCharacters: vi.fn(),
        getProjects: vi.fn().mockReturnValue([]),
        updateCharacter: vi.fn(),
        deleteProject: vi.fn(),
        addProject: vi.fn(),
        addCharacter: vi.fn()
    }
}));

vi.mock('../../src/components/project-modal.js', () => ({
    closeProjectModal: vi.fn()
}));

describe('ProjectManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.confirm = vi.fn(() => true);
        global.alert = vi.fn();
    });

    it('deletes a project and unassigns its characters', () => {
        const projectToDelete = 1;
        const chars = [
            { id: 10, projectId: 1 },
            { id: 11, projectId: 2 }
        ] as any[];
        
        (DataStore.getCharacters as any).mockReturnValue(chars);

        ProjectManager.deleteProject(projectToDelete);

        expect(DataStore.deleteProject).toHaveBeenCalledWith(1);
        expect(chars[0].projectId).toBeUndefined(); // Character 10 unassigned
        expect(DataStore.updateCharacter).toHaveBeenCalledWith(chars[0]);
        expect(DataStore.updateCharacter).not.toHaveBeenCalledWith(chars[1]);
        expect(closeProjectModal).toHaveBeenCalled();
    });

    it('imports a project successfully from a zip file', async () => {
        const zip = new JSZip();
        zip.file('project.json', JSON.stringify({ name: 'Imported Project' }));
        const charFolder = zip.folder('characters/123');
        charFolder!.file('123_character.json', JSON.stringify({ name: 'Imported Char' }));

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFile = new File([zipBlob], 'export.zip', { type: 'application/zip' });

        await ProjectManager.importProject(zipFile);

        expect(DataStore.addProject).toHaveBeenCalled();
        expect(DataStore.addCharacter).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('imported successfully'));
    });
});
