import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeProjectModal, openProjectModal, closeProjectModal, saveProject } from '../../src/components/project-modal.js';
import * as audioUtils from '../../src/utils/audio-utils.js';
import { Project, Character, SystemSettings } from '../../src/types.js';

vi.mock('jszip', () => {
    return {
        default: vi.fn().mockImplementation(function() {
            const mockFolder = {
                folder: vi.fn().mockReturnThis(),
                file: vi.fn()
            };
            return {
                folder: vi.fn().mockReturnValue(mockFolder),
                file: vi.fn(),
                generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }))
            };
        })
    };
});

describe('project-modal', () => {
    let modalEl: HTMLElement;
    let nameInput: HTMLInputElement;
    let descInput: HTMLTextAreaElement;
    let licInput: HTMLInputElement;
    let startInput: HTMLInputElement;
    let endInput: HTMLInputElement;
    let exportBtn: HTMLButtonElement;
    let deleteBtn: HTMLButtonElement;
    
    let mockRenderApp: any;
    let mockDeleteCb: any;
    let mockSaveCb: any;
    let initialProjects: Project[];
    let initialCharacters: Character[];
    let settings: SystemSettings;

    beforeEach(() => {
        modalEl = document.createElement('div');
        modalEl.className = 'hidden';
        nameInput = document.createElement('input');
        descInput = document.createElement('textarea');
        licInput = document.createElement('input');
        startInput = document.createElement('input');
        endInput = document.createElement('input');
        exportBtn = document.createElement('button');
        deleteBtn = document.createElement('button');

        mockRenderApp = vi.fn();
        mockDeleteCb = vi.fn();
        mockSaveCb = vi.fn();

        initialProjects = [{ id: 1, name: 'Existing', description: 'Desc', licensing: 'CC' }];
        initialCharacters = [{ id: 1, projectId: 1, name: 'C1', artwork: 'data:image/png;base64,123', voice_sample: 'data:audio/webm;base64,abc' }] as any[];
        settings = { exportFormat: 'wav', recordingGear: 'Mic1', font: 'system', exportGrouping: 'per-character', globalTimer: false };

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(audioUtils, 'convertWebMToWav').mockResolvedValue(new Blob(['wav'], { type: 'audio/wav' }));
        

        global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');

        initializeProjectModal(
            modalEl, nameInput, descInput, licInput, startInput, endInput, exportBtn, deleteBtn,
            initialProjects, initialCharacters, settings, mockRenderApp, mockDeleteCb, mockSaveCb
        );
    });

    it('opens project modal in create mode', () => {
        openProjectModal();
        expect(modalEl.classList.contains('hidden')).toBe(false);
        expect(nameInput.value).toBe('');
        expect(deleteBtn.style.display).toBe('none');
    });

    it('opens project modal in edit mode', () => {
        openProjectModal(initialProjects[0]);
        expect(modalEl.classList.contains('hidden')).toBe(false);
        expect(nameInput.value).toBe('Existing');
        expect(deleteBtn.style.display).toBe('inline-block');
    });

    it('closes project modal', () => {
        openProjectModal();
        closeProjectModal();
        expect(modalEl.classList.contains('hidden')).toBe(true);
    });

    it('saves new project', () => {
        openProjectModal();
        nameInput.value = 'New Project';
        saveProject();

        expect(mockSaveCb).toHaveBeenCalled();
        const savedProjects = mockSaveCb.mock.calls[0][0];
        expect(savedProjects.length).toBe(2);
        expect(savedProjects[1].name).toBe('New Project');
        expect(mockRenderApp).toHaveBeenCalled();
    });

    it('saves edited project', () => {
        openProjectModal(initialProjects[0]);
        nameInput.value = 'Edited Project';
        saveProject();

        expect(mockSaveCb).toHaveBeenCalled();
        const savedProjects = mockSaveCb.mock.calls[0][0];
        expect(savedProjects.length).toBe(1);
        expect(savedProjects[0].name).toBe('Edited Project');
        expect(mockRenderApp).toHaveBeenCalled();
    });

    it('prompts confirmation when name exists', () => {
        openProjectModal();
        nameInput.value = 'Existing';
        vi.mocked(window.confirm).mockReturnValue(false); // Cancel
        saveProject();
        expect(mockSaveCb).not.toHaveBeenCalled();

        vi.mocked(window.confirm).mockReturnValue(true); // Accept
        saveProject();
        expect(mockSaveCb).toHaveBeenCalled();
    });

    it('exports project', async () => {
        openProjectModal(initialProjects[0]);
        exportBtn.click();
        
        await new Promise(r => setTimeout(r, 0));
        
        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
    
    it('deletes project', () => {
        openProjectModal(initialProjects[0]);
        deleteBtn.click();
        expect(mockDeleteCb).toHaveBeenCalledWith(1);
    });
});
