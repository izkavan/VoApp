import { Project, DictionaryEntry } from '../types.js';
import { getDictionaryEntries, saveDictionaryEntries, deleteDictionaryEntry } from '../services/indexeddb.js';

let modalElement: HTMLElement;
let modalContentElement: HTMLElement;
let currentProject: Project | null = null;
let currentEntries: DictionaryEntry[] = [];

export function initializeDictionaryModal(modalEl: HTMLElement, contentEl: HTMLElement) {
    modalElement = modalEl;
    modalContentElement = contentEl;
    
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) closeDictionaryModal();
    });

    const closeBtn = document.getElementById('dictionary-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDictionaryModal);
}

export async function openDictionaryModal(project: Project) {
    currentProject = project;
    currentEntries = await getDictionaryEntries(project.id);
    renderModal();
    modalElement.classList.remove('hidden');
}

export function closeDictionaryModal() {
    modalElement.classList.add('hidden');
    currentProject = null;
}

function renderModal() {
    if (!currentProject) return;

    modalContentElement.innerHTML = `
        <h2>Dictionary: ${currentProject.name}</h2>
        <div class="dictionary-grid dictionary-header">
            <div>Word</div>
            <div>Phonetic</div>
            <div>Meaning</div>
            <div>Audio</div>
            <div></div>
        </div>
        <div id="dictionary-entries"></div>
        <button id="add-dictionary-entry" class="dictionary-add-btn">+</button>
        <div class="modal-footer" style="margin-top: 15px; justify-content: flex-start;">
            <button id="save-dictionary-btn">Save</button>
        </div>
    `;

    const entriesContainer = document.getElementById('dictionary-entries');
    if (entriesContainer) {
        currentEntries.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = 'dictionary-grid dictionary-row';
            
            row.innerHTML = `
                <input type="text" class="dict-word" value="${entry.word.replace(/"/g, '&quot;')}" placeholder="Word" />
                <input type="text" class="dict-phonetic" value="${entry.phonetic.replace(/"/g, '&quot;')}" placeholder="Phonetic" />
                <input type="text" class="dict-meaning" value="${entry.meaning.replace(/"/g, '&quot;')}" placeholder="Meaning" />
                <div class="dict-audio-container" style="display: flex; gap: 5px;">
                    ${entry.audioData 
                        ? `<audio controls controlsList="nodownload" src="${entry.audioData}" style="width: 150px; height: 30px;"></audio>
                           <button class="dict-rerecord-btn" data-index="${index}" title="Re-record" style="font-size: 1.2rem; background: none; border: none; cursor: pointer;">🔄</button>`
                        : `<button class="dict-record-btn" data-index="${index}">Record (3s)</button>`}
                </div>
                <button class="dict-delete-btn" data-index="${index}" style="color: var(--danger-color); background: none; border: none; cursor: pointer; font-size: 1.2rem;">🗑️</button>
            `;
            entriesContainer.appendChild(row);
        });
    }

    // Attach row events
    document.querySelectorAll('.dict-word').forEach((el, i) => el.addEventListener('input', (e) => currentEntries[i].word = (e.target as HTMLInputElement).value));
    document.querySelectorAll('.dict-phonetic').forEach((el, i) => el.addEventListener('input', (e) => currentEntries[i].phonetic = (e.target as HTMLInputElement).value));
    document.querySelectorAll('.dict-meaning').forEach((el, i) => el.addEventListener('input', (e) => currentEntries[i].meaning = (e.target as HTMLInputElement).value));
    
    document.querySelectorAll('.dict-delete-btn').forEach(btn => btn.addEventListener('click', async (e) => {
        const index = Number((e.currentTarget as HTMLElement).dataset.index);
        const entry = currentEntries[index];
        if (entry.id && !entry.id.startsWith('new_')) {
            await deleteDictionaryEntry(entry.id);
        }
        currentEntries.splice(index, 1);
        renderModal();
    }));

    const handleRecord = async (index: number, btn: HTMLElement) => {
        btn.textContent = 'Recording...';
        btn.setAttribute('disabled', 'true');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    currentEntries[index].audioData = reader.result as string;
                    renderModal();
                };
                reader.readAsDataURL(blob);
            };
            recorder.start();
            setTimeout(() => {
                recorder.stop();
                stream.getTracks().forEach(t => t.stop());
            }, 3000);
        } catch (e) {
            console.error("Mic access denied", e);
            btn.textContent = 'Error';
            btn.removeAttribute('disabled');
        }
    };

    document.querySelectorAll('.dict-record-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const index = Number((e.currentTarget as HTMLElement).dataset.index);
        handleRecord(index, e.currentTarget as HTMLElement);
    }));

    document.querySelectorAll('.dict-rerecord-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const index = Number((e.currentTarget as HTMLElement).dataset.index);
        handleRecord(index, e.currentTarget as HTMLElement);
    }));

    document.getElementById('add-dictionary-entry')?.addEventListener('click', () => {
        currentEntries.push({
            id: 'new_' + Date.now() + '_' + Math.random(),
            projectId: currentProject!.id,
            word: '',
            phonetic: '',
            meaning: ''
        });
        renderModal();
    });

    document.getElementById('save-dictionary-btn')?.addEventListener('click', async () => {
        // Clear pseudo IDs and ensure project IDs
        const finalEntries = currentEntries.map(e => {
            if (e.id.startsWith('new_')) {
                return { ...e, id: crypto.randomUUID() };
            }
            return e;
        });
        await saveDictionaryEntries(finalEntries);
        if (currentProject) {
            window.dispatchEvent(new CustomEvent('dictionaryUpdated', { detail: { projectId: currentProject.id } }));
        }
        closeDictionaryModal();
    });
}
