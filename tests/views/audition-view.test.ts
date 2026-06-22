import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeAuditionView } from '../../src/views/audition-view.js';
import { Audition, Character, SystemSettings } from '../../src/types.js';

describe('audition-view', () => {
    let mockSave: any;
    let mockSettingsSave: any;

    beforeEach(() => {
        document.body.innerHTML = `
            <button id="new-audition-button"></button>
            <button id="about-me-button"></button>
            <div class="collapsible-header"></div>
            <div style="display: none;"></div>
            <div id="active-audition-list"></div>
            <div id="inactive-audition-list"></div>
            
            <div id="audition-modal" class="hidden"></div>
            <div id="audition-modal-content"></div>
            <button id="audition-modal-close"></button>
            
            <div id="about-me-modal" style="display: none;"></div>
            <input id="about-me-first-name" />
            <input id="about-me-last-name" />
            <input id="about-me-email" />
            <input id="about-me-phone" />
            <input id="about-me-address" />
            <button id="about-me-modal-close"></button>
            <button id="about-me-save-btn"></button>

            <div id="audition-export-modal" style="display: none;"></div>
            <input id="audition-export-rate" />
            <input id="audition-export-start-date" />
            <input id="audition-export-end-date" />
            <input type="checkbox" id="audition-export-open-time" />
            <button id="audition-export-modal-close"></button>
            <button id="audition-export-confirm-btn"></button>
        `;

        mockSave = vi.fn();
        mockSettingsSave = vi.fn();
        
        const mockFolder = {
            folder: vi.fn().mockReturnThis(),
            file: vi.fn()
        };
        (global as any).JSZip = vi.fn().mockImplementation(function() {
            return {
                folder: vi.fn().mockReturnValue(mockFolder),
                file: vi.fn(),
                generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }))
            };
        });
        
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn().mockReturnValue('blob:url'),
            revokeObjectURL: vi.fn()
        });
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    it('initializes and renders audition lists', () => {
        const auditions: Audition[] = [
            { id: 1, projectName: 'Active Proj', castingDirector: { name: 'CD1' } as any, dueDate: '2023', status: 'Submitted', linkedCharacterIds: [], files: [], notes: '' },
            { id: 2, projectName: 'Inactive Proj', castingDirector: { name: 'CD2' } as any, dueDate: '2023', status: 'Rejected', linkedCharacterIds: [], files: [], notes: '' }
        ];

        initializeAuditionView(auditions, [], {} as SystemSettings, mockSave, mockSettingsSave);

        const activeList = document.getElementById('active-audition-list');
        const inactiveList = document.getElementById('inactive-audition-list');

        expect(activeList?.innerHTML).toContain('Active Proj');
        expect(inactiveList?.innerHTML).toContain('Inactive Proj');
    });

    it('changes status via dropdown', () => {
        const auditions: Audition[] = [
            { id: 1, projectName: 'Active Proj', castingDirector: { name: 'CD1' } as any, dueDate: '2023', status: 'Submitted', linkedCharacterIds: [], files: [], notes: '' }
        ];

        initializeAuditionView(auditions, [], {} as SystemSettings, mockSave, mockSettingsSave);

        const dropdown = document.querySelector('.audition-status-dropdown') as HTMLSelectElement;
        dropdown.value = 'Callback';
        dropdown.dispatchEvent(new Event('change'));

        expect(mockSave).toHaveBeenCalled();
        expect(auditions[0].status).toBe('Callback');
    });

    it('opens and saves about-me modal', () => {
        const settings: SystemSettings = {
            exportFormat: 'wav',
            actorProfile: { firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: '123', address: '123 st' }
        };
        initializeAuditionView([], [], settings, mockSave, mockSettingsSave);

        document.getElementById('about-me-button')?.click();
        const aboutModal = document.getElementById('about-me-modal');
        expect(aboutModal?.style.display).toBe('flex');

        const fName = document.getElementById('about-me-first-name') as HTMLInputElement;
        fName.value = 'Jane';

        document.getElementById('about-me-save-btn')?.click();
        
        expect(mockSettingsSave).toHaveBeenCalled();
        const savedSettings = mockSettingsSave.mock.calls[0][0];
        expect(savedSettings.actorProfile.firstName).toBe('Jane');
        expect(aboutModal?.style.display).toBe('none');
    });

    it('opens audition modal for new audition', () => {
        initializeAuditionView([], [], {} as SystemSettings, mockSave, mockSettingsSave);

        document.getElementById('new-audition-button')?.click();
        const modal = document.getElementById('audition-modal');
        expect(modal?.classList.contains('hidden')).toBe(false);
        
        const projNameInput = document.getElementById('aud-project-name') as HTMLInputElement;
        projNameInput.value = 'New Aud';
        
        document.getElementById('save-audition-button')?.click();
        expect(mockSave).toHaveBeenCalled();
        const saved = mockSave.mock.calls[0][0];
        expect(saved[0].projectName).toBe('New Aud');
    });

    it('handles export without profile', () => {
        const auditions: Audition[] = [
            { id: 1, projectName: 'Active Proj', castingDirector: { name: 'CD1' } as any, dueDate: '2023', status: 'Submitted', linkedCharacterIds: [], files: [], notes: '', audioData: 'data' }
        ];
        initializeAuditionView(auditions, [], {} as SystemSettings, mockSave, mockSettingsSave);

        const exportBtn = document.querySelector('.export-audition-btn') as HTMLButtonElement;
        exportBtn.click();
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('About Me'));
    });

    it('handles export with profile but no audio', () => {
        const auditions: Audition[] = [
            { id: 1, projectName: 'Active Proj', castingDirector: { name: 'CD1' } as any, dueDate: '2023', status: 'Submitted', linkedCharacterIds: [], files: [], notes: '' }
        ];
        const settings: SystemSettings = {
            exportFormat: 'wav',
            actorProfile: { firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: '123', address: '123 st' }
        };
        initializeAuditionView(auditions, [], settings, mockSave, mockSettingsSave);

        const exportBtn = document.querySelector('.export-audition-btn') as HTMLButtonElement;
        exportBtn.click();
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('audio'));
    });

    it('opens export modal and confirms export', async () => {
        const auditions: Audition[] = [
            { id: 1, projectName: 'Active Proj', castingDirector: { name: 'CD1' } as any, dueDate: '2023', status: 'Submitted', linkedCharacterIds: [], files: [], notes: '', audioData: 'data:audio/wav;base64,MTIz' }
        ];
        const settings: SystemSettings = {
            exportFormat: 'wav',
            actorProfile: { firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: '123', address: '123 st' }
        };
        initializeAuditionView(auditions, [], settings, mockSave, mockSettingsSave);

        const exportBtn = document.querySelector('.export-audition-btn') as HTMLButtonElement;
        exportBtn.click();
        
        const exportModal = document.getElementById('audition-export-modal');
        expect(exportModal?.style.display).toBe('flex');

        const confirmBtn = document.getElementById('audition-export-confirm-btn');
        confirmBtn?.click();

        await new Promise(r => setTimeout(r, 50)); 
        expect(URL.createObjectURL).toHaveBeenCalled();
    });
});
