import { Character, Project } from '../types.js';
import { createProjectSection } from './project-renderer.js';

let openCharacterModalCallback: (character?: Character) => void;
let openProjectModalCallback: (project: Project) => void;
let openDictionaryModalCallback: (project: Project) => void;

export function initializeCharacterRenderer(
    openModalFn: (character?: Character) => void,
    openProjectModalFn: (project: Project) => void,
    openDictionaryModalFn: (project: Project) => void
) {
    openCharacterModalCallback = openModalFn;
    openProjectModalCallback = openProjectModalFn;
    openDictionaryModalCallback = openDictionaryModalFn;
}

export function renderCharacterList(
    characterListElement: HTMLElement,
    characterData: Character[],
    projects: Project[],
    onCharacterDrop: (characterId: number, projectId?: number) => void
) {
    characterListElement.innerHTML = '';

    projects.forEach(project => {
        const projectSection = createProjectSection(project, onCharacterDrop, openProjectModalCallback, openDictionaryModalCallback);
        characterListElement.appendChild(projectSection);

        const projectCharacters = characterData.filter(c => c.projectId === project.id);
        const characterCardsGrid = projectSection.querySelector('.character-cards-grid');
        projectCharacters.forEach(character => {
            const card = createCharacterCard(character);
            characterCardsGrid?.appendChild(card);
        });
    });

    const unassignedProject = { id: 0, name: 'Unassigned Characters', description: '', licensing: '' };
    const unassignedSection = createProjectSection(unassignedProject, onCharacterDrop, openProjectModalCallback, openDictionaryModalCallback);
    characterListElement.appendChild(unassignedSection);
    const unassignedCharacters = characterData.filter(c => !c.projectId);
    const unassignedCardsGrid = unassignedSection.querySelector('.character-cards-grid');
    unassignedCharacters.forEach(character => {
        const card = createCharacterCard(character);
        unassignedCardsGrid?.appendChild(card);
    });
}

import './character-card.js';

export function createCharacterCard(character: Character): HTMLElement {
    const card = document.createElement('character-card') as any;
    card.data = character;
    card.addEventListener('cardClicked', (e: any) => {
        if (openCharacterModalCallback) {
            openCharacterModalCallback(e.detail);
        }
    });
    return card;
}
