import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeCharacterRenderer, renderCharacterList, createCharacterCard } from '../../src/components/character-renderer.js';
import { Character, Project } from '../../src/types.js';
import * as projectRenderer from '../../src/components/project-renderer.js';

describe('character-renderer', () => {
    let mockOpenModal: any;
    let mockOpenProject: any;
    let mockOpenDict: any;

    beforeEach(() => {
        mockOpenModal = vi.fn();
        mockOpenProject = vi.fn();
        mockOpenDict = vi.fn();
        initializeCharacterRenderer(mockOpenModal, mockOpenProject, mockOpenDict);
        vi.spyOn(projectRenderer, 'createProjectSection').mockImplementation((project) => {
            const section = document.createElement('div');
            section.className = 'project-section';
            section.id = `project-${project.id}`;
            const grid = document.createElement('div');
            grid.className = 'character-cards-grid';
            section.appendChild(grid);
            return section;
        });
    });

    it('creates a character card and handles click', () => {
        const char = { id: 1, name: 'Char' } as Character;
        const card = createCharacterCard(char) as any;
        expect(card.tagName.toLowerCase()).toBe('character-card');
        expect(card.dataset.characterId).toBe('1');

        card.dispatchEvent(new CustomEvent('cardClicked', { detail: char }));
        expect(mockOpenModal).toHaveBeenCalledWith(char);
    });

    it('renders character list grouped by projects', () => {
        const container = document.createElement('div');
        const projects: Project[] = [{ id: 1, name: 'P1', description: '', licensing: '' }];
        const characters: Character[] = [
            { id: 1, name: 'C1', projectId: 1 } as Character,
            { id: 2, name: 'C2', projectId: undefined } as Character
        ];

        renderCharacterList(container, characters, projects, vi.fn());

        const sections = container.querySelectorAll('.project-section');
        expect(sections.length).toBe(2); // P1 + Unassigned

        const p1Grid = sections[0].querySelector('.character-cards-grid');
        expect(p1Grid?.children.length).toBe(1);
        expect((p1Grid?.children[0] as HTMLElement).dataset.characterId).toBe('1');

        const unassignedGrid = sections[1].querySelector('.character-cards-grid');
        expect(unassignedGrid?.children.length).toBe(1);
        expect((unassignedGrid?.children[0] as HTMLElement).dataset.characterId).toBe('2');
    });
});
