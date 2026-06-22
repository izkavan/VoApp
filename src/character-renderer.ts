import { Character, Project } from './types.js';
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

export function createCharacterCard(character: Character): HTMLElement {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.title = character.voice_description;
    card.draggable = true;
    card.dataset.characterId = character.id.toString();

    card.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', character.id.toString());
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });

    let artwork = '';
    if (character.artwork) {
        artwork = `<img src="${character.artwork}" class="character-card-artwork">`;
    }
    
    let odditiesHtml = '';
    if (character.characterOddities) {
        odditiesHtml = `<p class="character-oddities" style="font-size: 0.85em; font-style: italic; margin-top: 5px;"><strong>Oddities:</strong> ${character.characterOddities}</p>`;
    }

    let audioButtonHtml = '';
    if (character.voice_sample) {
        audioButtonHtml = `<button class="play-reference-btn" style="margin-top: 10px; padding: 4px 8px; font-size: 0.9em;">Play Reference</button>`;
    }

    card.innerHTML = `${artwork}<h3>${character.name}</h3>${odditiesHtml}${audioButtonHtml}`;
    
    const playBtn = card.querySelector('.play-reference-btn');
    if (playBtn) {
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const audio = new Audio(character.voice_sample!);
            audio.play().catch(err => console.error("Could not play audio reference:", err));
        });
    }

    card.addEventListener('click', () => openCharacterModalCallback(character));
    return card;
}
