import { Audition, Character, AuditionStatus, AuditionFile } from './types.js';

let auditions: Audition[] = [];
let characters: Character[] = [];
let saveCallback: (auditions: Audition[]) => void;

const STATUS_OPTIONS: AuditionStatus[] = ['Submitted', 'Callback', 'Booked', 'Rejected', 'Ghosted'];
const INACTIVE_STATUSES: AuditionStatus[] = ['Rejected', 'Ghosted'];

export function initializeAuditionView(
    initialAuditions: Audition[],
    initialCharacters: Character[],
    onSave: (auditions: Audition[]) => void
) {
    auditions = initialAuditions;
    characters = initialCharacters;
    saveCallback = onSave;

    document.getElementById('new-audition-button')?.addEventListener('click', () => openAuditionModal());

    const collapsible = document.querySelector('.collapsible-header');
    collapsible?.addEventListener('click', () => {
        collapsible.classList.toggle('active');
        const content = collapsible.nextElementSibling as HTMLElement;
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });

    renderAuditionList();
}

function renderAuditionList() {
    const activeContainer = document.getElementById('active-audition-list');
    const inactiveContainer = document.getElementById('inactive-audition-list');
    if (!activeContainer || !inactiveContainer) return;

    const activeAuditions = auditions.filter(a => !INACTIVE_STATUSES.includes(a.status));
    const inactiveAuditions = auditions.filter(a => INACTIVE_STATUSES.includes(a.status));

    const renderCard = (audition: Audition) => `
        <div class="audition-card" data-id="${audition.id}">
            <div class="audition-card-info">
                <strong>${audition.projectName}</strong>
                <p>${audition.castingDirector.name}</p>
                <p>Due: ${audition.dueDate}</p>
            </div>
            <div class="audition-card-status">
                <select class="audition-status-dropdown" data-id="${audition.id}">
                    ${STATUS_OPTIONS.map(s => `<option value="${s}" ${audition.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
        </div>
    `;

    activeContainer.innerHTML = activeAuditions.map(renderCard).join('');
    inactiveContainer.innerHTML = inactiveAuditions.map(renderCard).join('');

    // Add event listeners for status changes and card clicks
    document.querySelectorAll('.audition-status-dropdown').forEach(el => {
        el.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            const auditionId = Number(target.dataset.id);
            const newStatus = target.value as AuditionStatus;
            const audition = auditions.find(a => a.id === auditionId);
            if (audition) {
                audition.status = newStatus;
                saveCallback(auditions);
                renderAuditionList(); // Re-render to move card if status changed
            }
        });
    });

    document.querySelectorAll('.audition-card-info').forEach(el => {
        el.addEventListener('click', (e) => {
            const auditionId = Number((e.currentTarget as HTMLElement).parentElement?.dataset.id);
            const audition = auditions.find(a => a.id === auditionId);
            if (audition) {
                openAuditionModal(audition);
            }
        });
    });
}

function openAuditionModal(audition?: Audition) {
    const modal = document.getElementById('audition-modal');
    const content = document.getElementById('audition-modal-content');
    if (!modal || !content) return;

    const isNew = !audition;
    const aud = audition || {
        id: Date.now(),
        projectName: '',
        castingDirector: { name: '', email: '', phone: '', company: '' },
        dueDate: '',
        notes: '',
        status: 'Submitted',
        linkedCharacterIds: [],
        files: []
    };

    content.innerHTML = `
        <h2>${isNew ? 'New' : 'Edit'} Audition</h2>
        <div class="audition-modal-grid">
            <input id="aud-project-name" placeholder="Project Name" value="${aud.projectName}">
            <div>
                <label for="aud-due-date">Due Date:</label>
                <input type="date" id="aud-due-date" value="${aud.dueDate}">
            </div>
            <input id="cd-name" placeholder="Casting Director Name" value="${aud.castingDirector.name}">
            <input id="cd-email" placeholder="Casting Director Email" value="${aud.castingDirector.email}">
            <input id="cd-phone" placeholder="Casting Director Phone" value="${aud.castingDirector.phone}">
            <input id="cd-company" placeholder="Casting Company" value="${aud.castingDirector.company}">
        </div>
        <div class="audition-modal-full-width">
            <textarea id="aud-notes" placeholder="Notes, Sides...">${aud.notes}</textarea>
            <label for="aud-status">Status:</label>
            <select id="aud-status">${STATUS_OPTIONS.map(s => `<option value="${s}" ${aud.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
            
            <p><strong>Linked Characters:</strong></p>
            <div id="aud-char-links"></div>

            <p><strong>Attached Files:</strong></p>
            <label for="aud-file-upload" class="custom-file-input">Upload Files</label>
            <input type="file" id="aud-file-upload" multiple>
            <div id="aud-file-list"></div>
        </div>
        <div class="modal-footer">
            <button id="save-audition-button">Save</button>
        </div>
    `;

    const charLinksContainer = content.querySelector('#aud-char-links');
    const fileListContainer = content.querySelector('#aud-file-list');

    const renderLinkedChars = () => {
        if (!charLinksContainer) return;
        charLinksContainer.innerHTML = '';
        aud.linkedCharacterIds.forEach((id, index) => {
            const charSelector = document.createElement('div');
            charSelector.className = 'linked-character-item';
            charSelector.innerHTML = `
                <select data-index="${index}">
                    <option value="">--Select Character--</option>
                    ${characters.map(c => `<option value="${c.id}" ${id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                <button class="remove-item-btn">🗑️</button>
            `;
            charLinksContainer.appendChild(charSelector);
        });
        const addButton = document.createElement('button');
        addButton.className = 'add-character-btn';
        addButton.textContent = '✚';
        addButton.addEventListener('click', () => {
            aud.linkedCharacterIds.push(0); // Add a placeholder
            renderLinkedChars();
        });
        charLinksContainer.appendChild(addButton);
    };

    const renderFiles = () => {
        if (!fileListContainer) return;
        fileListContainer.innerHTML = aud.files.sort((a, b) => a.name.localeCompare(b.name)).map((file, index) => `
            <div class="uploaded-file-item">
                <span>${file.name}</span>
                <button class="remove-item-btn" data-index="${index}">🗑️</button>
            </div>
        `).join('');
    };

    renderLinkedChars();
    renderFiles();

    // --- Event Listeners ---
    document.getElementById('audition-modal-close')?.addEventListener('click', () => modal.classList.add('hidden'));

    content.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        if (target.matches('.linked-character-item select')) {
            const index = Number(target.dataset.index);
            aud.linkedCharacterIds[index] = Number(target.value);
        }
    });

    content.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        if (target.matches('.remove-item-btn')) {
            const item = target.closest('.linked-character-item, .uploaded-file-item');
            if (item?.parentElement?.id === 'aud-char-links') {
                const index = Array.from(item.parentElement.children).indexOf(item);
                aud.linkedCharacterIds.splice(index, 1);
                renderLinkedChars();
            } else if (item?.parentElement?.id === 'aud-file-list') {
                const index = Number(target.dataset.index);
                aud.files.splice(index, 1);
                renderFiles();
            }
        }
    });

    document.getElementById('aud-file-upload')?.addEventListener('change', async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files) return;
        for (const file of Array.from(files)) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                aud.files.push({ name: file.name, data: ev.target?.result as string });
                renderFiles();
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('save-audition-button')?.addEventListener('click', () => {
        aud.projectName = (document.getElementById('aud-project-name') as HTMLInputElement).value;
        aud.dueDate = (document.getElementById('aud-due-date') as HTMLInputElement).value;
        aud.castingDirector.name = (document.getElementById('cd-name') as HTMLInputElement).value;
        aud.castingDirector.email = (document.getElementById('cd-email') as HTMLInputElement).value;
        aud.castingDirector.phone = (document.getElementById('cd-phone') as HTMLInputElement).value;
        aud.castingDirector.company = (document.getElementById('cd-company') as HTMLInputElement).value;
        aud.notes = (document.getElementById('aud-notes') as HTMLTextAreaElement).value;
        aud.status = (document.getElementById('aud-status') as HTMLSelectElement).value as AuditionStatus;

        if (isNew) {
            auditions.push(aud);
        } else {
            const index = auditions.findIndex(a => a.id === aud.id);
            if (index > -1) auditions[index] = aud;
        }

        saveCallback(auditions);
        renderAuditionList();
        modal.classList.add('hidden');
    });

    modal.classList.remove('hidden');
}
