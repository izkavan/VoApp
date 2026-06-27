import { Effect, Character, Project, SystemSettings } from '../types.js';
import { getEffects, saveEffect, updateEffect, deleteEffect } from '../services/indexeddb.js';
import JSZip from 'jszip';
import { convertWebMToWav } from '../utils/audio-utils.js';
import { openEditAudioModal } from './edit-audio-modal.js';

let currentEffects: Effect[] = [];
let currentCharacters: Character[] = [];
let currentProjects: Project[] = [];
let currentSettings: SystemSettings;
let onSaveSettingsCallback: (settings: SystemSettings) => void;

let editingEffectId: number | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let currentRecordingBlob: Blob | null = null;
let currentModalTags: string[] = [];

const selectedEffectIds = new Set<number>();

export function refreshEffectLibraryView(projects: Project[], characters: Character[]) {
    currentProjects = projects;
    currentCharacters = characters;

    const projectSelect = document.getElementById('effect-project-select') as HTMLSelectElement;
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

    const characterSelect = document.getElementById('effect-character-select') as HTMLSelectElement;
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
    
    // Also the modal dropdowns
    const modalProjSelect = document.getElementById('effect-modal-project-select') as HTMLSelectElement;
    if (modalProjSelect) {
        const currentVal = modalProjSelect.value;
        modalProjSelect.innerHTML = '<option value="none">-- Select Project --</option>';
        currentProjects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id.toString();
            opt.textContent = p.name;
            modalProjSelect.appendChild(opt);
        });
        modalProjSelect.value = currentVal;
    }

    const modalCharSelect = document.getElementById('effect-modal-character-select') as HTMLSelectElement;
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

export async function initializeEffectLibrary(
    characters: Character[],
    projects: Project[],
    settings: SystemSettings,
    onSaveSettings: (settings: SystemSettings) => void
) {
    currentCharacters = characters;
    currentProjects = projects;
    currentSettings = settings;
    onSaveSettingsCallback = onSaveSettings;

    // Load effects from IndexedDB
    currentEffects = await getEffects();

    setupFilters();
    renderEffectGrid();
    setupModalEvents();
}

function setupFilters() {
    const searchInput = document.getElementById('effect-tag-search') as HTMLInputElement;
    const groupSelect = document.getElementById('effect-group-select') as HTMLSelectElement;
    const projectSelect = document.getElementById('effect-project-select') as HTMLSelectElement;
    const characterSelect = document.getElementById('effect-character-select') as HTMLSelectElement;
    const clearBtn = document.getElementById('effect-clear-filters-btn') as HTMLButtonElement;
    const newBtn = document.getElementById('new-effect-button') as HTMLButtonElement;

    const filters = [searchInput, groupSelect, projectSelect, characterSelect];
    filters.forEach(el => el.addEventListener('input', renderEffectGrid));
    filters.forEach(el => el.addEventListener('change', renderEffectGrid));

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        groupSelect.value = 'none';
        projectSelect.value = 'none';
        characterSelect.value = 'none';
        renderEffectGrid();
    });

    newBtn.addEventListener('click', () => {
        openEffectModal(null);
    });

    setupSelectionEvents();
    populateFilterSelects();
}

function setupSelectionEvents() {
    const selectAllBtn = document.getElementById('effect-select-all-btn');
    const clearSelBtn = document.getElementById('effect-clear-selection-btn');
    const downloadBtn = document.getElementById('effect-download-btn');

    selectAllBtn?.addEventListener('click', () => {
        // Will be populated by visible effects in renderEffectGrid
        // Actually, we can just grab all rendered checkboxes
        const checkboxes = document.querySelectorAll('.effect-card-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(cb => {
            const id = parseInt(cb.dataset.id || '0');
            if (id) {
                selectedEffectIds.add(id);
                cb.checked = true;
            }
        });
        updateSelectionCount();
    });

    clearSelBtn?.addEventListener('click', () => {
        selectedEffectIds.clear();
        const checkboxes = document.querySelectorAll('.effect-card-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(cb => cb.checked = false);
        updateSelectionCount();
    });

    downloadBtn?.addEventListener('click', downloadSelectedEffects);
}

function updateSelectionCount() {
    const countSpan = document.getElementById('effect-selection-count');
    if (countSpan) {
        countSpan.textContent = `${selectedEffectIds.size} selected`;
    }
}

function populateFilterSelects() {
    const groupSelect = document.getElementById('effect-group-select') as HTMLSelectElement;
    const projectSelect = document.getElementById('effect-project-select') as HTMLSelectElement;
    const characterSelect = document.getElementById('effect-character-select') as HTMLSelectElement;

    // Groups
    groupSelect.innerHTML = `<option value="none">-- Filter by Group --</option>`;
    const groups = currentSettings.effectGroups || ['Laugh', 'Grunt', 'Pain'];
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        groupSelect.appendChild(opt);
    });

    // Projects
    projectSelect.innerHTML = `<option value="none">-- Filter by Project --</option>`;
    currentProjects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id.toString();
        opt.textContent = p.name;
        projectSelect.appendChild(opt);
    });

    // Characters
    characterSelect.innerHTML = `<option value="none">-- Filter by Character --</option>`;
    currentCharacters.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id.toString();
        opt.textContent = c.name;
        characterSelect.appendChild(opt);
    });
}

function renderEffectGrid() {
    const grid = document.getElementById('effect-cards-grid');
    if (!grid) return;

    const searchStr = (document.getElementById('effect-tag-search') as HTMLInputElement).value.toLowerCase();
    const groupVal = (document.getElementById('effect-group-select') as HTMLSelectElement).value;
    const projectVal = (document.getElementById('effect-project-select') as HTMLSelectElement).value;
    const characterVal = (document.getElementById('effect-character-select') as HTMLSelectElement).value;

    grid.innerHTML = '';

    currentEffects.forEach(effect => {
        // Filter by Tag
        if (searchStr) {
            const matchesTag = effect.tags.some(tag => tag.toLowerCase().includes(searchStr));
            if (!matchesTag) return;
        }

        // Filter by Group
        if (groupVal !== 'none' && effect.group !== groupVal) return;

        // Filter by Character
        if (characterVal !== 'none') {
            const cId = parseInt(characterVal);
            if (!effect.characterIds.includes(cId)) return;
        }

        // Filter by Project
        // "sounds that were configured to be a part of a specific project. 
        // That includes any sounds assigned to characters in those projects."
        if (projectVal !== 'none') {
            const pId = parseInt(projectVal);
            const isDirectlyInProject = effect.projectIds.includes(pId);
            const projectCharIds = currentCharacters.filter(c => c.projectId === pId).map(c => c.id);
            const isAssignedToProjectChar = effect.characterIds.some(cId => projectCharIds.includes(cId));
            
            if (!isDirectlyInProject && !isAssignedToProjectChar) return;
        }

        const card = document.createElement('div');
        card.className = 'effect-card';

        let tagsHtml = effect.tags.map(t => `<span class="warmup-card-tag">${t}</span>`).join('');
        
        let audioUrl = '';
        if (effect.blob) {
            audioUrl = URL.createObjectURL(effect.blob);
        }

        const isChecked = selectedEffectIds.has(effect.id) ? 'checked' : '';

        card.innerHTML = `
            <input type="checkbox" class="effect-card-checkbox" data-id="${effect.id}" ${isChecked}>
            <div class="effect-card-header">
                <span class="effect-card-group">${effect.group}</span>
            </div>
            <h3 class="effect-card-title">${effect.title}</h3>
            <div class="warmup-card-tags" style="margin-top: 10px;">${tagsHtml}</div>
            <div style="display: flex; align-items: center; gap: 5px; margin-top: 10px;">
                <audio class="effect-card-audio" controls controlsList="nodownload" src="${audioUrl}" style="flex: 1; height: 30px;"></audio>
                <span class="effect-download-btn" data-id="${effect.id}" style="cursor: pointer; font-size: 1.2rem;" title="Download Effect">💾</span>
            </div>
        `;

        card.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'AUDIO') return;
            if (target.classList.contains('effect-download-btn')) {
                const downloadBtn = target as HTMLElement;
                const eId = Number(downloadBtn.getAttribute('data-id'));
                const effectToDownload = currentEffects.find(eff => eff.id === eId);
                if (effectToDownload && effectToDownload.blob) {
                    const ext = currentSettings.exportFormat || 'webm';
                    let blob = effectToDownload.blob;
                    if (ext === 'wav') {
                        blob = await convertWebMToWav(blob);
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const safeTitle = effectToDownload.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    a.download = `${safeTitle}_${effectToDownload.id}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
                return;
            }
            if (target.classList.contains('effect-card-checkbox')) {
                const cb = target as HTMLInputElement;
                if (cb.checked) {
                    selectedEffectIds.add(effect.id);
                } else {
                    selectedEffectIds.delete(effect.id);
                }
                updateSelectionCount();
                return;
            }
            openEffectModal(effect);
        });

        grid.appendChild(card);
    });
    updateSelectionCount();
}

function setupModalEvents() {
    const modal = document.getElementById('effect-modal');
    const closeBtn = document.getElementById('effect-modal-close');
    const saveBtn = document.getElementById('effect-modal-save-btn');
    const deleteBtn = document.getElementById('effect-modal-delete-btn');
    const addCharBtn = document.getElementById('effect-modal-add-character');
    const addProjBtn = document.getElementById('effect-modal-add-project');
    const groupSelect = document.getElementById('effect-modal-group-select') as HTMLSelectElement;
    const newGroupInput = document.getElementById('effect-modal-new-group-input') as HTMLInputElement;
    const editAudioBtn = document.getElementById('effect-audio-edit-btn');

    closeBtn?.addEventListener('click', closeEffectModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEffectModal();
        }
    });

    saveBtn?.addEventListener('click', saveModalChanges);
    deleteBtn?.addEventListener('click', deleteCurrentEffect);
    addCharBtn?.addEventListener('click', attachCharacterToEffect);
    addProjBtn?.addEventListener('click', attachProjectToEffect);

    editAudioBtn?.addEventListener('click', () => {
        if (currentRecordingBlob) {
            openEditAudioModal(currentRecordingBlob, (newBlob) => {
                currentRecordingBlob = newBlob;
                const previewDiv = document.getElementById('effect-audio-preview');
                if (previewDiv) {
                    previewDiv.innerHTML = `<audio controls src="${URL.createObjectURL(newBlob)}" style="width: 100%;"></audio>`;
                }
            });
        }
    });

    groupSelect.addEventListener('change', () => {
        if (groupSelect.value === '_add_new_') {
            newGroupInput.classList.remove('hidden');
        } else {
            newGroupInput.classList.add('hidden');
        }
    });

    setupAudioRecorder();

    const tagsInput = document.getElementById('effect-modal-tags-input') as HTMLInputElement;
    tagsInput.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            const val = tagsInput.value.trim();
            if (val) {
                if (!currentModalTags.includes(val)) {
                    currentModalTags.push(val);
                }
                tagsInput.value = '';
                renderEffectModalTags();
            }
        }
    });
}

function renderEffectModalTags() {
    const container = document.getElementById('effect-modal-tags');
    if (!container) return;
    container.innerHTML = '';
    currentModalTags.forEach((tag, idx) => {
        const chip = document.createElement('span');
        chip.className = 'tag';
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '5px';
        chip.style.background = 'var(--bg-color-light)';
        chip.style.padding = '2px 8px';
        chip.style.borderRadius = '12px';
        chip.textContent = tag;
        
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => {
            currentModalTags.splice(idx, 1);
            renderEffectModalTags();
        });
        
        chip.appendChild(closeBtn);
        container.appendChild(chip);
    });
}

function openEffectModal(effect: Effect | null) {
    const modal = document.getElementById('effect-modal') as HTMLElement;
    modal.classList.remove('hidden');

    populateModalSelects();

    const titleInput = document.getElementById('effect-modal-title-input') as HTMLInputElement;
    const tagsInput = document.getElementById('effect-modal-tags-input') as HTMLInputElement;
    const groupSelect = document.getElementById('effect-modal-group-select') as HTMLSelectElement;
    const newGroupInput = document.getElementById('effect-modal-new-group-input') as HTMLInputElement;
    const previewDiv = document.getElementById('effect-audio-preview') as HTMLElement;
    const editBtn = document.getElementById('effect-audio-edit-btn') as HTMLButtonElement;

    newGroupInput.classList.add('hidden');
    newGroupInput.value = '';

    if (effect) {
        editingEffectId = effect.id;
        currentRecordingBlob = effect.blob;
        titleInput.value = effect.title;
        currentModalTags = [...effect.tags];
        renderEffectModalTags();
        tagsInput.value = '';
        
        if (groupSelect.querySelector(`option[value="${effect.group}"]`)) {
            groupSelect.value = effect.group;
        } else {
            groupSelect.value = '_add_new_';
            newGroupInput.classList.remove('hidden');
            newGroupInput.value = effect.group;
        }

        if (effect.blob) {
            const url = URL.createObjectURL(effect.blob);
            previewDiv.innerHTML = `<audio controls src="${url}" style="width: 100%;"></audio>`;
            editBtn.style.display = 'block';
        } else {
            previewDiv.innerHTML = '';
            editBtn.style.display = 'none';
        }

        renderAttachedLists(effect.characterIds, effect.projectIds);
    } else {
        editingEffectId = null;
        currentRecordingBlob = null;
        titleInput.value = '';
        currentModalTags = [];
        renderEffectModalTags();
        tagsInput.value = '';
        groupSelect.value = (currentSettings.effectGroups && currentSettings.effectGroups.length > 0) ? currentSettings.effectGroups[0] : '_add_new_';
        
        if (groupSelect.value === '_add_new_') {
            newGroupInput.classList.remove('hidden');
        }
        previewDiv.innerHTML = '';
        editBtn.style.display = 'none';
        renderAttachedLists([], []);
    }
}

function closeEffectModal() {
    const modal = document.getElementById('effect-modal') as HTMLElement;
    modal.classList.add('hidden');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        mediaRecorder = null;
        const btn = document.getElementById('effect-record-button');
        if (btn) {
            btn.classList.remove('recording');
            btn.textContent = '●';
        }
    }
}

async function saveModalChanges() {
    const title = (document.getElementById('effect-modal-title-input') as HTMLInputElement).value.trim();
    const tagsStr = (document.getElementById('effect-modal-tags-input') as HTMLInputElement).value.trim();
    if (tagsStr) {
        tagsStr.split(' ').forEach(t => {
            if (t.trim() && !currentModalTags.includes(t.trim())) currentModalTags.push(t.trim());
        });
    }
    const tags = [...currentModalTags];
    
    const groupSelect = document.getElementById('effect-modal-group-select') as HTMLSelectElement;
    const newGroupInput = document.getElementById('effect-modal-new-group-input') as HTMLInputElement;
    
    let group = groupSelect.value;
    if (group === '_add_new_') {
        group = newGroupInput.value.trim();
        if (!group) {
            alert("Please enter a group name.");
            return;
        }
        // Add to settings if it doesn't exist
        const groups = currentSettings.effectGroups || ['Laugh', 'Grunt', 'Pain'];
        if (!groups.includes(group)) {
            groups.push(group);
            currentSettings.effectGroups = groups;
            onSaveSettingsCallback(currentSettings);
            populateFilterSelects();
        }
    }

    if (!title) {
        alert("Title is required.");
        return;
    }

    if (!currentRecordingBlob) {
        alert("Please record an audio sample first.");
        return;
    }

    // Get temp assigned IDs from current lists in UI if we are creating new?
    // Wait, the lists are bound to `editingEffectId` logic.
    // If it's a new effect, we can read the DOM for attached IDs, but it's simpler to maintain a temporary array.
    // Let's just create an empty array, and users can add characters/projects AFTER they hit save,
    // OR we track them in temporary variables. Let's track them in the DOM attributes for simplicity,
    // or just say "Save first to attach" like in Warmups.
    
    let charIds: number[] = [];
    let projIds: number[] = [];
    
    if (editingEffectId) {
        const existing = currentEffects.find(e => e.id === editingEffectId);
        if (existing) {
            charIds = existing.characterIds;
            projIds = existing.projectIds;
        }
    } else {
        // Read from DOM if we implemented temporary tracking, but let's just initialize empty.
        // Wait, the attach logic says "Please save the effect first" for simplicity.
    }

    if (editingEffectId) {
        const e = currentEffects.find(eff => eff.id === editingEffectId);
        if (e) {
            e.title = title;
            e.tags = tags;
            e.group = group;
            e.blob = currentRecordingBlob;
            
            await updateEffect(e);
        }
    } else {
        const newE: Omit<Effect, 'id'> = {
            title,
            blob: currentRecordingBlob,
            group,
            tags,
            characterIds: [],
            projectIds: [],
            date: Date.now()
        };
        const newId = await saveEffect(newE);
        
        // Add to local array
        currentEffects.push({ ...newE, id: newId });
        editingEffectId = newId; // Switch to editing mode
    }

    currentEffects = await getEffects();
    renderEffectGrid();
    
    closeEffectModal();
}

async function deleteCurrentEffect() {
    if (!editingEffectId) {
        closeEffectModal();
        return;
    }
    if (confirm("Are you sure you want to delete this effect?")) {
        await deleteEffect(editingEffectId);
        currentEffects = currentEffects.filter(e => e.id !== editingEffectId);
        renderEffectGrid();
        closeEffectModal();
    }
}

function populateModalSelects() {
    // Groups
    const groupSelect = document.getElementById('effect-modal-group-select') as HTMLSelectElement;
    groupSelect.innerHTML = `<option value="_add_new_">-- Add New Group --</option>`;
    const groups = currentSettings.effectGroups || ['Laugh', 'Grunt', 'Pain'];
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        // Insert before the last item (Add New)
        groupSelect.insertBefore(opt, groupSelect.lastElementChild);
    });

    // Characters
    const charSelect = document.getElementById('effect-modal-character-select') as HTMLSelectElement;
    charSelect.innerHTML = '<option value="none">-- Select Character --</option>';
    currentCharacters.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id.toString();
        opt.textContent = c.name;
        charSelect.appendChild(opt);
    });

    // Projects
    const projSelect = document.getElementById('effect-modal-project-select') as HTMLSelectElement;
    projSelect.innerHTML = '<option value="none">-- Select Project --</option>';
    currentProjects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id.toString();
        opt.textContent = p.name;
        projSelect.appendChild(opt);
    });
}

function renderAttachedLists(charIds: number[], projIds: number[]) {
    const charContainer = document.getElementById('effect-modal-character-list');
    const projContainer = document.getElementById('effect-modal-project-list');
    if (!charContainer || !projContainer) return;

    charContainer.innerHTML = '';
    projContainer.innerHTML = '';

    charIds.forEach(id => {
        const char = currentCharacters.find(c => c.id === id);
        if (!char) return;

        const tag = document.createElement('div');
        tag.className = 'warmup-attached-char';
        tag.innerHTML = `
            <span style="font-size: 0.9rem;">${char.name}</span>
            <span class="remove-char" style="cursor:pointer; color: var(--danger-color); font-weight:bold; margin-left: 5px;">&times;</span>
        `;
        tag.querySelector('.remove-char')?.addEventListener('click', async () => {
            if (!editingEffectId) return;
            const e = currentEffects.find(eff => eff.id === editingEffectId);
            if (e) {
                e.characterIds = e.characterIds.filter(cId => cId !== id);
                await updateEffect(e);
                currentEffects = await getEffects();
                renderAttachedLists(e.characterIds, e.projectIds);
                renderEffectGrid();
            }
        });
        charContainer.appendChild(tag);
    });

    projIds.forEach(id => {
        const proj = currentProjects.find(p => p.id === id);
        if (!proj) return;

        const tag = document.createElement('div');
        tag.className = 'warmup-attached-char';
        tag.innerHTML = `
            <span style="font-size: 0.9rem;">${proj.name}</span>
            <span class="remove-proj" style="cursor:pointer; color: var(--danger-color); font-weight:bold; margin-left: 5px;">&times;</span>
        `;
        tag.querySelector('.remove-proj')?.addEventListener('click', async () => {
            if (!editingEffectId) return;
            const e = currentEffects.find(eff => eff.id === editingEffectId);
            if (e) {
                e.projectIds = e.projectIds.filter(pId => pId !== id);
                await updateEffect(e);
                currentEffects = await getEffects();
                renderAttachedLists(e.characterIds, e.projectIds);
                renderEffectGrid();
            }
        });
        projContainer.appendChild(tag);
    });
}

async function attachCharacterToEffect() {
    if (!editingEffectId) {
        alert("Please save the effect first before attaching characters.");
        return;
    }
    const sel = document.getElementById('effect-modal-character-select') as HTMLSelectElement;
    const charId = parseInt(sel.value);
    if (isNaN(charId)) return;

    const e = currentEffects.find(eff => eff.id === editingEffectId);
    if (e && !e.characterIds.includes(charId)) {
        e.characterIds.push(charId);
        await updateEffect(e);
        currentEffects = await getEffects();
        renderAttachedLists(e.characterIds, e.projectIds);
        renderEffectGrid();
    }
    sel.value = 'none';
}

async function attachProjectToEffect() {
    if (!editingEffectId) {
        alert("Please save the effect first before attaching projects.");
        return;
    }
    const sel = document.getElementById('effect-modal-project-select') as HTMLSelectElement;
    const projId = parseInt(sel.value);
    if (isNaN(projId)) return;

    const e = currentEffects.find(eff => eff.id === editingEffectId);
    if (e && !e.projectIds.includes(projId)) {
        e.projectIds.push(projId);
        await updateEffect(e);
        currentEffects = await getEffects();
        renderAttachedLists(e.characterIds, e.projectIds);
        renderEffectGrid();
    }
    sel.value = 'none';
}

function setupAudioRecorder() {
    const recordBtn = document.getElementById('effect-record-button') as HTMLButtonElement;
    const statusText = document.getElementById('effect-record-status') as HTMLElement;
    const previewDiv = document.getElementById('effect-audio-preview') as HTMLElement;

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
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    currentRecordingBlob = blob;

                    const editBtn = document.getElementById('effect-audio-edit-btn');
                    if (editBtn) editBtn.style.display = 'block';
                    
                    const previewDiv = document.getElementById('effect-audio-preview');
                    if (previewDiv) {
                        previewDiv.innerHTML = `<audio controls src="${URL.createObjectURL(blob)}" style="width: 100%;"></audio>`;
                    }
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

async function downloadSelectedEffects() {
    if (selectedEffectIds.size === 0) {
        alert("No effects selected for download.");
        return;
    }

    const zip = new JSZip();
    const exportPath = currentSettings.audioExportPath || 'audio';
    const folder = zip.folder(exportPath);
    if (!folder) return;

    const descriptorFile: any[] = [];
    const ext = currentSettings.exportFormat || 'webm';

    for (const id of Array.from(selectedEffectIds)) {
        const effect = currentEffects.find(e => e.id === id);
        if (!effect || !effect.blob) continue;

        const safeTitle = effect.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeTitle}_${effect.id}.${ext}`;
        
        let fileBlob = effect.blob;
        if (ext === 'wav') {
            fileBlob = await convertWebMToWav(fileBlob);
        }
        
        folder.file(filename, fileBlob);

        descriptorFile.push({
            id: effect.id,
            title: effect.title,
            group: effect.group,
            tags: effect.tags,
            characterIds: effect.characterIds,
            projectIds: effect.projectIds,
            localPath: `${exportPath}/${filename}`
        });
    }

    zip.file("sounds.json", JSON.stringify(descriptorFile, null, 2));

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        a.download = `Effects_Export_${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to generate zip", e);
        alert("Failed to generate zip file.");
    }
}
