import { Project } from '../types.js';

export function createProjectSection(
    project: Project,
    onDrop: (characterId: number, projectId?: number) => void,
    openProjectModal: (project: Project) => void,
    openDictionaryModal: (project: Project) => void
): HTMLElement {
    const projectSection = document.createElement('div');
    projectSection.className = 'project-section';
    projectSection.dataset.projectId = project.id.toString();

    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';
    projectHeader.style.display = 'flex';
    projectHeader.style.justifyContent = 'space-between';
    projectHeader.style.alignItems = 'center';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = project.name;
    projectHeader.appendChild(titleSpan);

    if (project.id !== 0) {
        titleSpan.addEventListener('dblclick', () => openProjectModal(project));
        
        const dictionaryBtn = document.createElement('button');
        dictionaryBtn.textContent = 'Dictionary';
        dictionaryBtn.className = 'dictionary-btn';
        dictionaryBtn.style.padding = '5px 10px';
        dictionaryBtn.style.fontSize = '0.9rem';
        dictionaryBtn.addEventListener('click', () => openDictionaryModal(project));
        projectHeader.appendChild(dictionaryBtn);
    }
    projectSection.appendChild(projectHeader);

    const characterCardsGrid = document.createElement('div');
    characterCardsGrid.className = 'character-cards-grid';
    projectSection.appendChild(characterCardsGrid);

    projectSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        projectSection.classList.add('drag-over');
    });
    projectSection.addEventListener('dragleave', () => {
        projectSection.classList.remove('drag-over');
    });
    projectSection.addEventListener('drop', (e) => {
        e.preventDefault();
        projectSection.classList.remove('drag-over');
        const characterId = parseInt(e.dataTransfer?.getData('text/plain') || '');
        const projectId = project.id === 0 ? undefined : project.id;
        onDrop(characterId, projectId);
    });

    return projectSection;
}
