import { Character, Project, JournalEntry, JournalEntryType, TextJournalEntry, SocialJournalEntry, EventJournalEntry } from '../types.js';
import { getJournalEntries, saveJournalEntry, deleteJournalEntry } from '../services/indexeddb.js';
import { generateCharacterOptionsHTML } from '../utils/dom-utils.js';

let characters: Character[] = [];
let projects: Project[] = [];
let currentCharacterId: number | null = null;
let currentEntries: JournalEntry[] = [];
let currentEditingEntryId: string | null = null;

// UI Elements
let projectSelect: HTMLSelectElement;
let characterSelect: HTMLSelectElement;
let importBtn: HTMLButtonElement;
let exportBtn: HTMLButtonElement;
let notesContainer: HTMLDivElement;
let searchInput: HTMLInputElement;
let typeFilter: HTMLSelectElement;
let addTextBtn: HTMLButtonElement;
let addSocialBtn: HTMLButtonElement;
let addEventBtn: HTMLButtonElement;
let notesList: HTMLDivElement;
let notesEditor: HTMLDivElement;
let emptyState: HTMLDivElement;

export function refreshCharacterNotesView(newProjects?: Project[], newCharacters?: Character[]) {
    if (newProjects) projects = newProjects;
    if (newCharacters) characters = newCharacters;

    if (projectSelect && characterSelect) {
        const currentProjectVal = projectSelect.value;
        const currentCharacterVal = characterSelect.value;

        projectSelect.innerHTML = '<option value="none">-- All Projects --</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id.toString();
            option.textContent = p.name;
            projectSelect.appendChild(option);
        });
        projectSelect.value = currentProjectVal;

        updateCharacterSelect();
        if (characters.find(c => c.id.toString() === currentCharacterVal)) {
            characterSelect.value = currentCharacterVal;
        } else {
            notesContainer.style.display = 'none';
            currentCharacterId = null;
            exportBtn.disabled = true;
        }
    }
}

function updateCharacterSelect() {
    const selectedProject = projectSelect.value;
    const pId = selectedProject !== 'none' ? parseInt(selectedProject) : undefined;
    
    // Add default empty option
    let html = '<option value="" disabled selected>Select a Character...</option>';
    html += generateCharacterOptionsHTML(characters, pId);
    characterSelect.innerHTML = html;
}

export function initializeCharacterNotesView(
    initialCharacters: Character[], 
    initialProjects: Project[],
    openModalCallback: (character?: Character, isEditMode?: boolean) => void // For import missing char
) {
    characters = initialCharacters;
    projects = initialProjects;

    projectSelect = document.getElementById('dm-notes-project-select') as HTMLSelectElement;
    characterSelect = document.getElementById('dm-notes-character-select') as HTMLSelectElement;
    importBtn = document.getElementById('dm-notes-import-btn') as HTMLButtonElement;
    exportBtn = document.getElementById('dm-notes-export-btn') as HTMLButtonElement;
    notesContainer = document.getElementById('dm-notes-container') as HTMLDivElement;
    searchInput = document.getElementById('dm-notes-search') as HTMLInputElement;
    typeFilter = document.getElementById('dm-notes-type-filter') as HTMLSelectElement;
    addTextBtn = document.getElementById('dm-notes-add-text') as HTMLButtonElement;
    addSocialBtn = document.getElementById('dm-notes-add-social') as HTMLButtonElement;
    addEventBtn = document.getElementById('dm-notes-add-event') as HTMLButtonElement;
    notesList = document.getElementById('dm-notes-list') as HTMLDivElement;
    notesEditor = document.getElementById('dm-notes-editor') as HTMLDivElement;
    emptyState = document.getElementById('dm-notes-empty-state') as HTMLDivElement;

    if (!projectSelect || !characterSelect) return;

    // Populate projects
    projects.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id.toString();
        option.textContent = p.name;
        projectSelect.appendChild(option);
    });

    projectSelect.addEventListener('change', () => {
        updateCharacterSelect();
        notesContainer.style.display = 'none';
        currentCharacterId = null;
        exportBtn.disabled = true;
    });
    
    updateCharacterSelect();

    characterSelect.addEventListener('change', async () => {
        const charId = parseInt(characterSelect.value);
        if (isNaN(charId)) {
            notesContainer.style.display = 'none';
            currentCharacterId = null;
            exportBtn.disabled = true;
            return;
        }

        currentCharacterId = charId;
        notesContainer.style.display = 'flex';
        exportBtn.disabled = false;
        
        await loadEntries();
        renderEditor(null);
    });

    searchInput.addEventListener('input', () => renderList());
    if (typeFilter) typeFilter.addEventListener('change', () => renderList());

    addTextBtn.addEventListener('click', () => createNewEntry('text'));
    addSocialBtn.addEventListener('click', () => createNewEntry('social'));
    addEventBtn.addEventListener('click', () => createNewEntry('event'));

    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => handleImport(openModalCallback));
}

async function loadEntries() {
    if (!currentCharacterId) return;
    currentEntries = await getJournalEntries(currentCharacterId);
    // sort by latest updated
    currentEntries.sort((a, b) => b.dateUpdated - a.dateUpdated);
    renderList();
}

function renderList() {
    notesList.innerHTML = '';
    const query = searchInput.value.toLowerCase();
    const typeValue = typeFilter ? typeFilter.value : 'all';

    const filtered = currentEntries.filter(e => {
        const matchesQuery = e.title.toLowerCase().includes(query);
        const matchesType = typeValue === 'all' || e.type === typeValue;
        return matchesQuery && matchesType;
    });

    if (filtered.length === 0) {
        notesList.innerHTML = '<div style="padding:10px; color:#666; text-align:center;">No entries found.</div>';
        return;
    }

    filtered.forEach(entry => {
        const div = document.createElement('div');
        div.className = `journal-list-item ${entry.id === currentEditingEntryId ? 'active' : ''}`;
        
        let icon = '📝';
        if (entry.type === 'social') icon = '👥';
        if (entry.type === 'event') icon = '📅';

        div.innerHTML = `
            <div class="journal-list-icon">${icon}</div>
            <div class="journal-list-content">
                <div class="journal-list-title">${escapeHtml(entry.title) || 'Untitled'}</div>
                <div class="journal-list-date">${new Date(entry.dateUpdated).toLocaleDateString()}</div>
            </div>
        `;
        
        div.addEventListener('click', () => renderEditor(entry));
        notesList.appendChild(div);
    });
}

function createNewEntry(type: JournalEntryType) {
    if (!currentCharacterId) return;
    
    const base = {
        id: crypto.randomUUID(),
        characterId: currentCharacterId,
        title: '',
        dateCreated: Date.now(),
        dateUpdated: Date.now(),
        type
    };

    let newEntry: JournalEntry;
    if (type === 'text') {
        newEntry = { ...base, type: 'text', content: '' } as TextJournalEntry;
    } else if (type === 'social') {
        newEntry = { ...base, type: 'social', npcName: '', occupation: '', howTheyMet: '', currentOpinion: '', eventsInfluencing: '', rating: 4, ratingHistory: [] } as SocialJournalEntry;
    } else {
        newEntry = { ...base, type: 'event', description: '', timeTookPlace: '', openNotes: '' } as EventJournalEntry;
    }

    renderEditor(newEntry, true); // true = is new (unsaved)
}

function renderEditor(entry: JournalEntry | null, isNew = false) {
    if (!entry) {
        currentEditingEntryId = null;
        notesEditor.style.display = 'none';
        emptyState.style.display = 'flex';
        renderList(); // clear active state
        return;
    }

    currentEditingEntryId = entry.id;
    notesEditor.style.display = 'flex';
    emptyState.style.display = 'none';
    
    // We update the active state in the list without re-rendering if possible, but re-rendering is easy
    if (!isNew) renderList();

    let html = `
        <div class="journal-editor-header">
            <input type="text" id="j-edit-title" class="j-input-title" placeholder="Entry Title" value="${escapeHtml(entry.title)}" ${entry.type === 'social' ? 'style="display: none;"' : ''}>
            <button id="j-edit-delete" class="j-btn-delete" title="Delete Entry">🗑️</button>
        </div>
        <div class="journal-editor-body">
    `;

    if (entry.type === 'text') {
        html += `<textarea id="j-edit-content" class="j-textarea" placeholder="Start typing...">${escapeHtml((entry as TextJournalEntry).content)}</textarea>`;
    } else if (entry.type === 'social') {
        const social = entry as SocialJournalEntry;
        html += `
            <div class="j-form-group">
                <label>NPC Name</label>
                <input type="text" id="j-edit-npcName" value="${escapeHtml(social.npcName)}">
            </div>
            <div class="j-form-group">
                <label>Occupation</label>
                <input type="text" id="j-edit-occupation" value="${escapeHtml(social.occupation)}">
            </div>
            <div class="j-form-group">
                <label>How they met</label>
                <textarea id="j-edit-howTheyMet">${escapeHtml(social.howTheyMet)}</textarea>
            </div>
            <div class="j-form-group">
                <label>Current Opinion</label>
                <textarea id="j-edit-currentOpinion">${escapeHtml(social.currentOpinion)}</textarea>
            </div>
            <div class="j-form-group">
                <label>Events Influencing</label>
                <textarea id="j-edit-eventsInfluencing">${escapeHtml(social.eventsInfluencing)}</textarea>
            </div>
            <div class="j-form-group">
                <label>Rating (1=Dislike, 8=Love): <span id="j-edit-rating-val">${social.rating}</span></label>
                <input type="range" id="j-edit-rating" min="1" max="8" value="${social.rating}" class="j-slider">
            </div>
            <div class="j-history-log">
                <h4>Rating History</h4>
                ${social.ratingHistory.length === 0 ? '<p>No history.</p>' : 
                  `<ul>${social.ratingHistory.map(h => `<li><b>${new Date(h.date).toLocaleDateString()}:</b> ${h.oldRating} → ${h.newRating}. <br/><i>Reasoning:</i> ${escapeHtml(h.reasoning)}</li>`).join('')}</ul>`}
            </div>
        `;
    } else if (entry.type === 'event') {
        const ev = entry as EventJournalEntry;
        html += `
            <div class="j-form-group">
                <label>Time Took Place</label>
                <input type="text" id="j-edit-timeTookPlace" value="${escapeHtml(ev.timeTookPlace)}">
            </div>
            <div class="j-form-group">
                <label>Description</label>
                <textarea id="j-edit-description">${escapeHtml(ev.description)}</textarea>
            </div>
            <div class="j-form-group">
                <label>Open Notes</label>
                <textarea id="j-edit-openNotes">${escapeHtml(ev.openNotes)}</textarea>
            </div>
        `;
    }

    html += `
        </div>
        <div class="journal-editor-footer">
            <button id="j-edit-save" class="primary-button">Save Entry</button>
        </div>
    `;

    notesEditor.innerHTML = html;

    // Attach listeners
    const saveBtn = document.getElementById('j-edit-save') as HTMLButtonElement;
    const delBtn = document.getElementById('j-edit-delete') as HTMLButtonElement;

    // Optional dynamic rating display
    if (entry.type === 'social') {
        const rInput = document.getElementById('j-edit-rating') as HTMLInputElement;
        const rVal = document.getElementById('j-edit-rating-val') as HTMLSpanElement;
        rInput.addEventListener('input', () => {
            rVal.textContent = rInput.value;
        });
    }

    saveBtn.addEventListener('click', async () => {
        const titleInput = document.getElementById('j-edit-title') as HTMLInputElement;
        
        entry.dateUpdated = Date.now();

        if (entry.type === 'text') {
            entry.title = titleInput.value;
            const contentInput = document.getElementById('j-edit-content') as HTMLTextAreaElement;
            (entry as TextJournalEntry).content = contentInput.value;
        } else if (entry.type === 'social') {
            const social = entry as SocialJournalEntry;
            const oldEventsInfluencing = social.eventsInfluencing || '';
            social.npcName = (document.getElementById('j-edit-npcName') as HTMLInputElement).value;
            entry.title = social.npcName || 'Unnamed NPC';
            
            social.occupation = (document.getElementById('j-edit-occupation') as HTMLInputElement).value;
            social.howTheyMet = (document.getElementById('j-edit-howTheyMet') as HTMLTextAreaElement).value;
            social.currentOpinion = (document.getElementById('j-edit-currentOpinion') as HTMLTextAreaElement).value;
            
            const newEventsInfluencing = (document.getElementById('j-edit-eventsInfluencing') as HTMLTextAreaElement).value;
            const newRating = parseInt((document.getElementById('j-edit-rating') as HTMLInputElement).value, 10);
            
            if (isNew) {
                social.ratingHistory.push({
                    oldRating: newRating,
                    newRating,
                    reasoning: social.currentOpinion || 'No initial opinion given',
                    date: Date.now()
                });
                social.eventsInfluencing = newEventsInfluencing;
            } else if (newRating !== social.rating) {
                const reason = prompt(`You changed the rating from ${social.rating} to ${newRating}. What is your reasoning?`);
                if (reason) {
                    social.ratingHistory.push({
                        oldRating: social.rating,
                        newRating,
                        reasoning: reason,
                        date: Date.now()
                    });
                }
                social.eventsInfluencing = newEventsInfluencing;
            } else {
                social.eventsInfluencing = newEventsInfluencing;
            }
            social.rating = newRating;
        } else if (entry.type === 'event') {
            entry.title = titleInput.value;
            const ev = entry as EventJournalEntry;
            ev.timeTookPlace = (document.getElementById('j-edit-timeTookPlace') as HTMLInputElement).value;
            ev.description = (document.getElementById('j-edit-description') as HTMLTextAreaElement).value;
            ev.openNotes = (document.getElementById('j-edit-openNotes') as HTMLTextAreaElement).value;
        }

        await saveJournalEntry(entry);
        await loadEntries();
        renderEditor(entry); // refresh
    });

    delBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this journal entry?')) {
            if (!isNew) {
                await deleteJournalEntry(entry.id);
            }
            await loadEntries();
            renderEditor(null);
        }
    });
}

// --- Import / Export ---

interface JournalExportFormat {
    version: number;
    character?: Character; // Optional character details
    entries: JournalEntry[];
}

async function handleExport() {
    if (!currentCharacterId) return;
    
    const char = characters.find(c => c.id === currentCharacterId);
    if (!char) return;

    const includeChar = confirm('Do you want to include character details (e.g. voice sample, tags) in this export?');
    
    const data: JournalExportFormat = {
        version: 1,
        entries: currentEntries
    };

    if (includeChar) {
        data.character = char;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${char.name.replace(/\s+/g, '_')}_Journal.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImport(openModalCallback: (character?: Character, isEditMode?: boolean) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (re) => {
            try {
                const data = JSON.parse(re.target?.result as string) as JournalExportFormat;
                
                let targetCharId = currentCharacterId;
                
                // If there's no character selected, we need to prompt to create a new one or fail
                if (!targetCharId) {
                    alert('You have no character selected. Please create a new blank character for this journal import, then select them and import again.');
                    openModalCallback(undefined, true);
                    return;
                }

                if (!data.entries || !Array.isArray(data.entries)) {
                    alert('Invalid journal export format.');
                    return;
                }

                let importedCount = 0;
                for (const entry of data.entries) {
                    // Assign to current character and generate new ID to avoid collisions
                    entry.id = crypto.randomUUID();
                    entry.characterId = targetCharId;
                    await saveJournalEntry(entry);
                    importedCount++;
                }

                alert(`Successfully imported ${importedCount} journal entries.`);
                await loadEntries();

            } catch (err) {
                console.error(err);
                alert('Failed to parse the journal file.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
