import { Project, Character } from './types.js';
import { handleArtworkPreview, createButton } from './dom-utils.js';

// --- Module State ---
let characters: Character[] = [];
let projects: Project[] = [];
let saveCharacterCallback: (character: Character, artworkFile?: File, sampleFile?: File, recordedSample?: string) => Promise<void>;
let duplicateCharacterCallback: (character: Character) => void;
let deleteCharacterCallback: (id: number) => void;

// --- DOM Elements ---
let modalElement: HTMLElement;
let modalContentElement: HTMLElement;

export function initializeCharacterModal(
    modalEl: HTMLElement,
    modalContentEl: HTMLElement,
    initialCharacters: Character[],
    initialProjects: Project[],
    saveCb: (character: Character, artworkFile?: File, sampleFile?: File, recordedSample?: string) => Promise<void>,
    duplicateCb: (character: Character) => void,
    deleteCb: (id: number) => void
) {
    modalElement = modalEl;
    modalContentElement = modalContentEl;
    characters = initialCharacters;
    projects = initialProjects;
    saveCharacterCallback = saveCb;
    duplicateCharacterCallback = duplicateCb;
    deleteCharacterCallback = deleteCb;
}

export function openModal(character?: Character, isEditMode = false) {
    if (!modalElement || !modalContentElement) return;

    const projectOptions = projects.map(p => `<option value="${p.id}" ${character?.projectId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');

    if (character) {
        if (isEditMode) {
            const artworkPreview = character.artwork ? `<img src="${character.artwork}" class="modal-artwork-preview">` : '';
            const artworkFilename = character.artworkFilename || '';
            modalContentElement.innerHTML = `
                <h2>Edit Character</h2>
                <select id="character-project"><option value="">No Project</option>${projectOptions}</select>
                <input id="edit-name" value="${character.name}" />
                <div class="modal-artwork-edit-container">
                    <div class="artwork-input-section">
                        <p><strong>Character Artwork:</strong></p>
                        <label for="edit-artwork" class="custom-file-input">Choose File</label>
                        <input type="file" id="edit-artwork" accept="image/*">
                        <div id="artwork-preview-container">
                            ${artworkPreview}
                        </div>
                        <span id="file-name" class="file-name">${artworkFilename}</span>
                    </div>
                    <textarea id="edit-description" placeholder="Character Description">${character.description}</textarea>
                </div>
                <p><strong>Voice Description:</strong></p>
                <textarea id="edit-voice">${character.voice_description}</textarea>
                <p><strong>Voice Sample:</strong></p>
                <div id="recording-status"></div>
                <button id="record-button">Record (10s)</button>
                <p><strong>Tags:</strong></p>
                <div id="tag-container"></div>
                <input id="tag-input" placeholder="Add tags (space-separated)">
                <div class="modal-footer"></div>
            `;
            const footer = modalContentElement.querySelector('.modal-footer');
            footer?.appendChild(createButton('save-button', 'Save', () => saveCharacterHandler(character.id)));
            footer?.appendChild(createButton('cancel-button', 'Cancel', () => openModal(character)));
            renderTagsForEdit(character.tags || []);
            document.getElementById('edit-artwork')?.addEventListener('change', handleArtworkPreview);
            document.getElementById('record-button')?.addEventListener('click', recordAudio);
        } else {
            let artworkDisplay = '';
            if (character.artwork) {
                artworkDisplay = `<img src="${character.artwork}" class="modal-artwork" title="${character.artworkFilename || ''}">`;
            }
            let audioPlayer = '';
            if (character.voice_sample) {
                audioPlayer = `<p><strong>Voice Sample:</strong></p><audio controls src="${character.voice_sample}"></audio>`;
            }
            let tagsDisplay = '';
            if (character.tags && character.tags.length > 0) {
                tagsDisplay = `<p><strong>Tags:</strong></p><div class="tag-view">${character.tags.map(tag => `<span class="tag-item">${tag}</span>`).join('')}</div>`;
            }
            modalContentElement.innerHTML = `
                <h2>${character.name}</h2>
                <div class="modal-artwork-container">
                    ${artworkDisplay}
                    <p><strong>Description:</strong> ${character.description}</p>
                </div>
                <p><strong>Voice:</strong> ${character.voice_description}</p>
                ${tagsDisplay}
                ${audioPlayer}
                <div class="modal-footer"></div>
            `;
            const footer = modalContentElement.querySelector('.modal-footer');
            footer?.appendChild(createButton('modal-edit-button', 'Edit', () => openModal(character, true)));
            footer?.appendChild(createButton('duplicate-character-button', 'Duplicate', () => duplicateCharacterCallback(character)));
            footer?.appendChild(createButton('delete-character-button', 'Delete', () => deleteCharacterCallback(character.id)));
        }
    } else {
        // New Character
        modalContentElement.innerHTML = `
            <h2>New Character</h2>
            <select id="character-project"><option value="">No Project</option>${projectOptions}</select>
            <input id="edit-name" placeholder="Character Name" />
            <div class="modal-artwork-edit-container">
                <div class="artwork-input-section">
                    <p><strong>Character Artwork:</strong></p>
                    <label for="edit-artwork" class="custom-file-input">Choose File</label>
                    <input type="file" id="edit-artwork" accept="image/*">
                    <div id="artwork-preview-container"></div>
                    <span id="file-name" class="file-name"></span>
                </div>
                <textarea id="edit-description" placeholder="Character Description"></textarea>
            </div>
            <p><strong>Voice Description:</strong></p>
            <textarea id="edit-voice" placeholder="Voice Description"></textarea>
            <p><strong>Voice Sample:</strong></p>
            <div id="recording-status"></div>
            <button id="record-button">Record (10s)</button>
            <p><strong>Tags:</strong></p>
            <div id="tag-container"></div>
            <input id="tag-input" placeholder="Add tags (space-separated)">
            <div class="modal-footer"></div>
        `;
        const footer = modalContentElement.querySelector('.modal-footer');
        footer?.appendChild(createButton('save-button', 'Save', () => saveCharacterHandler(null)));
        renderTagsForEdit([]);
        document.getElementById('edit-artwork')?.addEventListener('change', handleArtworkPreview);
        document.getElementById('record-button')?.addEventListener('click', recordAudio);
    }
    modalElement.classList.remove('hidden');
}

export function closeModal() {
    if (!modalElement) return;
    modalElement.classList.add('hidden');
}

let recordedSample: string | undefined;

async function recordAudio() {
    const statusEl = document.getElementById('recording-status');
    if (!statusEl) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = () => {
                recordedSample = reader.result as string;
                statusEl.textContent = 'Recording finished. Click Save.';
            };
            reader.readAsDataURL(blob);
        };
        recorder.start();
        statusEl.textContent = 'Recording... (10 seconds)';
        setTimeout(() => {
            recorder.stop();
            stream.getTracks().forEach(track => track.stop());
        }, 10000);
    } catch (err) {
        statusEl.textContent = 'Could not access microphone.';
        console.error('Error recording audio:', err);
    }
}

function renderTagsForEdit(tags: string[]) {
    const container = document.getElementById('tag-container');
    const input = document.getElementById('tag-input') as HTMLInputElement;
    if (!container || !input) return;
    const currentTags = [...tags];
    const updateTagsDisplay = () => {
        container.innerHTML = '';
        currentTags.forEach((tag, index) => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag-item';
            tagEl.textContent = tag;
            const closeEl = document.createElement('span');
            closeEl.className = 'tag-close';
            closeEl.innerHTML = '&times;';
            closeEl.addEventListener('click', () => {
                currentTags.splice(index, 1);
                updateTagsDisplay();
            });
            tagEl.appendChild(closeEl);
            container.appendChild(tagEl);
        });
    };
    input.addEventListener('keyup', (e) => {
        if (e.key === ' ' && input.value.trim() !== '') {
            const newTags = input.value.trim().split(/\s+/);
            newTags.forEach(t => {
                if (t && !currentTags.includes(t)) {
                    currentTags.push(t);
                }
            });
            input.value = '';
            updateTagsDisplay();
        }
    });
    updateTagsDisplay();
}

async function saveCharacterHandler(characterId: number | null) {
    const name = (document.getElementById('edit-name') as HTMLInputElement).value;
    const description = (document.getElementById('edit-description') as HTMLTextAreaElement).value;
    const voice_description = (document.getElementById('edit-voice') as HTMLTextAreaElement).value;
    const artworkFile = (document.getElementById('edit-artwork') as HTMLInputElement).files?.[0];
    const projectId = parseInt((document.getElementById('character-project') as HTMLSelectElement).value);
    const tagElements = document.querySelectorAll('#tag-container .tag-item');
    const tags = Array.from(tagElements).map(el => el.textContent?.replace(/×$/, '').trim() || '').filter(Boolean);

    const idToSave = characterId ?? Date.now();
    const existingCharacter = characters.find(c => c.id === idToSave);

    const characterToSave: Character = {
        id: idToSave,
        name: name,
        description: description,
        voice_description: voice_description,
        tags: tags,
        projectId: projectId || undefined,
        artwork: existingCharacter?.artwork,
        artworkFilename: existingCharacter?.artworkFilename,
        voice_sample: existingCharacter?.voice_sample,
    };

    await saveCharacterCallback(characterToSave, artworkFile, undefined, recordedSample);
}
