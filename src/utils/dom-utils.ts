export function handleArtworkPreview(event: Event) {
    const input = event.target as HTMLInputElement;
    const previewContainer = document.getElementById('artwork-preview-container');
    const fileNameElement = document.getElementById('file-name');
    if (!input.files || !previewContainer || !fileNameElement) return;

    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `<img src="${e.target?.result}" class="modal-artwork-preview">`;
            fileNameElement.textContent = file.name;
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.innerHTML = '';
        fileNameElement.textContent = '';
    }
}

export function createButton(id: string, text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
}

import { Character } from '../types.js';

/**
 * Generates HTML options for character dropdowns, grouping unassigned characters
 * at the bottom under a disabled separator.
 * @param allCharacters The full list of available characters
 * @param filterProjectId If provided, filters assigned characters to this project. Unassigned characters are still shown.
 * @param selectedCharacterId If provided, this character ID will have the 'selected' attribute.
 */
export function generateCharacterOptionsHTML(allCharacters: Character[], filterProjectId?: number, selectedCharacterId?: number): string {
    let assignedChars = allCharacters.filter(c => c.projectId);
    const unassignedChars = allCharacters.filter(c => !c.projectId);

    if (filterProjectId !== undefined && !isNaN(filterProjectId)) {
        assignedChars = assignedChars.filter(c => c.projectId === filterProjectId);
    }

    // Sort alphabetically
    assignedChars.sort((a, b) => a.name.localeCompare(b.name));
    unassignedChars.sort((a, b) => a.name.localeCompare(b.name));

    let html = '';
    
    assignedChars.forEach(c => {
        html += `<option value="${c.id}" ${selectedCharacterId === c.id ? 'selected' : ''}>${c.name}</option>`;
    });

    if (unassignedChars.length > 0) {
        if (assignedChars.length > 0) {
            html += `<option disabled>---Unassigned Characters---</option>`;
        }
        unassignedChars.forEach(c => {
            html += `<option value="${c.id}" ${selectedCharacterId === c.id ? 'selected' : ''}>${c.name}</option>`;
        });
    }

    return html;
}
