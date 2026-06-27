import { Character, Project, Warmup, SystemSettings } from '../types.js';
import { loadFromLocalStorage } from '../services/storage.js';
import { convertWebMToWav } from '../utils/audio-utils.js';

let currentWarmups: Warmup[] = [];
let currentCharacters: Character[] = [];
let currentProjects: Project[] = [];
let onSaveCallback: (warmups: Warmup[]) => void;

let editingWarmupId: number | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export function refreshWarmupView(projects: Project[], characters: Character[]) {
    currentProjects = projects;
    currentCharacters = characters;

    const projectSelect = document.getElementById('warmup-project-select') as HTMLSelectElement;
    if (projectSelect) {
        const currentVal = projectSelect.value;
        projectSelect.innerHTML = `<option value="none">-- Filter by Project --</option>`;
        currentProjects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id.toString();
            opt.textContent = p.name;
            projectSelect.appendChild(opt);
        });
        projectSelect.value = currentVal;
    }

    const characterSelect = document.getElementById('warmup-character-select') as HTMLSelectElement;
    if (characterSelect) {
        const currentVal = characterSelect.value;
        characterSelect.innerHTML = `<option value="none">-- Filter by Character --</option>`;
        currentCharacters.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id.toString();
            opt.textContent = c.name;
            characterSelect.appendChild(opt);
        });
        characterSelect.value = currentVal;
    }

    const modalCharSelect = document.getElementById('warmup-modal-character-select') as HTMLSelectElement;
    if (modalCharSelect) {
        const currentVal = modalCharSelect.value;
        modalCharSelect.innerHTML = '<option value="none">-- Select Character --</option>';
        currentCharacters.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id.toString();
            opt.textContent = c.name;
            modalCharSelect.appendChild(opt);
        });
        modalCharSelect.value = currentVal;
    }
}

export function initializeWarmupView(
    warmups: Warmup[],
    characters: Character[],
    projects: Project[],
    onSave: (warmups: Warmup[]) => void
) {
    currentWarmups = warmups;
    currentCharacters = characters;
    currentProjects = projects;
    onSaveCallback = onSave;

    setupFilters();
    renderWarmupGrid();
    setupModalEvents();
}

function setupFilters() {
    const searchInput = document.getElementById('warmup-tag-search') as HTMLInputElement;
    const ratingCheckboxes = document.querySelectorAll('.warmup-rating-cb') as NodeListOf<HTMLInputElement>;
    const projectSelect = document.getElementById('warmup-project-select') as HTMLSelectElement;
    const characterSelect = document.getElementById('warmup-character-select') as HTMLSelectElement;
    const newBtn = document.getElementById('new-warmup-button') as HTMLButtonElement;

    searchInput.addEventListener('input', renderWarmupGrid);
    ratingCheckboxes.forEach(cb => cb.addEventListener('change', renderWarmupGrid));
    
    // Populate project select
    projectSelect.innerHTML = `<option value="none">-- Filter by Project --</option>`;
    currentProjects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id.toString();
        opt.textContent = p.name;
        projectSelect.appendChild(opt);
    });

    projectSelect.addEventListener('change', () => {
        populateCharacterSelect(projectSelect.value);
        renderWarmupGrid();
    });

    characterSelect.addEventListener('change', renderWarmupGrid);
    
    newBtn.addEventListener('click', () => {
        openWarmupModal(null);
    });

    populateCharacterSelect('none');
}

function populateCharacterSelect(projectIdStr: string) {
    const characterSelect = document.getElementById('warmup-character-select') as HTMLSelectElement;
    characterSelect.innerHTML = `<option value="none">-- Filter by Character --</option>`;
    
    let chars = currentCharacters;
    if (projectIdStr !== 'none') {
        const pId = parseInt(projectIdStr);
        chars = chars.filter(c => c.projectId === pId);
    }

    chars.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id.toString();
        opt.textContent = c.name;
        characterSelect.appendChild(opt);
    });
}

function renderWarmupGrid() {
    const grid = document.getElementById('warmup-cards-grid');
    if (!grid) return;

    const searchStr = (document.getElementById('warmup-tag-search') as HTMLInputElement).value.toLowerCase();
    
    // Get checked ratings
    const ratingCheckboxes = document.querySelectorAll('.warmup-rating-cb:checked') as NodeListOf<HTMLInputElement>;
    const allowedRatings = Array.from(ratingCheckboxes).map(cb => parseInt(cb.value));

    const characterSelectVal = (document.getElementById('warmup-character-select') as HTMLSelectElement).value;
    const projectSelectVal = (document.getElementById('warmup-project-select') as HTMLSelectElement).value;

    grid.innerHTML = '';

    currentWarmups.forEach(warmup => {
        // Filter by rating
        if (!allowedRatings.includes(warmup.rating)) return;

        // Filter by tag search (partial match)
        if (searchStr) {
            const matchesTag = warmup.tags.some(tag => tag.toLowerCase().includes(searchStr));
            if (!matchesTag) return;
        }

        // Filter by character
        if (characterSelectVal !== 'none') {
            const cId = parseInt(characterSelectVal);
            if (!warmup.characterIds.includes(cId)) return;
        } else if (projectSelectVal !== 'none') {
            // Filter by project (must have at least one character from this project)
            const pId = parseInt(projectSelectVal);
            const projectCharIds = currentCharacters.filter(c => c.projectId === pId).map(c => c.id);
            const hasProjectChar = warmup.characterIds.some(cId => projectCharIds.includes(cId));
            if (!hasProjectChar) return;
        }

        const card = document.createElement('div');
        card.className = 'warmup-card';
        
        let tagsHtml = warmup.tags.map(t => `<span class="warmup-card-tag">${t}</span>`).join('');
        
        // Characters footer
        let charsHtml = '';
        const displayChars = warmup.characterIds.slice(0, 5);
        if (displayChars.length > 0) {
            charsHtml = `<div class="warmup-card-characters">`;
            displayChars.forEach(cId => {
                const char = currentCharacters.find(c => c.id === cId);
                if (char) {
                    if (char.artwork) {
                        charsHtml += `<img src="${char.artwork}" class="warmup-card-char-icon" title="${char.name}" />`;
                    } else {
                        charsHtml += `<div class="warmup-card-char-icon" style="display:flex;align-items:center;justify-content:center;font-size:10px;" title="${char.name}">${char.name.charAt(0)}</div>`;
                    }
                }
            });
            if (warmup.characterIds.length > 5) {
                charsHtml += `<div class="warmup-card-char-icon" style="display:flex;align-items:center;justify-content:center;font-size:10px;">+${warmup.characterIds.length - 5}</div>`;
            }
            charsHtml += `</div>`;
        }

        card.innerHTML = `
            <div class="warmup-card-header">
                <span class="warmup-card-rating">${warmup.rating}★</span>
                <h3 class="warmup-card-title">${warmup.title}</h3>
            </div>
            <div class="warmup-card-tags">${tagsHtml}</div>
            <p class="warmup-card-text">${warmup.text}</p>
            ${charsHtml}
        `;

        card.addEventListener('click', () => openWarmupModal(warmup));
        grid.appendChild(card);
    });
}

function setupModalEvents() {
    const modal = document.getElementById('warmup-modal');
    const closeBtn = document.getElementById('warmup-modal-close');
    const editBtn = document.getElementById('warmup-modal-edit-btn');
    const saveBtn = document.getElementById('warmup-modal-save-btn');
    const deleteBtn = document.getElementById('warmup-modal-delete-btn');
    const addCharBtn = document.getElementById('warmup-modal-add-character');
    const ratingDiv = document.getElementById('warmup-modal-rating');

    closeBtn?.addEventListener('click', closeWarmupModal);
    
    // Click outside to close
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeWarmupModal();
        }
    });

    editBtn?.addEventListener('click', () => setModalEditMode(true));
    saveBtn?.addEventListener('click', saveModalChanges);
    deleteBtn?.addEventListener('click', deleteCurrentWarmup);
    addCharBtn?.addEventListener('click', attachCharacterToWarmup);

    // Rating star clicks
    ratingDiv?.addEventListener('click', (e) => {
        // Calculate 0 to 5 based on click position relative to width
        const rect = ratingDiv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        let newRating = Math.ceil(percent * 5);
        if (newRating < 0) newRating = 0;
        if (newRating > 5) newRating = 5;
        
        renderStars(newRating);
        if (editingWarmupId) {
            const w = currentWarmups.find(w => w.id === editingWarmupId);
            if (w) {
                w.rating = newRating;
                onSaveCallback(currentWarmups);
                renderWarmupGrid();
            }
        } else {
            // New warmup rating state
            ratingDiv.setAttribute('data-rating', newRating.toString());
        }
    });

    setupAudioRecorder();
}

function openWarmupModal(warmup: Warmup | null) {
    const modal = document.getElementById('warmup-modal') as HTMLElement;
    modal.classList.remove('hidden');

    // reset audio
    const preview = document.getElementById('warmup-audio-preview') as HTMLElement;
    preview.innerHTML = '';

    populateModalCharacterSelect();

    if (warmup) {
        editingWarmupId = warmup.id;
        document.getElementById('warmup-modal-title')!.textContent = warmup.title;
        (document.getElementById('warmup-modal-title-input') as HTMLInputElement).value = warmup.title;
        
        document.getElementById('warmup-modal-text')!.textContent = warmup.text;
        (document.getElementById('warmup-modal-text-input') as HTMLTextAreaElement).value = warmup.text;
        
        renderTags(warmup.tags);
        (document.getElementById('warmup-modal-tags-input') as HTMLInputElement).value = warmup.tags.join(', ');
        
        renderStars(warmup.rating);
        renderAttachedCharacters(warmup.characterIds);
        
        setModalEditMode(false);
    } else {
        editingWarmupId = null;
        document.getElementById('warmup-modal-title')!.textContent = 'New Warmup';
        (document.getElementById('warmup-modal-title-input') as HTMLInputElement).value = '';
        
        document.getElementById('warmup-modal-text')!.textContent = '';
        (document.getElementById('warmup-modal-text-input') as HTMLTextAreaElement).value = '';
        
        renderTags([]);
        (document.getElementById('warmup-modal-tags-input') as HTMLInputElement).value = '';
        
        renderStars(0);
        document.getElementById('warmup-modal-rating')!.setAttribute('data-rating', '0');
        renderAttachedCharacters([]);
        
        setModalEditMode(true);
    }
}

function closeWarmupModal() {
    const modal = document.getElementById('warmup-modal') as HTMLElement;
    modal.classList.add('hidden');
    
    // Stop recording if active
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        mediaRecorder = null;
        const btn = document.getElementById('warmup-record-button');
        if (btn) {
            btn.classList.remove('recording');
            btn.textContent = '●';
        }
    }
}

function setModalEditMode(isEditing: boolean) {
    const titleEl = document.getElementById('warmup-modal-title')!;
    const titleInp = document.getElementById('warmup-modal-title-input')!;
    const textEl = document.getElementById('warmup-modal-text')!;
    const textInp = document.getElementById('warmup-modal-text-input')!;
    const tagsEl = document.getElementById('warmup-modal-tags')!;
    const tagsInp = document.getElementById('warmup-modal-tags-input')!;
    const editBtn = document.getElementById('warmup-modal-edit-btn')!;
    const saveBtn = document.getElementById('warmup-modal-save-btn')!;

    if (isEditing) {
        titleEl.classList.add('hidden');
        titleInp.classList.remove('hidden');
        textEl.classList.add('hidden');
        textInp.classList.remove('hidden');
        tagsEl.classList.add('hidden');
        tagsInp.classList.remove('hidden');
        editBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
    } else {
        titleEl.classList.remove('hidden');
        titleInp.classList.add('hidden');
        textEl.classList.remove('hidden');
        textInp.classList.add('hidden');
        tagsEl.classList.remove('hidden');
        tagsInp.classList.add('hidden');
        editBtn.classList.remove('hidden');
        saveBtn.classList.add('hidden');
    }
}

function saveModalChanges() {
    const title = (document.getElementById('warmup-modal-title-input') as HTMLInputElement).value.trim();
    const text = (document.getElementById('warmup-modal-text-input') as HTMLTextAreaElement).value.trim();
    const tagsStr = (document.getElementById('warmup-modal-tags-input') as HTMLInputElement).value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    if (!title) {
        alert("Title is required.");
        return;
    }

    if (editingWarmupId) {
        const w = currentWarmups.find(w => w.id === editingWarmupId);
        if (w) {
            w.title = title;
            w.text = text;
            w.tags = tags;
        }
    } else {
        const ratingStr = document.getElementById('warmup-modal-rating')?.getAttribute('data-rating') || '0';
        const newW: Warmup = {
            id: Date.now(),
            title,
            text,
            rating: parseInt(ratingStr),
            tags,
            characterIds: []
        };
        currentWarmups.push(newW);
        editingWarmupId = newW.id; // Switch to editing
    }

    onSaveCallback(currentWarmups);
    renderWarmupGrid();
    
    // Update view values
    const w = currentWarmups.find(w => w.id === editingWarmupId);
    if (w) {
        document.getElementById('warmup-modal-title')!.textContent = w.title;
        document.getElementById('warmup-modal-text')!.textContent = w.text;
        renderTags(w.tags);
    }
    
    setModalEditMode(false);
}

function deleteCurrentWarmup() {
    if (!editingWarmupId) {
        closeWarmupModal();
        return;
    }
    if (confirm("Are you sure you want to delete this warmup?")) {
        const idx = currentWarmups.findIndex(w => w.id === editingWarmupId);
        if (idx !== -1) {
            currentWarmups.splice(idx, 1);
            onSaveCallback(currentWarmups);
            renderWarmupGrid();
            closeWarmupModal();
        }
    }
}

function renderStars(rating: number) {
    const div = document.getElementById('warmup-modal-rating');
    if (!div) return;
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= rating ? '★' : '☆';
    }
    div.innerHTML = html;
}

function renderTags(tags: string[]) {
    const div = document.getElementById('warmup-modal-tags');
    if (!div) return;
    div.innerHTML = tags.map(t => `<span class="warmup-card-tag">${t}</span>`).join('');
}

function populateModalCharacterSelect() {
    const sel = document.getElementById('warmup-modal-character-select') as HTMLSelectElement;
    sel.innerHTML = '<option value="none">-- Select Character to Add --</option>';
    currentCharacters.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id.toString();
        opt.textContent = c.name;
        sel.appendChild(opt);
    });
}

function renderAttachedCharacters(charIds: number[]) {
    const container = document.getElementById('warmup-modal-character-list');
    if (!container) return;
    container.innerHTML = '';

    charIds.forEach(id => {
        const char = currentCharacters.find(c => c.id === id);
        if (!char) return;

        const tag = document.createElement('div');
        tag.className = 'warmup-attached-char';

        let icon = '';
        if (char.artwork) {
            icon = `<img src="${char.artwork}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;">`;
        }
        
        tag.innerHTML = `
            ${icon}
            <span style="font-size: 0.9rem;">${char.name}</span>
            <span class="remove-char" style="cursor:pointer; color: var(--danger-color); font-weight:bold; margin-left: 5px;">&times;</span>
        `;

        tag.querySelector('.remove-char')?.addEventListener('click', () => {
            if (!editingWarmupId) return;
            const w = currentWarmups.find(w => w.id === editingWarmupId);
            if (w) {
                w.characterIds = w.characterIds.filter(cId => cId !== id);
                onSaveCallback(currentWarmups);
                renderAttachedCharacters(w.characterIds);
                renderWarmupGrid();
            }
        });

        container.appendChild(tag);
    });
}

function attachCharacterToWarmup() {
    if (!editingWarmupId) {
        alert("Please save the warmup first before attaching characters.");
        return;
    }
    const sel = document.getElementById('warmup-modal-character-select') as HTMLSelectElement;
    const charId = parseInt(sel.value);
    if (isNaN(charId)) return;

    const w = currentWarmups.find(w => w.id === editingWarmupId);
    if (w && !w.characterIds.includes(charId)) {
        w.characterIds.push(charId);
        onSaveCallback(currentWarmups);
        renderAttachedCharacters(w.characterIds);
        renderWarmupGrid();
    }
    sel.value = 'none';
}

function setupAudioRecorder() {
    const recordBtn = document.getElementById('warmup-record-button') as HTMLButtonElement;
    const statusText = document.getElementById('warmup-record-status') as HTMLElement;
    const previewDiv = document.getElementById('warmup-audio-preview') as HTMLElement;

    recordBtn.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            recordBtn.classList.remove('recording');
            recordBtn.textContent = '●';
            statusText.textContent = 'Ready to record';
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    const audioContainer = document.createElement('div');
                    audioContainer.style.display = 'flex';
                    audioContainer.style.alignItems = 'center';
                    audioContainer.style.gap = '5px';
                    audioContainer.style.marginTop = '10px';
                    
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.setAttribute('controlsList', 'nodownload');
                    audio.src = audioUrl;
                    audio.style.flex = '1';
                    
                    const downloadBtn = document.createElement('span');
                    downloadBtn.textContent = '💾';
                    downloadBtn.title = 'Download Warmup';
                    downloadBtn.style.cursor = 'pointer';
                    downloadBtn.style.fontSize = '1.2rem';
                    
                    downloadBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const settings = loadFromLocalStorage().settings;
                        const ext = settings.exportFormat || 'webm';
                        let exportBlob = audioBlob;
                        if (ext === 'wav') {
                            exportBlob = await convertWebMToWav(audioBlob);
                        }
                        const url = URL.createObjectURL(exportBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `warmup_take_${Date.now()}.${ext}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    });
                    
                    audioContainer.appendChild(audio);
                    audioContainer.appendChild(downloadBtn);
                    
                    previewDiv.innerHTML = '';
                    previewDiv.appendChild(audioContainer);
                };

                mediaRecorder.start();
                recordBtn.classList.add('recording');
                recordBtn.textContent = '■';
                statusText.textContent = 'Recording...';
                previewDiv.innerHTML = '';
            } catch (err) {
                console.error("Error accessing microphone", err);
                statusText.textContent = 'Microphone access denied';
            }
        }
    });
}
