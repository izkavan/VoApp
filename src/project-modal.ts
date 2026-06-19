import { Project, Character, SystemSettings } from './types.js';
import { convertWebMToWav } from './audio-utils.js';

declare var JSZip: any;

// --- Module State ---
let projects: Project[] = [];
let characters: Character[] = [];
let currentProjectId: number | null = null;
let currentSettings: SystemSettings;
let renderAppCallback: () => void;
let deleteProjectCallback: (id: number) => void;
let saveCallback: (projects: Project[]) => void;

// --- DOM Elements ---
let projectModalElement: HTMLElement;
let projectNameInput: HTMLInputElement;
let projectDescriptionInput: HTMLTextAreaElement;
let projectLicensingInput: HTMLInputElement;
let projectStartDateInput: HTMLInputElement;
let projectEndDateInput: HTMLInputElement;
let exportProjectButton: HTMLButtonElement;
let deleteProjectButton: HTMLButtonElement;

export function initializeProjectModal(
    modalEl: HTMLElement,
    nameInput: HTMLInputElement,
    descriptionInput: HTMLTextAreaElement,
    licensingInput: HTMLInputElement,
    startDateInput: HTMLInputElement,
    endDateInput: HTMLInputElement,
    exportBtn: HTMLButtonElement,
    deleteBtn: HTMLButtonElement,
    initialProjects: Project[],
    initialCharacters: Character[],
    settings: SystemSettings,
    renderAppCb: () => void,
    deleteCb: (id: number) => void,
    onSave: (projects: Project[]) => void
) {
    projectModalElement = modalEl;
    projectNameInput = nameInput;
    projectDescriptionInput = descriptionInput;
    projectLicensingInput = licensingInput;
    projectStartDateInput = startDateInput;
    projectEndDateInput = endDateInput;
    exportProjectButton = exportBtn;
    deleteProjectButton = deleteBtn;
    projects = initialProjects;
    characters = initialCharacters;
    currentSettings = settings;
    renderAppCallback = renderAppCb;
    deleteProjectCallback = deleteCb;
    saveCallback = onSave;

    exportProjectButton.addEventListener('click', exportProject);
    deleteProjectButton.addEventListener('click', () => {
        if (currentProjectId !== null) {
            deleteProjectCallback(currentProjectId);
        }
    });
}

export function openProjectModal(project?: Project) {
    if (!projectModalElement) return;
    if (project) {
        currentProjectId = project.id;
        projectNameInput.value = project.name;
        projectDescriptionInput.value = project.description;
        projectLicensingInput.value = project.licensing;
        projectStartDateInput.value = project.startDate || '';
        projectEndDateInput.value = project.endDate || '';
        deleteProjectButton.style.display = 'inline-block';
    } else {
        currentProjectId = null;
        projectNameInput.value = '';
        projectDescriptionInput.value = '';
        projectLicensingInput.value = '';
        projectStartDateInput.value = '';
        projectEndDateInput.value = '';
        deleteProjectButton.style.display = 'none';
    }
    projectModalElement.classList.remove('hidden');
}

export function closeProjectModal() {
    if (!projectModalElement) return;
    projectModalElement.classList.add('hidden');
}

export function saveProject() {
    const name = projectNameInput.value;
    const description = projectDescriptionInput.value;
    const licensing = projectLicensingInput.value;
    const startDate = projectStartDateInput.value;
    const endDate = projectEndDateInput.value;

    if (currentProjectId !== null) {
        const projIndex = projects.findIndex(p => p.id === currentProjectId);
        if (projIndex > -1) {
            projects[projIndex] = { ...projects[projIndex], name, description, licensing, startDate, endDate };
        }
    } else {
        const newProject: Project = {
            id: Date.now(),
            name,
            description,
            licensing,
            startDate,
            endDate
        };
        projects.push(newProject);
    }

    saveCallback(projects);
    renderAppCallback();
    closeProjectModal();
}

async function exportProject() {
    if (currentProjectId === null) return;

    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    const projectCharacters = characters.filter(c => c.projectId === currentProjectId);
    const zip = new JSZip();

    let hasAudio = false;

    const charactersFolder = zip.folder('characters');
    if (charactersFolder) {
        for (const character of projectCharacters) {
            const charFolder = charactersFolder.folder(character.name.replace(/[^a-zA-Z0-9]/g, '_'));
            if (charFolder) {
                charFolder.file('character.json', JSON.stringify(character, null, 2));
                if (character.artwork) {
                    const artworkData = character.artwork.split(',')[1];
                    charFolder.file(character.artworkFilename || 'artwork.png', artworkData, { base64: true });
                }
                if (character.voice_sample) {
                    hasAudio = true;
                    if (currentSettings.exportFormat === 'wav') {
                        const wavBlob = await convertWebMToWav(character.voice_sample);
                        charFolder.file('voice_sample.wav', wavBlob);
                    } else {
                        const voiceData = character.voice_sample.split(',')[1];
                        charFolder.file('voice_sample.webm', voiceData, { base64: true });
                    }
                }
            }
        }
    }

    const projectJsonData: any = { ...project };
    if (hasAudio && currentSettings.recordingGear) {
        projectJsonData.recordingGear = currentSettings.recordingGear;
    }
    zip.file('project.json', JSON.stringify(projectJsonData, null, 2));

    const zipContent = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipContent);
    a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
    a.click();
}
