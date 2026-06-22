import { describe, it, expect, vi } from 'vitest';
import { createProjectSection } from '../../src/components/project-renderer.js';
import { Project } from '../../src/types.js';

describe('project-renderer', () => {
    it('creates standard project section', () => {
        const mockDrop = vi.fn();
        const mockOpenProject = vi.fn();
        const mockOpenDict = vi.fn();
        const project: Project = { id: 1, name: 'P1', description: '', licensing: '' };

        const section = createProjectSection(project, mockDrop, mockOpenProject, mockOpenDict);
        expect(section.dataset.projectId).toBe('1');
        
        const titleSpan = section.querySelector('.project-header span') as HTMLElement;
        expect(titleSpan.textContent).toBe('P1');

        titleSpan.dispatchEvent(new MouseEvent('dblclick'));
        expect(mockOpenProject).toHaveBeenCalledWith(project);

        const dictBtn = section.querySelector('.dictionary-btn') as HTMLElement;
        dictBtn.click();
        expect(mockOpenDict).toHaveBeenCalledWith(project);
    });

    it('creates unassigned project section', () => {
        const mockDrop = vi.fn();
        const mockOpenProject = vi.fn();
        const mockOpenDict = vi.fn();
        const project: Project = { id: 0, name: 'Unassigned Characters', description: '', licensing: '' };

        const section = createProjectSection(project, mockDrop, mockOpenProject, mockOpenDict);
        
        expect(section.querySelector('.dictionary-btn')).toBeNull();
        
        const titleSpan = section.querySelector('.project-header span') as HTMLElement;
        titleSpan.dispatchEvent(new MouseEvent('dblclick'));
        expect(mockOpenProject).not.toHaveBeenCalled();
    });

    it('handles drag and drop', () => {
        const mockDrop = vi.fn();
        const project: Project = { id: 1, name: 'P1', description: '', licensing: '' };

        const section = createProjectSection(project, mockDrop, vi.fn(), vi.fn());
        
        const dragOverEvent = new Event('dragover', { bubbles: true });
        dragOverEvent.preventDefault = vi.fn();
        section.dispatchEvent(dragOverEvent);
        expect(dragOverEvent.preventDefault).toHaveBeenCalled();
        expect(section.classList.contains('drag-over')).toBe(true);

        section.dispatchEvent(new Event('dragleave', { bubbles: true }));
        expect(section.classList.contains('drag-over')).toBe(false);

        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.preventDefault = vi.fn();
        dropEvent.dataTransfer = { getData: vi.fn().mockReturnValue('42') };
        
        section.classList.add('drag-over');
        section.dispatchEvent(dropEvent);
        
        expect(dropEvent.preventDefault).toHaveBeenCalled();
        expect(section.classList.contains('drag-over')).toBe(false);
        expect(mockDrop).toHaveBeenCalledWith(42, 1);
    });

    it('handles drop into unassigned project', () => {
        const mockDrop = vi.fn();
        const project: Project = { id: 0, name: 'Unassigned', description: '', licensing: '' };

        const section = createProjectSection(project, mockDrop, vi.fn(), vi.fn());
        
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.preventDefault = vi.fn();
        dropEvent.dataTransfer = { getData: vi.fn().mockReturnValue('42') };
        
        section.dispatchEvent(dropEvent);
        expect(mockDrop).toHaveBeenCalledWith(42, undefined);
    });
});
