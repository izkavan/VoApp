import { Character, Project } from '../types.js';
import { createCharacterCard } from '../components/character-renderer.js';
import { generateRandomCharacter } from '../data/generator-data.js';

let characters: Character[] = [];
let projects: Project[] = [];
let activeSessionIds: number[] = [];
let updateCharacterSelectCallback: () => void = () => {};

export function refreshDungeonMasterView() {
    updateCharacterSelectCallback();
}

export function initializeDungeonMasterView(
    initialCharacters: Character[], 
    initialProjects: Project[],
    openModalCallback: (character?: Character, isEditMode?: boolean) => void
) {
    characters = initialCharacters;
    projects = initialProjects;

    const projectSelect = document.getElementById('dm-session-project') as HTMLSelectElement;
    const characterSelect = document.getElementById('dm-session-character') as HTMLSelectElement;
    const addButton = document.getElementById('dm-session-add-character');
    const resetButton = document.getElementById('dm-session-reset');
    const sessionContainer = document.getElementById('dm-session-characters');
    const trashZone = document.getElementById('dm-session-trash');

    if (!projectSelect || !characterSelect || !addButton || !resetButton || !sessionContainer || !trashZone) return;

    // Populate projects
    projects.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id.toString();
        option.textContent = p.name;
        projectSelect.appendChild(option);
    });

    const updateCharacterSelect = () => {
        characterSelect.innerHTML = '';
        const selectedProject = projectSelect.value;
        const filtered = selectedProject === 'none' 
            ? characters 
            : characters.filter(c => c.projectId === parseInt(selectedProject));

        filtered.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id.toString();
            option.textContent = c.name;
            characterSelect.appendChild(option);
        });
    };
    updateCharacterSelectCallback = updateCharacterSelect;

    projectSelect.addEventListener('change', updateCharacterSelect);
    updateCharacterSelect();

    const renderSession = () => {
        sessionContainer.innerHTML = '';
        activeSessionIds.forEach(id => {
            const char = characters.find(c => c.id === id);
            if (!char) return;
            
            const card = createCharacterCard(char);
            
            // We override dragstart for session cards to show trash
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer?.setData('text/plain', char.id.toString());
                card.classList.add('dragging');
                if (trashZone) {
                    trashZone.classList.remove('hidden');
                    trashZone.style.display = 'flex';
                }
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                if (trashZone) {
                    trashZone.classList.add('hidden');
                    trashZone.style.display = 'none';
                }
            });

            sessionContainer.appendChild(card);
        });
    };

    resetButton.addEventListener('click', () => {
        activeSessionIds = [];
        renderSession();
        projectSelect.value = 'none';
        updateCharacterSelect();
    });

    addButton.addEventListener('click', () => {
        const charId = parseInt(characterSelect.value);
        if (isNaN(charId) || activeSessionIds.includes(charId)) return;
        
        const char = characters.find(c => c.id === charId);
        if (!char) return;

        activeSessionIds.push(charId);
        renderSession();
    });

    trashZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // allow drop
        trashZone.style.transform = 'translateX(-50%) scale(1.2)';
    });

    trashZone.addEventListener('dragleave', () => {
        trashZone.style.transform = 'translateX(-50%) scale(1)';
    });

    trashZone.addEventListener('drop', (e) => {
        e.preventDefault();
        trashZone.style.transform = 'translateX(-50%) scale(1)';
        const id = parseInt(e.dataTransfer?.getData('text/plain') || '0', 10);
        if (id) {
            activeSessionIds = activeSessionIds.filter(sessionId => sessionId !== id);
            renderSession();
        }
        trashZone.classList.add('hidden');
        trashZone.style.display = 'none';
    });

    // Generator Logic
    const generatorProjectSelect = document.getElementById('dm-generator-project') as HTMLSelectElement;
    const generateButton = document.getElementById('dm-generator-button');

    if (generatorProjectSelect && generateButton) {
        // Populate generator projects
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id.toString();
            option.textContent = p.name;
            generatorProjectSelect.appendChild(option);
        });

        generateButton.addEventListener('click', () => {
            const selectedVal = generatorProjectSelect.value;
            const targetProjectId = selectedVal === 'none' ? undefined : parseInt(selectedVal, 10);
            
            const newChar = generateRandomCharacter(targetProjectId);
            openModalCallback(newChar, true);
        });
    }
}
