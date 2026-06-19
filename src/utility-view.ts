import { loadFromLocalStorage } from './storage.js';
import { saveVoiceMemo, getVoiceMemos, deleteVoiceMemos, updateVoiceMemo } from './indexeddb.js';
import { VoiceMemo, SystemSettings } from './types.js';
import { convertWebMToWav } from './audio-utils.js';
import JSZip from 'jszip';

export function initializeUtilityView(settings: SystemSettings): void {
    initializeWarmUps();
    initializeVoiceMemos(settings);
}

function initializeWarmUps() {
    const warmUpTextContainer = document.getElementById('warm-up-text');
    const recordButton = document.getElementById('warm-up-record-button');
    const audioPlayerContainer = document.getElementById('warm-up-audio-player');

    if (!warmUpTextContainer || !recordButton || !audioPlayerContainer) {
        return;
    }

    const warmUpText = `
        <p><strong>Lip Trills:</strong> Start with a few gentle lip trills (like a motorboat sound) to relax your lips and breath support.</p>
        <p><strong>Jaw Relaxation:</strong> Gently massage your jaw muscles and say "yah-yah-yah" and "wow-wow-wow" with an exaggerated motion.</p>
        <p><strong>Tongue Twisters (Fricatives & Plosives):</strong></p>
        <ul>
            <li>"She sells seashells by the seashore."</li>
            <li>"Peter Piper picked a peck of pickled peppers."</li>
            <li>"Red leather, yellow leather." (Repeat quickly)</li>
            <li>"Unique New York, New York unique."</li>
        </ul>
        <p><strong>Vowel Sounds (Resonance):</strong></p>
        <ul>
            <li>"Mee, may, mah, moh, moo." (Focus on forward resonance)</li>
            <li>"Nee, nay, nah, noh, noo."</li>
        </ul>
        <p><strong>Pitch Glides:</strong> Glide your voice from your lowest comfortable note to your highest and back down, like a siren.</p>
    `;
    warmUpTextContainer.innerHTML = warmUpText;

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];

    const toggleRecording = async () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordButton.classList.remove('recording');
            recordButton.textContent = '●';
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPlayerContainer.innerHTML = `<audio controls src="${audioUrl}"></audio>`;
                    stream.getTracks().forEach(track => track.stop());
                });

                mediaRecorder.start();
                recordButton.classList.add('recording');
                recordButton.textContent = '■';

            } catch (err) {
                console.error("Error recording warm-up:", err);
                alert("Could not start recording.");
                recordButton.classList.remove('recording');
                recordButton.textContent = '●';
            }
        }
    };

    recordButton.addEventListener('click', toggleRecording);
}

function initializeVoiceMemos(settings: SystemSettings) {
    const newMemoBtn = document.getElementById('new-voice-memo-button');
    const modal = document.getElementById('voice-memo-modal');
    const closeBtn = document.getElementById('voice-memo-modal-close');
    const recordBtn = document.getElementById('voice-memo-record-button');
    const recordStatus = document.getElementById('voice-memo-record-status');
    const audioPreview = document.getElementById('voice-memo-audio-preview');
    const titleInput = document.getElementById('voice-memo-title') as HTMLInputElement;
    const projectSelect = document.getElementById('voice-memo-project-select') as HTMLSelectElement;
    const importanceCheck = document.getElementById('voice-memo-importance') as HTMLInputElement;
    const saveBtn = document.getElementById('save-voice-memo-button') as HTMLButtonElement;
    
    const tagsInput = document.getElementById('voice-memo-tags') as HTMLInputElement;
    const activeTagsContainer = document.getElementById('voice-memo-active-tags-container');
    const tagSuggestions = document.getElementById('voice-memo-tag-suggestions');

    const searchInput = document.getElementById('voice-memo-search-tags') as HTMLInputElement;
    const sortSelect = document.getElementById('voice-memo-sort-select') as HTMLSelectElement;
    const importantFirstToggle = document.getElementById('voice-memo-sort-important-first') as HTMLInputElement;

    const listContainer = document.getElementById('voice-memo-list');
    const exportBtn = document.getElementById('export-voice-memos-button');
    const deleteBtn = document.getElementById('delete-voice-memos-button');

    let currentBlob: Blob | null = null;
    let currentTags: string[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let editId: number | null = null;
    let editDate: number | null = null;

    const { characters, projects } = loadFromLocalStorage();

    // Populate Projects
    if (projectSelect) {
        projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id.toString();
            opt.textContent = p.name;
            projectSelect.appendChild(opt);
        });
    }

    // List rendering dependencies
    searchInput?.addEventListener('input', renderList);
    sortSelect?.addEventListener('change', renderList);
    importantFirstToggle?.addEventListener('change', renderList);

    // Modal logic
    newMemoBtn?.addEventListener('click', () => {
        resetModal();
        modal?.classList.remove('hidden');
    });
    
    closeBtn?.addEventListener('click', () => {
        modal?.classList.add('hidden');
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    });

    const resetModal = () => {
        editId = null;
        editDate = null;
        currentBlob = null;
        currentTags = [];
        audioChunks = [];
        titleInput.value = '';
        projectSelect.value = '';
        importanceCheck.checked = false;
        tagsInput.value = '';
        if (recordBtn) {
            recordBtn.classList.remove('recording');
            recordBtn.textContent = '●';
        }
        if (recordStatus) recordStatus.textContent = 'Ready to record';
        if (audioPreview) audioPreview.innerHTML = '';
        if (saveBtn) saveBtn.disabled = true;
        renderTags();
    };

    // Recording logic
    recordBtn?.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordBtn.classList.remove('recording');
            recordBtn.textContent = '●';
            if (recordStatus) recordStatus.textContent = 'Recording stopped';
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    currentBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(currentBlob);
                    if (audioPreview) {
                        audioPreview.innerHTML = `<audio controls src="${audioUrl}"></audio>`;
                    }
                    if (saveBtn) saveBtn.disabled = false;
                    stream.getTracks().forEach(track => track.stop());
                });

                mediaRecorder.start();
                recordBtn.classList.add('recording');
                recordBtn.textContent = '■';
                if (recordStatus) recordStatus.textContent = 'Recording...';

            } catch (err) {
                console.error("Error recording voice memo:", err);
                alert("Could not start recording.");
            }
        }
    });

    // Tag logic
    const allExistingTags = Array.from(new Set(characters.flatMap(c => c.tags)));
    
    tagsInput?.addEventListener('input', () => {
        const val = tagsInput.value.toLowerCase();
        if (tagSuggestions) tagSuggestions.innerHTML = '';
        if (!val) return;

        const matches = allExistingTags.filter(t => t.toLowerCase().includes(val) && !currentTags.includes(t));
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'tag-suggestion';
            div.textContent = m;
            div.addEventListener('click', () => {
                addTag(m);
                tagsInput.value = '';
                if (tagSuggestions) tagSuggestions.innerHTML = '';
            });
            tagSuggestions?.appendChild(div);
        });
    });

    tagsInput?.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && tagsInput.value.trim()) {
            e.preventDefault();
            const val = tagsInput.value.replace(/,/g, '').trim();
            if (val) {
                addTag(val);
            }
            tagsInput.value = '';
            if (tagSuggestions) tagSuggestions.innerHTML = '';
        }
    });

    function addTag(tag: string) {
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            renderTags();
        }
    }

    function renderTags() {
        if (!activeTagsContainer) return;
        activeTagsContainer.innerHTML = '';
        currentTags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = tag;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'tag-remove';
            removeBtn.textContent = ' x';
            removeBtn.addEventListener('click', () => {
                currentTags = currentTags.filter(t => t !== tag);
                renderTags();
            });
            span.appendChild(removeBtn);
            activeTagsContainer.appendChild(span);
        });
    }

    // Save Memo
    saveBtn?.addEventListener('click', async () => {
        if (!currentBlob) return;
        
        const title = titleInput.value.trim() || `Memo ${new Date().toLocaleString()}`;
        const projectId = projectSelect.value ? parseInt(projectSelect.value, 10) : null;
        const isHighImportance = importanceCheck.checked;

        const memoData = {
            blob: currentBlob,
            title,
            tags: currentTags,
            projectId,
            isHighImportance,
            date: editDate !== null ? editDate : Date.now()
        };

        if (editId !== null) {
            await updateVoiceMemo({ ...memoData, id: editId });
        } else {
            await saveVoiceMemo(memoData);
        }

        modal?.classList.add('hidden');
        renderList();
    });

    // Render List
    async function renderList() {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        let memos = await getVoiceMemos();
        
        // Apply Filter
        const searchVal = searchInput?.value.toLowerCase().trim();
        if (searchVal) {
            memos = memos.filter(m => m.tags.some(t => t.toLowerCase().includes(searchVal)));
        }

        // Apply Sort
        const sortType = sortSelect?.value || 'date';
        memos.sort((a, b) => {
            if (sortType === 'name') {
                return a.title.localeCompare(b.title);
            } else if (sortType === 'size') {
                return b.blob.size - a.blob.size; // Largest first
            } else {
                return b.date - a.date; // Newest first (date)
            }
        });

        // Apply Important First
        if (importantFirstToggle?.checked) {
            memos.sort((a, b) => {
                if (a.isHighImportance === b.isHighImportance) return 0;
                return a.isHighImportance ? -1 : 1;
            });
        }

        memos.forEach(memo => {
            const div = document.createElement('div');
            div.className = `voice-memo-item ${memo.isHighImportance ? 'high-importance' : ''}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'memo-checkbox';
            checkbox.dataset.id = memo.id.toString();

            const infoDiv = document.createElement('div');
            infoDiv.className = 'memo-info';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'memo-title';
            titleDiv.innerHTML = `<strong>${memo.title}</strong>`;
            
            const projName = memo.projectId ? projects.find(p => p.id === memo.projectId)?.name || 'Unknown Project' : 'Unassigned';
            const projectDiv = document.createElement('div');
            projectDiv.className = 'memo-meta';
            projectDiv.textContent = `Project: ${projName}`;

            infoDiv.appendChild(titleDiv);
            infoDiv.appendChild(projectDiv);

            if (memo.tags && memo.tags.length > 0) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'memo-meta';
                
                const tagsLabel = document.createElement('span');
                tagsLabel.textContent = 'Tags: ';
                tagsDiv.appendChild(tagsLabel);
                
                memo.tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'tag';
                    tagSpan.style.marginRight = '5px';
                    tagSpan.style.marginBottom = '0';
                    tagSpan.textContent = tag;
                    tagsDiv.appendChild(tagSpan);
                });
                
                infoDiv.appendChild(tagsDiv);
            }
            
            const dateDiv = document.createElement('div');
            dateDiv.className = 'memo-date';
            dateDiv.style.marginTop = '5px';
            dateDiv.textContent = new Date(memo.date).toLocaleString();
            infoDiv.appendChild(dateDiv);

            const audioUrl = URL.createObjectURL(memo.blob);
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = audioUrl;

            // Click interactions
            div.addEventListener('click', (e) => {
                // Don't toggle if they clicked the checkbox directly or interacted with the audio player
                if (e.target !== checkbox && e.target !== audio) {
                    checkbox.checked = !checkbox.checked;
                }
            });

            audio.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevents bubbling to the div
            });

            div.addEventListener('dblclick', () => {
                // Edit mode
                resetModal();
                editId = memo.id;
                editDate = memo.date;
                currentBlob = memo.blob;
                currentTags = [...memo.tags];
                
                titleInput.value = memo.title;
                projectSelect.value = memo.projectId ? memo.projectId.toString() : '';
                importanceCheck.checked = memo.isHighImportance;
                
                renderTags();

                // Show audio preview
                const audioUrl = URL.createObjectURL(currentBlob);
                if (audioPreview) {
                    audioPreview.innerHTML = `<audio controls src="${audioUrl}"></audio>`;
                }
                if (saveBtn) saveBtn.disabled = false;
                
                modal?.classList.remove('hidden');
            });

            div.appendChild(checkbox);
            div.appendChild(infoDiv);
            div.appendChild(audio);
            
            listContainer.appendChild(div);
        });
    }

    // Export & Delete
    exportBtn?.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.memo-checkbox:checked') as NodeListOf<HTMLInputElement>;
        if (checkboxes.length === 0) return;

        const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id || '0', 10));
        const memos = await getVoiceMemos();
        const selected = memos.filter(m => ids.includes(m.id));

        const zip = new JSZip();
        for (const m of selected) {
            if (settings.exportFormat === 'wav') {
                const wavBlob = await convertWebMToWav(URL.createObjectURL(m.blob));
                const filename = `${m.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${m.id}.wav`;
                zip.file(filename, wavBlob);
            } else {
                const filename = `${m.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${m.id}.webm`;
                zip.file(filename, m.blob);
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voice_memos.zip';
        a.click();
        URL.revokeObjectURL(url);
    });

    deleteBtn?.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.memo-checkbox:checked') as NodeListOf<HTMLInputElement>;
        if (checkboxes.length === 0) return;

        if (confirm(`Are you sure you want to delete ${checkboxes.length} memo(s)?`)) {
            const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id || '0', 10));
            await deleteVoiceMemos(ids);
            renderList();
        }
    });

    // Initial render
    renderList();
}
