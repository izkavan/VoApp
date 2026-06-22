import { Character } from '../types.js';
import { html, HtmlSanitizer } from '../services/HtmlSanitizer.js';
import { AudioService } from '../services/AudioService.js';
import { saveImageBlob } from '../services/indexeddb.js';
import { DataStore } from '../services/DataStore.js';
import { convertWebMToWav } from '../utils/audio-utils.js';

/**
 * Massive Web Component acting as the central Character edit and view modal.
 * Manages complex state including dragging in artwork, recording live voice samples, 
 * editing voice recipes, and building visual moodboards.
 * 
 * Methods:
 * - `open(character, isEditMode)`: Initializes the modal state and renders the overlay.
 * - `close()`: Hides the modal and cleans up active media recording streams.
 * 
 * Events:
 * - `modalClosed` (CustomEvent): Fired when the modal is closed.
 * - `saveCharacter` (CustomEvent): Fired with the edited character payload, artwork files, and recorded samples.
 * - `duplicateCharacter` (CustomEvent): Fired when duplicating the currently viewed character.
 * - `deleteCharacter` (CustomEvent): Fired when deleting the currently viewed character.
 */
export class CharacterModalElement extends HTMLElement {
    private character: Character | null = null;
    private isEditMode = false;
    private currentMoodboardMedia: any[] = [];
    private recordedSample: string | undefined;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private currentTags: string[] = [];

    connectedCallback() {
        this.addEventListener('click', (e) => {
            if (e.target === this) this.close();
        });
    }

    open(character: Character | null, isEditMode: boolean) {
        this.character = character;
        this.isEditMode = isEditMode || !character;
        this.currentMoodboardMedia = character?.moodboardMedia ? [...character.moodboardMedia] : [];
        this.currentTags = character?.tags ? [...character.tags] : [];
        this.recordedSample = undefined;
        this.render();
        this.classList.remove('hidden');
    }

    close() {
        this.classList.add('hidden');
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.dispatchEvent(new CustomEvent('modalClosed'));
    }

    private render() {
        const projects = DataStore.getProjects();
        const projectOptions = projects.map(p => 
            `<option value="${p.id}" ${this.character?.projectId === p.id ? 'selected' : ''}>${html`${p.name}`}</option>`
        ).join('');

        const contentDiv = document.createElement('div');
        contentDiv.className = 'modal-content';
        contentDiv.id = 'modal-view-content';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        closeBtn.id = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.close();
        contentDiv.appendChild(closeBtn);

        const innerContent = document.createElement('div');

        if (this.isEditMode) {
            innerContent.innerHTML = this.getEditTemplate(projectOptions);
        } else {
            innerContent.innerHTML = this.getViewTemplate();
        }

        contentDiv.appendChild(innerContent);
        this.innerHTML = '';
        this.appendChild(contentDiv);

        if (this.isEditMode) {
            this.bindEditEvents();
        } else {
            this.bindViewEvents();
        }
        this.bindCollapsibles();
    }

    private getEditTemplate(projectOptions: string): string {
        const char = this.character || {} as any;
        const name = html`${char.name || ''}`;
        const desc = html`${char.description || ''}`;
        const oddities = html`${char.characterOddities || ''}`;
        const voiceDesc = html`${char.voice_description || ''}`;
        
        const artworkPreview = char.artwork ? html`<img src="${char.artwork}" class="modal-artwork-preview">` : '';

        return `
            <h2>${this.character ? 'Edit Character' : 'New Character'}</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <select id="wc-character-project" style="flex: 1;"><option value="">No Project</option>${projectOptions}</select>
                <input id="wc-edit-name" value="${name}" style="flex: 2;" placeholder="Character Name" />
            </div>
            <div class="modal-artwork-edit-container">
                <div class="artwork-input-section">
                    <p><strong>Character Artwork:</strong></p>
                    <label for="wc-edit-artwork" class="custom-file-input">Choose File</label>
                    <input type="file" id="wc-edit-artwork" accept="image/*">
                    <div id="wc-artwork-preview-container">${artworkPreview}</div>
                    <span id="wc-file-name" class="file-name">${char.artworkFilename || ''}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    <textarea id="wc-edit-description" placeholder="Character Description">${desc}</textarea>
                    <textarea id="wc-edit-oddities" placeholder="Defining artistic features; Vocal Tics, catchphrase, etc.">${oddities}</textarea>
                </div>
            </div>
            <p><strong>Voice Description:</strong></p>
            <textarea id="wc-edit-voice" placeholder="Voice Description">${voiceDesc}</textarea>
            
            <div class="voice-sliders-container" style="margin: 15px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Low Pitch</span><span>High Pitch</span></label>
                        <input type="range" id="wc-edit-pitch" min="1" max="100" value="${char.pitch ?? 50}" style="width: 100%;">
                    </div>
                    <div>
                        <label style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Slow Pace</span><span>Fast Pace</span></label>
                        <input type="range" id="wc-edit-pace" min="1" max="100" value="${char.pace ?? 50}" style="width: 100%;">
                    </div>
                    <div>
                        <label style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Chest</span><span>Nasal</span></label>
                        <input type="range" id="wc-edit-placement" min="1" max="100" value="${char.placement ?? 50}" style="width: 100%;">
                    </div>
                    <div>
                        <label style="display: flex; justify-content: space-between; font-size: 0.9em;"><span>Gravelly</span><span>Smooth</span></label>
                        <input type="range" id="wc-edit-timbre" min="1" max="100" value="${char.timbre ?? 50}" style="width: 100%;">
                    </div>
                </div>
            </div>

            <p><strong>Voice Sample:</strong></p>
            <div id="wc-recording-status"></div>
            <button id="wc-record-button" class="text-record-button">● Record</button>
            <div id="wc-character-audio-preview" style="display: none; margin-top: 10px; align-items: center; gap: 5px;">
                <audio id="wc-character-audio-player" controls controlsList="nodownload" style="flex: 1; height: 30px;"></audio>
                <span id="wc-character-download-sample" style="cursor: pointer; font-size: 1.2rem;" title="Download Sample">💾</span>
            </div>

            <p><strong>Tags:</strong></p>
            <div id="wc-tag-container"></div>
            <input id="wc-tag-input" placeholder="Add tags (space-separated)">

            <div class="collapsible-section" style="margin-top: 20px;">
                <h3 class="collapsible-header">Mood Board (Edit)</h3>
                <div class="collapsible-content" style="display: none;">
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <label for="wc-moodboard-upload" class="custom-file-input" style="cursor: pointer; padding: 5px 10px; background: var(--primary-color); color: white; border-radius: 4px;">Upload Images</label>
                        <input type="file" id="wc-moodboard-upload" multiple accept="image/*" style="display: none;">
                        <input type="text" id="wc-moodboard-link-input" placeholder="Paste YouTube link here..." style="flex: 1; padding: 5px;">
                        <button id="wc-moodboard-link-btn" style="padding: 5px 10px;">Add Link</button>
                    </div>
                    <div id="wc-moodboard-edit-grid" class="moodboard-masonry"></div>
                </div>
            </div>

            <div class="modal-footer" id="wc-edit-footer">
                <button class="primary-button" id="wc-save-btn">Save</button>
                ${this.character ? '<button class="secondary-button" id="wc-cancel-btn">Cancel</button>' : ''}
            </div>
        `;
    }

    private getViewTemplate(): string {
        const char = this.character!;
        const name = html`${char.name}`;
        const desc = html`${char.description}`;
        const oddities = html`${char.characterOddities}`;
        const voiceDesc = html`${char.voice_description}`;
        
        let artworkDisplay = '';
        if (char.artwork) {
            artworkDisplay = `<img src="${char.artwork}" class="modal-artwork" title="${HtmlSanitizer.escape(char.artworkFilename || '')}">`;
        }

        let tagsDisplay = '';
        if (char.tags && char.tags.length > 0) {
            tagsDisplay = `<p><strong>Tags:</strong></p><div class="tag-view">${char.tags.map(tag => `<span class="tag-item">${HtmlSanitizer.escape(tag)}</span>`).join('')}</div>`;
        }

        let audioPlayer = '';
        if (char.voice_sample) {
            audioPlayer = `<p><strong>Voice Sample:</strong></p><audio controls src="${char.voice_sample}"></audio>`;
        }

        let moodboardDisplay = '';
        if (char.moodboardMedia && char.moodboardMedia.length > 0) {
            const items = char.moodboardMedia.map(media => {
                if (media.type === 'video_link') {
                    return html`<div class="moodboard-item"><iframe src="${media.urlOrId}" frameborder="0" allowfullscreen></iframe></div>`;
                } else if (media.objectUrl) {
                    return html`<div class="moodboard-item"><img src="${media.objectUrl}" title="${media.filename || ''}"></div>`;
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

        return `
            <h2>${name}</h2>
            <div class="modal-artwork-container">
                ${artworkDisplay}
                <div>
                    <p><strong>Description:</strong> ${desc}</p>
                    <p><strong>Oddities:</strong> ${oddities}</p>
                </div>
            </div>
            <p><strong>Voice:</strong> ${voiceDesc}</p>
            
            <div class="voice-sliders-container" style="margin: 15px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Low Pitch</span><span>High Pitch</span></label><input type="range" min="1" max="100" value="${char.pitch ?? 50}" style="width: 100%;" disabled></div>
                    <div><label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Slow Pace</span><span>Fast Pace</span></label><input type="range" min="1" max="100" value="${char.pace ?? 50}" style="width: 100%;" disabled></div>
                    <div><label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Chest</span><span>Nasal</span></label><input type="range" min="1" max="100" value="${char.placement ?? 50}" style="width: 100%;" disabled></div>
                    <div><label style="display: flex; justify-content: space-between; font-size: 0.9em; color: #aaa;"><span>Gravelly</span><span>Smooth</span></label><input type="range" min="1" max="100" value="${char.timbre ?? 50}" style="width: 100%;" disabled></div>
                </div>
            </div>

            ${tagsDisplay}
            ${audioPlayer}
            ${moodboardDisplay}
            
            <div class="modal-footer" id="wc-view-footer">
                <button class="primary-button" id="wc-edit-btn">Edit</button>
                <button class="secondary-button" id="wc-dup-btn">Duplicate</button>
                <button class="delete-button" id="wc-del-btn">Delete</button>
            </div>
        `;
    }

    private bindViewEvents() {
        this.querySelector('#wc-edit-btn')?.addEventListener('click', () => this.open(this.character, true));
        this.querySelector('#wc-dup-btn')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('duplicateCharacter', { detail: this.character }));
        });
        this.querySelector('#wc-del-btn')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('deleteCharacter', { detail: this.character!.id }));
        });
    }

    private bindEditEvents() {
        this.querySelector('#wc-save-btn')?.addEventListener('click', () => this.saveCharacterHandler());
        this.querySelector('#wc-cancel-btn')?.addEventListener('click', () => this.open(this.character, false));
        
        this.querySelector('#wc-edit-artwork')?.addEventListener('change', (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const container = this.querySelector('#wc-artwork-preview-container');
                    if (container) container.innerHTML = `<img src="${re.target?.result}" class="modal-artwork-preview">`;
                };
                reader.readAsDataURL(file);
                const nameEl = this.querySelector('#wc-file-name');
                if (nameEl) nameEl.textContent = file.name;
            }
        });

        this.querySelector('#wc-record-button')?.addEventListener('click', () => this.recordAudio());
        
        this.renderTagsForEdit();
        this.renderMoodboardEditGrid();

        this.querySelector('#wc-moodboard-upload')?.addEventListener('change', async (e: Event) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files) return;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const id = await saveImageBlob(file);
                this.currentMoodboardMedia.push({
                    id: 'img_' + Date.now() + Math.random(),
                    type: 'image',
                    urlOrId: id,
                    filename: file.name,
                    objectUrl: URL.createObjectURL(file)
                });
            }
            this.renderMoodboardEditGrid();
        });

        this.querySelector('#wc-moodboard-link-btn')?.addEventListener('click', () => {
            const input = this.querySelector('#wc-moodboard-link-input') as HTMLInputElement;
            const url = input.value.trim();
            if (!url) return;
            
            let embedUrl = url;
            if (url.includes('youtube.com/watch?v=')) {
                const vidId = new URL(url).searchParams.get('v');
                if (vidId) embedUrl = `https://www.youtube.com/embed/${vidId}`;
            } else if (url.includes('youtu.be/')) {
                const vidId = url.split('youtu.be/')[1].split('?')[0];
                if (vidId) embedUrl = `https://www.youtube.com/embed/${vidId}`;
            }

            this.currentMoodboardMedia.push({
                id: 'vid_' + Date.now() + Math.random(),
                type: 'video_link',
                urlOrId: embedUrl
            });
            input.value = '';
            this.renderMoodboardEditGrid();
        });
    }

    private bindCollapsibles() {
        this.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const content = header.nextElementSibling as HTMLElement;
                if (content) {
                    content.style.display = content.style.display === 'block' ? 'none' : 'block';
                }
            });
        });
    }

    private renderTagsForEdit() {
        const container = this.querySelector('#wc-tag-container');
        const input = this.querySelector('#wc-tag-input') as HTMLInputElement;
        if (!container || !input) return;

        const updateTagsDisplay = () => {
            container.innerHTML = '';
            this.currentTags.forEach((tag, index) => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag-item';
                tagEl.textContent = tag;
                const closeEl = document.createElement('span');
                closeEl.className = 'tag-close';
                closeEl.innerHTML = '&times;';
                closeEl.addEventListener('click', () => {
                    this.currentTags.splice(index, 1);
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
                    if (t && !this.currentTags.includes(t)) {
                        this.currentTags.push(t);
                    }
                });
                input.value = '';
                updateTagsDisplay();
            }
        });
        updateTagsDisplay();
    }

    private renderMoodboardEditGrid() {
        const grid = this.querySelector('#wc-moodboard-edit-grid');
        if (!grid) return;
        
        grid.innerHTML = this.currentMoodboardMedia.map((media, index) => {
            let content = '';
            if (media.type === 'video_link') {
                content = html`<iframe src="${media.urlOrId}" frameborder="0" allowfullscreen style="width: 100%; border-radius: 8px;"></iframe>`;
            } else if (media.objectUrl) {
                content = html`<img src="${media.objectUrl}" title="${media.filename || ''}" style="width: 100%; border-radius: 8px;">`;
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
                this.currentMoodboardMedia.splice(idx, 1);
                this.renderMoodboardEditGrid();
            });
        });
    }

    private async recordAudio() {
        const statusEl = this.querySelector('#wc-recording-status');
        const recordBtn = this.querySelector('#wc-record-button') as HTMLButtonElement;
        const previewContainer = this.querySelector('#wc-character-audio-preview') as HTMLElement;
        const player = this.querySelector('#wc-character-audio-player') as HTMLAudioElement;
        const downloadBtn = this.querySelector('#wc-character-download-sample');

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            recordBtn.textContent = '● Record';
            recordBtn.classList.remove('recording');
            if (statusEl) statusEl.textContent = 'Recording finished. Click Save.';
            return;
        }

        try {
            this.audioChunks = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = AudioService.createRecorder(stream);
            
            this.mediaRecorder.addEventListener("dataavailable", e => this.audioChunks.push(e.data));
            this.mediaRecorder.addEventListener("stop", () => {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                if (previewContainer && player && downloadBtn) {
                    previewContainer.style.display = 'flex';
                    player.src = URL.createObjectURL(blob);
                    
                    downloadBtn.addEventListener('click', async () => {
                        const settings = DataStore.getSettings();
                        const ext = settings.exportFormat || 'webm';
                        let exportBlob = blob;
                        if (ext === 'wav') {
                            exportBlob = await convertWebMToWav(blob);
                        }
                        const url = URL.createObjectURL(exportBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        const nameInput = this.querySelector('#wc-edit-name') as HTMLInputElement;
                        const charName = nameInput ? nameInput.value : 'character';
                        a.download = `${charName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sample.${ext}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    });
                }
                const reader = new FileReader();
                reader.onload = () => {
                    this.recordedSample = reader.result as string;
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(track => track.stop());
            });
            
            this.mediaRecorder.start();
            recordBtn.textContent = '■ Stop';
            recordBtn.classList.add('recording');
            if (statusEl) statusEl.textContent = 'Recording...';
            if (previewContainer) previewContainer.style.display = 'none';
        } catch (err) {
            if (statusEl) statusEl.textContent = 'Could not access microphone.';
            console.error('Error recording audio:', err);
        }
    }

    private saveCharacterHandler() {
        const name = (this.querySelector('#wc-edit-name') as HTMLInputElement).value;
        const description = (this.querySelector('#wc-edit-description') as HTMLTextAreaElement).value;
        const characterOddities = (this.querySelector('#wc-edit-oddities') as HTMLTextAreaElement).value;
        const voice_description = (this.querySelector('#wc-edit-voice') as HTMLTextAreaElement).value;
        const artworkFile = (this.querySelector('#wc-edit-artwork') as HTMLInputElement).files?.[0];
        
        const projectIdVal = (this.querySelector('#wc-character-project') as HTMLSelectElement).value;
        const projectId = projectIdVal ? parseInt(projectIdVal, 10) : undefined;
        
        const pitch = parseInt((this.querySelector('#wc-edit-pitch') as HTMLInputElement)?.value || '50', 10);
        const pace = parseInt((this.querySelector('#wc-edit-pace') as HTMLInputElement)?.value || '50', 10);
        const placement = parseInt((this.querySelector('#wc-edit-placement') as HTMLInputElement)?.value || '50', 10);
        const timbre = parseInt((this.querySelector('#wc-edit-timbre') as HTMLInputElement)?.value || '50', 10);

        const idToSave = this.character?.id ?? Date.now();

        const characterToSave: Character = {
            id: idToSave,
            name,
            description,
            characterOddities,
            voice_description,
            tags: this.currentTags,
            projectId,
            artwork: this.character?.artwork,
            artworkFilename: this.character?.artworkFilename,
            voice_sample: this.character?.voice_sample,
            pitch,
            pace,
            placement,
            timbre,
            moodboardMedia: this.currentMoodboardMedia
        };

        this.dispatchEvent(new CustomEvent('saveCharacter', {
            detail: {
                character: characterToSave,
                artworkFile,
                recordedSample: this.recordedSample
            }
        }));
    }
}

customElements.define('character-modal', CharacterModalElement);
