import { Project, Character } from './types.js';
import { handleArtworkPreview, createButton } from './dom-utils.js';
import { convertWebMToWav } from './audio-utils.js';
import { loadFromLocalStorage } from './storage.js';

// --- Module State ---
let characters: Character[] = [];
let projects: Project[] = [];
let saveCharacterCallback: (character: Character, artworkFile?: File, sampleFile?: File, recordedSample?: string) => Promise<void>;
let duplicateCharacterCallback: (character: Character) => void;
let deleteCharacterCallback: (id: number) => void;

let currentMoodboardMedia: any[] = [];

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
    currentMoodboardMedia = character?.moodboardMedia ? [...character.moodboardMedia] : [];
    
    const moodboardEditHtml = `
        <div class="collapsible-section" style="margin-top: 20px;">
            <h3 class="collapsible-header">Mood Board (Edit)</h3>
            <div class="collapsible-content" style="display: none;">
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <label for="moodboard-upload" class="custom-file-input" style="cursor: pointer; padding: 5px 10px; background: var(--primary-color); color: white; border-radius: 4px;">Upload Images</label>
                    <input type="file" id="moodboard-upload" multiple accept="image/*" style="display: none;">
                    <input type="text" id="moodboard-link-input" placeholder="Paste YouTube link here..." style="flex: 1; padding: 5px;">
                    <button id="moodboard-link-btn" style="padding: 5px 10px;">Add Link</button>
                </div>
                <div id="moodboard-edit-grid" class="moodboard-masonry"></div>
            </div>
        </div>
    `;

    if (character) {
        if (isEditMode) {
            const artworkPreview = character.artwork ? `<img src="${character.artwork}" class="modal-artwork-preview">` : '';
            const artworkFilename = character.artworkFilename || '';
            modalContentElement.innerHTML = `
                <h2>Edit Character</h2>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <select id="character-project" style="flex: 1;"><option value="">No Project</option>${projectOptions}</select>
                    <input id="edit-name" value="${character.name}" style="flex: 2;" placeholder="Character Name" />
                </div>
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
                <div class="voice-sliders-container" style="margin: 15px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label for="edit-pitch" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Low Pitch</span><span>High Pitch</span></label>
                            <input type="range" id="edit-pitch" min="1" max="100" value="${character.pitch ?? 50}" style="width: 100%;">
                        </div>
                        <div>
                            <label for="edit-pace" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Slow Pace</span><span>Fast Pace</span></label>
                            <input type="range" id="edit-pace" min="1" max="100" value="${character.pace ?? 50}" style="width: 100%;">
                        </div>
                        <div>
                            <label for="edit-placement" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Chest Placement</span><span>Nasal Placement</span></label>
                            <input type="range" id="edit-placement" min="1" max="100" value="${character.placement ?? 50}" style="width: 100%;">
                        </div>
                        <div>
                            <label for="edit-timbre" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Gravelly Timbre</span><span>Smooth Timbre</span></label>
                            <input type="range" id="edit-timbre" min="1" max="100" value="${character.timbre ?? 50}" style="width: 100%;">
                        </div>
                    </div>
                </div>
                <p><strong>Voice Sample:</strong></p>
                <div id="recording-status"></div>
                <button id="record-button" class="record-button">● Record</button>
                <div id="character-audio-preview" style="display: none; margin-top: 10px; align-items: center; gap: 5px;">
                    <audio id="character-audio-player" controls controlsList="nodownload" style="flex: 1; height: 30px;"></audio>
                    <span id="character-download-sample" style="cursor: pointer; font-size: 1.2rem;" title="Download Sample">💾</span>
                </div>
                <p><strong>Tags:</strong></p>
                <div id="tag-container"></div>
                <input id="tag-input" placeholder="Add tags (space-separated)">
                ${moodboardEditHtml}
                <div class="modal-footer"></div>
            `;
            const footer = modalContentElement.querySelector('.modal-footer');
            footer?.appendChild(createButton('save-button', 'Save', () => saveCharacterHandler(character.id)));
            footer?.appendChild(createButton('cancel-button', 'Cancel', () => openModal(character)));
            renderTagsForEdit(character.tags || []);
            document.getElementById('edit-artwork')?.addEventListener('change', handleArtworkPreview);
            document.getElementById('record-button')?.addEventListener('click', recordAudio);
            bindMoodboardEditEvents();
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
            let moodboardDisplay = '';
            if (character.moodboardMedia && character.moodboardMedia.length > 0) {
                const items = character.moodboardMedia.map(media => {
                    if (media.type === 'video_link') {
                        return `<div class="moodboard-item"><iframe src="${media.urlOrId}" frameborder="0" allowfullscreen></iframe></div>`;
                    } else if (media.objectUrl) {
                        return `<div class="moodboard-item"><img src="${media.objectUrl}" title="${media.filename || ''}"></div>`;
                    }
                    return '';
                }).join('');
                moodboardDisplay = `
                    <div class="collapsible-section" style="margin-top: 20px;">
                        <h3 class="collapsible-header">Mood Board</h3>
                        <div class="collapsible-content moodboard-masonry" style="display: none;">
                            ${items}
                        </div>
                    </div>
                `;
            }
            modalContentElement.innerHTML = `
                <h2>${character.name}</h2>
                <div class="modal-artwork-container">
                    ${artworkDisplay}
                    <p><strong>Description:</strong> ${character.description}</p>
                </div>
                <p><strong>Voice:</strong> ${character.voice_description}</p>
                <div class="voice-sliders-container" style="margin: 15px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Low Pitch</span><span>High Pitch</span></label>
                            <input type="range" min="1" max="100" value="${character.pitch ?? 50}" style="width: 100%;" disabled>
                        </div>
                        <div>
                            <label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Slow Pace</span><span>Fast Pace</span></label>
                            <input type="range" min="1" max="100" value="${character.pace ?? 50}" style="width: 100%;" disabled>
                        </div>
                        <div>
                            <label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Chest Placement</span><span>Nasal Placement</span></label>
                            <input type="range" min="1" max="100" value="${character.placement ?? 50}" style="width: 100%;" disabled>
                        </div>
                        <div>
                            <label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Gravelly Timbre</span><span>Smooth Timbre</span></label>
                            <input type="range" min="1" max="100" value="${character.timbre ?? 50}" style="width: 100%;" disabled>
                        </div>
                    </div>
                </div>
                ${tagsDisplay}
                ${audioPlayer}
                ${moodboardDisplay}
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
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <select id="character-project" style="flex: 1;"><option value="">No Project</option>${projectOptions}</select>
                <input id="edit-name" style="flex: 2;" placeholder="Character Name" />
            </div>
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
            <div class="voice-sliders-container" style="margin: 15px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label for="edit-pitch" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Low Pitch</span><span>High Pitch</span></label>
                        <input type="range" id="edit-pitch" min="1" max="100" value="50" style="width: 100%;">
                    </div>
                    <div>
                        <label for="edit-pace" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Slow Pace</span><span>Fast Pace</span></label>
                        <input type="range" id="edit-pace" min="1" max="100" value="50" style="width: 100%;">
                    </div>
                    <div>
                        <label for="edit-placement" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Chest Placement</span><span>Nasal Placement</span></label>
                        <input type="range" id="edit-placement" min="1" max="100" value="50" style="width: 100%;">
                    </div>
                    <div>
                        <label for="edit-timbre" style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Gravelly Timbre</span><span>Smooth Timbre</span></label>
                        <input type="range" id="edit-timbre" min="1" max="100" value="50" style="width: 100%;">
                    </div>
                </div>
            </div>
            <p><strong>Voice Sample:</strong></p>
            <div id="recording-status"></div>
            <button id="record-button" class="record-button">● Record</button>
            <div id="character-audio-preview" style="display: none; margin-top: 10px; align-items: center; gap: 5px;">
                <audio id="character-audio-player" controls controlsList="nodownload" style="flex: 1; height: 30px;"></audio>
                <span id="character-download-sample" style="cursor: pointer; font-size: 1.2rem;" title="Download Sample">💾</span>
            </div>
            <p><strong>Tags:</strong></p>
            <div id="tag-container"></div>
            <input id="tag-input" placeholder="Add tags (space-separated)">
            ${moodboardEditHtml}
            <div class="modal-footer"></div>
        `;
        const footer = modalContentElement.querySelector('.modal-footer');
        footer?.appendChild(createButton('save-button', 'Save', () => saveCharacterHandler(null)));
        renderTagsForEdit([]);
        document.getElementById('edit-artwork')?.addEventListener('change', handleArtworkPreview);
        document.getElementById('record-button')?.addEventListener('click', recordAudio);
        bindMoodboardEditEvents();
    }
    
    // Bind collapsible headers
    modalContentElement.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling as HTMLElement;
            if (content) {
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            }
        });
    });

    modalElement.classList.remove('hidden');
    
    // Background click to close
    modalElement.onclick = (e) => {
        if (e.target === modalElement) closeModal();
    };
}

export function closeModal() {
    if (!modalElement) return;
    modalElement.classList.add('hidden');
}

let recordedSample: string | undefined;
let characterMediaRecorder: MediaRecorder | null = null;
let characterAudioChunks: Blob[] = [];
let characterAudioStream: MediaStream | null = null;

async function recordAudio() {
    const statusEl = document.getElementById('recording-status');
    const recordBtn = document.getElementById('record-button') as HTMLButtonElement;
    const previewContainer = document.getElementById('character-audio-preview');
    const player = document.getElementById('character-audio-player') as HTMLAudioElement;
    const downloadBtn = document.getElementById('character-download-sample');
    
    if (!statusEl || !recordBtn) return;

    if (characterMediaRecorder && characterMediaRecorder.state === 'recording') {
        // Stop recording
        characterMediaRecorder.stop();
        if (characterAudioStream) {
            characterAudioStream.getTracks().forEach(track => track.stop());
            characterAudioStream = null;
        }
        recordBtn.textContent = '● Record';
        recordBtn.classList.remove('recording');
        statusEl.textContent = 'Recording finished. Click Save.';
        return;
    }

    try {
        characterAudioChunks = [];
        characterAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        characterMediaRecorder = new MediaRecorder(characterAudioStream);
        
        characterMediaRecorder.ondataavailable = e => characterAudioChunks.push(e.data);
        characterMediaRecorder.onstop = () => {
            const blob = new Blob(characterAudioChunks, { type: 'audio/webm' });
            if (previewContainer && player && downloadBtn) {
                previewContainer.style.display = 'flex';
                player.src = URL.createObjectURL(blob);
                
                // Set up download button
                downloadBtn.onclick = async () => {
                    const settings = loadFromLocalStorage().settings;
                    const ext = settings.exportFormat || 'webm';
                    let exportBlob = blob;
                    if (ext === 'wav') {
                        exportBlob = await convertWebMToWav(blob);
                    }
                    const url = URL.createObjectURL(exportBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    const nameInput = document.getElementById('edit-name') || document.getElementById('new-name');
                    const charName = nameInput ? (nameInput as HTMLInputElement).value : 'character';
                    a.download = `${charName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sample.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                };
            }
            const reader = new FileReader();
            reader.onload = () => {
                recordedSample = reader.result as string;
            };
            reader.readAsDataURL(blob);
        };
        
        characterMediaRecorder.start();
        recordBtn.textContent = '■ Stop';
        recordBtn.classList.add('recording');
        statusEl.textContent = 'Recording...';
        if (previewContainer) previewContainer.style.display = 'none';
        
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

import { saveImageBlob } from './indexeddb.js';

function bindMoodboardEditEvents() {
    renderMoodboardEditGrid();

    document.getElementById('moodboard-upload')?.addEventListener('change', async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const id = await saveImageBlob(file);
            currentMoodboardMedia.push({
                id: 'img_' + Date.now() + Math.random(),
                type: 'image',
                urlOrId: id,
                filename: file.name,
                objectUrl: URL.createObjectURL(file)
            });
        }
        renderMoodboardEditGrid();
    });

    document.getElementById('moodboard-link-btn')?.addEventListener('click', () => {
        const input = document.getElementById('moodboard-link-input') as HTMLInputElement;
        const url = input.value.trim();
        if (!url) return;
        
        let embedUrl = url;
        // Basic YouTube conversion
        if (url.includes('youtube.com/watch?v=')) {
            const vidId = new URL(url).searchParams.get('v');
            if (vidId) embedUrl = `https://www.youtube.com/embed/${vidId}`;
        } else if (url.includes('youtu.be/')) {
            const vidId = url.split('youtu.be/')[1].split('?')[0];
            if (vidId) embedUrl = `https://www.youtube.com/embed/${vidId}`;
        }

        currentMoodboardMedia.push({
            id: 'vid_' + Date.now() + Math.random(),
            type: 'video_link',
            urlOrId: embedUrl
        });
        input.value = '';
        renderMoodboardEditGrid();
    });
}

function renderMoodboardEditGrid() {
    const grid = document.getElementById('moodboard-edit-grid');
    if (!grid) return;
    grid.innerHTML = currentMoodboardMedia.map((media, index) => {
        let content = '';
        if (media.type === 'video_link') {
            content = `<iframe src="${media.urlOrId}" frameborder="0" allowfullscreen style="width: 100%; border-radius: 8px;"></iframe>`;
        } else if (media.objectUrl) {
            content = `<img src="${media.objectUrl}" title="${media.filename || ''}" style="width: 100%; border-radius: 8px;">`;
        }
        return `
            <div class="moodboard-item" style="position: relative; margin-bottom: 15px; break-inside: avoid;">
                ${content}
                <button data-index="${index}" class="delete-moodboard-item" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.delete-moodboard-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute('data-index') || '0');
            currentMoodboardMedia.splice(idx, 1);
            renderMoodboardEditGrid();
        });
    });
}

async function saveCharacterHandler(characterId: number | null) {
    const name = (document.getElementById('edit-name') as HTMLInputElement).value;
    const description = (document.getElementById('edit-description') as HTMLTextAreaElement).value;
    const voice_description = (document.getElementById('edit-voice') as HTMLTextAreaElement).value;
    
    const artworkFile = (document.getElementById('edit-artwork') as HTMLInputElement).files?.[0];
    const projectId = parseInt((document.getElementById('character-project') as HTMLSelectElement).value);
    const tagElements = document.querySelectorAll('#tag-container .tag-item');
    const tags = Array.from(tagElements).map(el => el.textContent?.replace(/×$/, '').trim() || '').filter(Boolean);
    const pitch = parseInt((document.getElementById('edit-pitch') as HTMLInputElement)?.value || '50', 10);
    const pace = parseInt((document.getElementById('edit-pace') as HTMLInputElement)?.value || '50', 10);
    const placement = parseInt((document.getElementById('edit-placement') as HTMLInputElement)?.value || '50', 10);
    const timbre = parseInt((document.getElementById('edit-timbre') as HTMLInputElement)?.value || '50', 10);

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
        pitch: pitch,
        pace: pace,
        placement: placement,
        timbre: timbre,
        moodboardMedia: currentMoodboardMedia
    };

    await saveCharacterCallback(characterToSave, artworkFile, undefined, recordedSample);
}
