import { Project } from './types.js';

export function createProjectSection(
    project: Project,
    onDrop: (characterId: number, projectId?: number) => void,
    openProjectModal: (project: Project) => void
): HTMLElement {
    const projectSection = document.createElement('div');
    projectSection.className = 'project-section';
    projectSection.dataset.projectId = project.id.toString();

    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';
    projectHeader.textContent = project.name;
    if (project.id !== 0) {
        projectHeader.addEventListener('dblclick', () => openProjectModal(project));
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
