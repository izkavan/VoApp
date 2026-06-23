import { Character, Project, SystemSettings, DictionaryEntry } from '../types.js';
import { convertWebMToWav } from '../utils/audio-utils.js';
import { saveAudioBlob, getAudioBlob, deleteAudioBlob, initDB, getDictionaryEntries } from '../services/indexeddb.js';
import JSZip from 'jszip';
import { highlightDictionaryWords } from '../components/dictionary-highlighter.js';

// In-memory representation
interface TakeDetail {
    audioId: string;
    rating: number;
    notes: string;
    title?: string;
}

interface LineDetail {
    text: string;
    lineName: string;
    characterId?: number;
    notes: string;
    takes: TakeDetail[]; // Array of TakeDetail
    state?: 'Not Started' | 'In Progress' | 'Done';
}

// JSON representation
interface SavedTakeDetail {
    path: string;
    rating: number;
    notes: string;
    title?: string;
}

interface SavedLineDetail {
    text: string;
    lineName: string;
    characterId?: number;
    characterName?: string;
    notes: string;
    takes: SavedTakeDetail[];
    state?: 'Not Started' | 'In Progress' | 'Done';
}

interface SavedScript {
    projectId?: number;
    lines: {
        text: string;
        status: 'read' | 'omitted' | 'normal';
    }[];
    lineDetails: SavedLineDetail[];
}

export let loadScriptIntoLineReader: ((data: any) => void) | null = null;

export function initializeLineReader(characters: Character[], projects: Project[], settings: SystemSettings, openCharacterModal: (character: Character) => void): void {
    const fileInput = document.getElementById('script-file-input') as HTMLInputElement;
    const scriptNameInput = document.getElementById('script-name-input') as HTMLInputElement;
    const scriptVersionInput = document.getElementById('script-version-input') as HTMLInputElement;
    const projectSelect = document.getElementById('script-project-select') as HTMLSelectElement;
    
    let currentDictionary: DictionaryEntry[] = [];

    // --- Session Persistence ---
    const SESSION_KEY = 'vo_app_active_line_reader_session';
    
    const saveActiveSession = () => {
        const linesToSave = Array.from(document.getElementById('line-container')?.querySelectorAll('.line-entry') || []).map(line => {
            const status: 'read' | 'omitted' | 'normal' = line.classList.contains('read') ? 'read' : line.classList.contains('omitted') ? 'omitted' : 'normal';
            const text = line.getAttribute('data-line-text') || line.textContent || '';
            return { text, status: status };
        });
        const sessionData = {
            projectId: parseInt(projectSelect.value) || undefined,
            scriptName: scriptNameInput.value || '',
            scriptVersion: scriptVersionInput.value || '',
            lines: linesToSave,
            lineDetails: Array.from(lineDetails.values())
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    };

    const loadActiveSession = async () => {
        const dataStr = localStorage.getItem(SESSION_KEY);
        if (!dataStr) return;
        try {
            const sessionData = JSON.parse(dataStr);
            if (sessionData.scriptName) scriptNameInput.value = sessionData.scriptName;
            if (sessionData.scriptVersion) scriptVersionInput.value = sessionData.scriptVersion;
            if (sessionData.projectId && projectSelect) projectSelect.value = String(sessionData.projectId);
            
            const lineContainer = document.getElementById('line-container');
            const readContainer = document.getElementById('read-container');
            if (lineContainer) lineContainer.innerHTML = '';
            if (readContainer) readContainer.innerHTML = '';

            (sessionData.lines || []).forEach((lineInfo: any) => {
                const lineDiv = document.createElement('div');
                lineDiv.textContent = lineInfo.text;
                lineDiv.className = 'line-entry';
                if (lineInfo.status !== 'normal') lineDiv.classList.add(lineInfo.status);
                lineDiv.addEventListener('click', () => selectLine(lineDiv, false));
                lineContainer?.appendChild(lineDiv);

                if (lineInfo.status === 'read') {
                    const readLineDiv = document.createElement('div');
                    readLineDiv.textContent = lineInfo.text;
                    readLineDiv.className = 'line-entry';
                    readLineDiv.addEventListener('click', () => selectLine(readLineDiv, true));
                    readContainer?.appendChild(readLineDiv);
                }
            });

            lineDetails.clear();
            (sessionData.lineDetails || []).forEach((detail: LineDetail) => {
                lineDetails.set(detail.text, detail);
            });

            if (projectSelect) projectSelect.dispatchEvent(new Event('change'));
            
            const pId = parseInt(projectSelect.value);
            if (!isNaN(pId)) {
                currentDictionary = await getDictionaryEntries(pId);
            } else {
                currentDictionary = [];
            }
            
            updateLineContainerUI();
        } catch (e) {
            console.error("Failed to load active session", e);
        }
    };

    const filterSelect = document.getElementById('line-filter-select') as HTMLSelectElement;
    const lineContainer = document.getElementById('line-container');
    const readContainer = document.getElementById('read-container');
    const readDetailsContainer = document.getElementById('read-details');
    const readButton = document.getElementById('read-button');
    const ignoreButton = document.getElementById('ignore-button');
    const resetButton = document.getElementById('reset-button');
    const saveButton = document.getElementById('save-button');

    let selectedLine: HTMLElement | null = null;
    let selectedReadLine: HTMLElement | null = null;
    let lineDetails = new Map<string, LineDetail>();

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];

    // Populate Project Dropdown
    projectSelect.innerHTML = `<option value="">--Select Project--</option>${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}`;
    
    const getAvailableCharacters = () => {
        const selectedProjectId = projectSelect?.value ? Number(projectSelect.value) : undefined;
        if (selectedProjectId !== undefined && !isNaN(selectedProjectId)) {
            return characters.filter(c => c.projectId === selectedProjectId);
        }
        return characters;
    };

    const updateCharacterDropdowns = () => {
        const availableCharacters = getAvailableCharacters();
        if (filterSelect) {
            const currentFilter = filterSelect.value;
            filterSelect.innerHTML = `<option value="all">No Filter</option><option value="unassigned">Unassigned</option>${availableCharacters.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}`;
            if (Array.from(filterSelect.options).some(o => o.value === currentFilter)) {
                filterSelect.value = currentFilter;
            } else {
                filterSelect.value = 'all';
            }
        }
    };

    updateCharacterDropdowns();

    projectSelect?.addEventListener('change', async () => {
        updateCharacterDropdowns();
        const availableCharacters = getAvailableCharacters();
        const availableIds = new Set(availableCharacters.map(c => c.id));
        
        lineDetails.forEach(detail => {
            if (detail.characterId !== undefined && !availableIds.has(detail.characterId)) {
                detail.characterId = undefined;
            }
        });

        const projectId = parseInt(projectSelect.value);
        if (!isNaN(projectId)) {
            currentDictionary = await getDictionaryEntries(projectId);
        } else {
            currentDictionary = [];
        }

        if (selectedReadLine) {
            renderDetails(selectedReadLine.getAttribute('data-line-text') || selectedReadLine.textContent || '');
        }
        updateLineContainerUI();
    });

    const updateLineContainerUI = () => {
        const filterValue = filterSelect?.value || 'all';
        [lineContainer, readContainer].forEach(container => {
            if (!container) return;
            Array.from(container.children).forEach(child => {
                const lineDiv = child as HTMLElement;
                const lineText = lineDiv.getAttribute('data-line-text') || lineDiv.textContent || '';
                if (!lineDiv.hasAttribute('data-line-text')) {
                    lineDiv.setAttribute('data-line-text', lineText);
                }

                const detail = lineDetails.get(lineText);
                const charId = detail?.characterId;
                
                let visible = true;
                if (filterValue !== 'all') {
                    if (filterValue === 'unassigned') {
                        visible = (charId === undefined || isNaN(charId));
                    } else {
                        visible = (charId === Number(filterValue));
                    }
                }
                lineDiv.style.display = visible ? 'flex' : 'none';

                let stateDot = '';
                if (lineDiv.classList.contains('read')) {
                    if (detail?.state === 'Done') stateDot = '🟢 ';
                    else if (detail?.state === 'In Progress') stateDot = '🟡 ';
                    else stateDot = '🔴 ';
                }

                if (lineDiv.classList.contains('read') && charId !== undefined && !isNaN(charId)) {
                    const char = characters.find(c => c.id === charId);
                    if (char && char.artwork) {
                        lineDiv.innerHTML = `<span class="line-status-icon">${stateDot}</span><span class="line-entry-text">${highlightDictionaryWords(lineText, currentDictionary)}</span><img class="line-character-icon" src="${char.artwork}">`;
                    } else {
                        lineDiv.innerHTML = `<span class="line-status-icon">${stateDot}</span><span class="line-entry-text">${highlightDictionaryWords(lineText, currentDictionary)}</span>`;
                    }
                } else {
                    lineDiv.innerHTML = `<span class="line-status-icon">${stateDot}</span><span class="line-entry-text">${highlightDictionaryWords(lineText, currentDictionary)}</span>`;
                }
            });
        });
    };

    filterSelect?.addEventListener('change', () => {
        if (selectedReadLine) {
            selectedReadLine.classList.remove('selected');
            selectedReadLine = null;
        }
        if (readDetailsContainer) readDetailsContainer.innerHTML = '';
        updateLineContainerUI();
    });

    const renderDetails = async (lineText: string) => {
        if (!readDetailsContainer) return;
        const details = lineDetails.get(lineText);
        if (!details) return;

        const associatedCharacter = characters.find(c => c.id === details.characterId);
        const artworkImage = associatedCharacter?.artwork
            ? `<img id="line-character-art" class="character-art-preview" src="${associatedCharacter.artwork}" />`
            : `<div id="line-character-art" class="character-art-preview"></div>`;

        const audioUrls = new Map<string, string>();
        for (const take of details.takes) {
            if (take.audioId) {
                const blob = await getAudioBlob(take.audioId);
                if (blob) audioUrls.set(take.audioId, URL.createObjectURL(blob));
            }
        }

        readDetailsContainer.innerHTML = `
            <label for="line-name-input">Line Name:</label>
            <input type="text" id="line-name-input" value="${details.lineName}" />
            <div class="line-state-container" style="margin-top: 10px;">
                <label for="line-state-select">Status:</label>
                <select id="line-state-select">
                    <option value="Not Started" ${(!details.state || details.state === 'Not Started') ? 'selected' : ''}>Not Started</option>
                    <option value="In Progress" ${details.state === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Done" ${details.state === 'Done' ? 'selected' : ''}>Done</option>
                </select>
            </div>
            <div class="character-selector">
                <select id="line-character-select">
                    <option value="">--Select Character--</option>
                    ${getAvailableCharacters().map(c => `<option value="${c.id}" ${c.id === details.characterId ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                ${artworkImage}
            </div>
            <button id="record-take-button" class="record-button">●</button>
            <ul id="takes-list" class="takes-list">
                ${details.takes.map((take, index) => `
                <li class="take-item" data-index="${index}">
                    <input type="text" class="take-title-input" placeholder="Take title..." value="${(take.title || '').replace(/"/g, '&quot;')}" />
                    <div class="take-audio-controls">
                        <audio controls controlsList="nodownload" src="${audioUrls.get(take.audioId) || ''}"></audio>
                        <span class="download-take" title="Download Take" style="cursor: pointer; font-size: 1.2rem;">💾</span>
                        <span class="delete-take" style="cursor: pointer; font-size: 1.2rem;">🗑️</span>
                    </div>
                    <div class="take-metadata">
                        <div class="star-rating">
                            ${[1, 2, 3, 4, 5].map(star => `<span class="star ${star <= take.rating ? 'active' : ''}" data-value="${star}">★</span>`).join('')}
                        </div>
                        <input type="text" class="take-note-input" placeholder="Take notes..." value="${take.notes.replace(/"/g, '&quot;')}" />
                    </div>
                </li>
                `).join('')}
            </ul>
            <textarea id="line-notes" class="notes-area" placeholder="Notes...">${details.notes}</textarea>
        `;

        document.getElementById('line-name-input')?.addEventListener('input', (e) => { details.lineName = (e.target as HTMLInputElement).value; });
        document.getElementById('record-take-button')?.addEventListener('click', toggleRecording);
        document.getElementById('line-character-select')?.addEventListener('change', (e) => {
            details.characterId = Number((e.target as HTMLSelectElement).value);
            renderDetails(lineText);
            updateLineContainerUI();
        });
        document.getElementById('line-character-art')?.addEventListener('click', () => { if (associatedCharacter) openCharacterModal(associatedCharacter); });
        document.getElementById('line-notes')?.addEventListener('input', (e) => { details.notes = (e.target as HTMLTextAreaElement).value; });
        document.getElementById('line-state-select')?.addEventListener('change', (e) => {
            details.state = (e.target as HTMLSelectElement).value as any;
            updateLineContainerUI();
            saveActiveSession();
        });
        document.querySelectorAll('.delete-take').forEach(btn => btn.addEventListener('click', async (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            const take = details.takes[index];
            if (take.audioId) {
                await deleteAudioBlob(take.audioId).catch(e => console.warn(e));
            }
            details.takes.splice(index, 1);
            saveActiveSession();
            renderDetails(lineText);
        }));
        document.querySelectorAll('.download-take').forEach(btn => btn.addEventListener('click', async (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            const take = details.takes[index];
            const a = document.createElement('a');
            const safeTitle = (take.title || `take_${index + 1}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            const blob = await getAudioBlob(take.audioId);
            if (!blob) return;

            if (settings.exportFormat === 'wav') {
                const base64Audio = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                const wavBlob = await convertWebMToWav(base64Audio);
                a.href = URL.createObjectURL(wavBlob);
                a.download = `${safeTitle}.wav`;
            } else {
                a.href = URL.createObjectURL(blob);
                a.download = `${safeTitle}.webm`;
            }
            a.click();
        }));
        document.querySelectorAll('.take-note-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            details.takes[index].notes = (e.target as HTMLInputElement).value;
        }));
        document.querySelectorAll('.star').forEach(star => star.addEventListener('click', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            const rating = Number((e.currentTarget as HTMLElement).getAttribute('data-value'));
            details.takes[index].rating = rating;
            renderDetails(lineText);
        }));
        document.querySelectorAll('.take-title-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            details.takes[index].title = (e.target as HTMLInputElement).value;
        }));
    };

    const selectLine = (lineDiv: HTMLElement, isReadLine: boolean) => {
        const container = isReadLine ? selectedReadLine : selectedLine;
        const setter = (val: HTMLElement | null) => isReadLine ? (selectedReadLine = val) : (selectedLine = val);

        if (container === lineDiv) {
            container.classList.remove('selected');
            setter(null);
            if(isReadLine && readDetailsContainer) readDetailsContainer.innerHTML = '';
        } else {
            if (container) container.classList.remove('selected');
            setter(lineDiv);
            lineDiv.classList.add('selected');
            if(isReadLine) renderDetails(lineDiv.getAttribute('data-line-text') || lineDiv.textContent || '');
        }
    };

    const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const toggleRecording = async () => {
        const recordButton = document.getElementById('record-take-button');
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordButton?.classList.remove('recording');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.start();
            recordButton?.classList.add('recording');

            mediaRecorder.addEventListener("dataavailable", event => audioChunks.push(event.data));
            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioId = await saveAudioBlob(audioBlob);
                const lineText = selectedReadLine?.getAttribute('data-line-text') || selectedReadLine?.textContent;
                if (lineText) {
                    const details = lineDetails.get(lineText);
                    if (details) {
                        details.takes.unshift({ audioId, rating: 0, notes: '', title: '' });
                        if (!details.state || details.state === 'Not Started') {
                            details.state = 'In Progress';
                        }
                        saveActiveSession();
                        renderDetails(lineText);
                        updateLineContainerUI();
                    }
                }
                stream.getTracks().forEach(track => track.stop());
            });
        } catch (err) {
            console.error("Error during recording:", err);
            alert("Could not start recording. Please ensure you have granted microphone permissions.");
        }
    };

    const resetUI = async () => {
        // Clear old blobs from IndexedDB
        for (const detail of lineDetails.values()) {
            for (const take of detail.takes) {
                if (take.audioId) {
                    await deleteAudioBlob(take.audioId).catch(e => console.warn(e));
                }
            }
        }

        [lineContainer, readContainer, readDetailsContainer].forEach(c => c && (c.innerHTML = ''));
        if (scriptNameInput) scriptNameInput.value = '';
        if (scriptVersionInput) scriptVersionInput.value = '';
        if (projectSelect) projectSelect.value = '';
        selectedLine = null;
        selectedReadLine = null;
        lineDetails.clear();
        localStorage.removeItem(SESSION_KEY);
    };

    const loadScriptFromTxt = async (file: File) => {
        await resetUI();
        if (scriptNameInput) scriptNameInput.value = file.name.replace(/\.[^/.]+$/, "");
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (!lineContainer) return;
            const lines = (e.target?.result as string).split(/\r?\n/);
            lines.forEach(lineText => {
                if (lineText.trim() !== '') {
                    const lineDiv = document.createElement('div');
                    lineDiv.textContent = lineText;
                    lineDiv.className = 'line-entry';
                    lineDiv.addEventListener('click', () => selectLine(lineDiv, false));
                    lineContainer.appendChild(lineDiv);
                }
            });
            updateLineContainerUI();
            saveActiveSession();
        };
        reader.readAsText(file);
    };

    const loadScriptFromZip = async (file: File) => {
        await resetUI();
        if (scriptNameInput) scriptNameInput.value = file.name.replace(/\.zip$/, "");

        try {
            const zip = await JSZip.loadAsync(file);
            const scriptFile = zip.file('script.json');
            if (!scriptFile) {
                alert('Invalid script file: script.json not found.');
                return;
            }

            const scriptData: any = JSON.parse(await scriptFile.async('string'));

            if (!scriptData.lineDetails) {
                processJsonScriptData(scriptData);
                return;
            }

            if (projectSelect && scriptData.projectId) {
                projectSelect.value = String(scriptData.projectId);
            }

            scriptData.lines.forEach((lineInfo: any) => {
                const lineDiv = document.createElement('div');
                lineDiv.textContent = lineInfo.text;
                lineDiv.className = 'line-entry';
                if (lineInfo.status !== 'normal') lineDiv.classList.add(lineInfo.status);
                lineDiv.addEventListener('click', () => selectLine(lineDiv, false));
                lineContainer?.appendChild(lineDiv);

                if (lineInfo.status === 'read') {
                    const readLineDiv = document.createElement('div');
                    readLineDiv.textContent = lineInfo.text;
                    readLineDiv.className = 'line-entry';
                    readLineDiv.addEventListener('click', () => selectLine(readLineDiv, true));
                    readContainer?.appendChild(readLineDiv);
                }
            });

            for (const savedDetail of scriptData.lineDetails) {
                const loadedTakes: TakeDetail[] = [];
                for (const savedTake of (savedDetail.takes || [])) {
                    const takeFile = zip.file(savedTake.path);
                    if (takeFile) {
                        const blob = await takeFile.async('blob');
                        const audioId = await saveAudioBlob(blob);
                        loadedTakes.push({
                            audioId,
                            rating: savedTake.rating,
                            notes: savedTake.notes,
                            title: savedTake.title || ''
                        });
                    }
                }
                lineDetails.set(savedDetail.text, { ...savedDetail, takes: loadedTakes });
            }
            if (projectSelect) projectSelect.dispatchEvent(new Event('change'));
            updateLineContainerUI();
            saveActiveSession();
        } catch (error) {
            console.error("Error loading script from zip:", error);
            alert("Failed to load script. The file may be corrupted or in the wrong format.");
        }
    };

    const processJsonScriptData = (data: any) => {
        let missingCharacters: string[] = [];

        if (data.name) {
                scriptNameInput.value = data.name;
        }
        if (data.version) {
                scriptVersionInput.value = data.version;
        }

            if (data.projectId && projects.some(p => p.id === data.projectId)) {
                projectSelect.value = data.projectId.toString();
                projectSelect.dispatchEvent(new Event('change'));
            } else if (data.projectId) {
                alert(`Warning: The project linked to this script is not available. Character linking will be skipped.`);
            }

            const lineContainer = document.getElementById('line-container');
            const readContainer = document.getElementById('read-container');
            const readDetailsContainer = document.getElementById('read-details');
            if (lineContainer) lineContainer.innerHTML = '';
            if (readContainer) readContainer.innerHTML = '';
            if (readDetailsContainer) readDetailsContainer.innerHTML = '';
            selectedLine = null;
            selectedReadLine = null;
            lineDetails.clear();

            if (data.lines && Array.isArray(data.lines)) {
                data.lines.forEach((line: any, index: number) => {
                    const isCharLine = line.type !== 'title' && line.characterId !== 'scene' && line.characterId !== null && line.characterName !== 'scene' && line.characterName !== 'title';

                    const lineDiv = document.createElement('div');
                    lineDiv.textContent = line.text;
                    lineDiv.className = 'line-entry';
                    if (isCharLine) lineDiv.classList.add('read');
                    lineDiv.addEventListener('click', () => selectLine(lineDiv, false));
                    lineContainer?.appendChild(lineDiv);

                    if (isCharLine) {
                        const readLineDiv = document.createElement('div');
                        readLineDiv.textContent = line.text;
                        readLineDiv.className = 'line-entry';
                        readLineDiv.addEventListener('click', () => selectLine(readLineDiv, true));
                        readContainer?.appendChild(readLineDiv);

                        const defaultLineName = `Line_${index + 1}`;
                        
                        let resolvedCharId = undefined;
                        if (data.projectId && projects.some(p => p.id === data.projectId) && line.characterId) {
                            const charIdNum = parseInt(line.characterId);
                            const exists = characters.find(c => c.id === charIdNum && c.projectId === data.projectId);
                            if (exists) {
                                resolvedCharId = charIdNum;
                            } else if (line.characterName) {
                                if (!missingCharacters.includes(line.characterName)) missingCharacters.push(line.characterName);
                            }
                        } else if (data.projectId && projects.some(p => p.id === data.projectId) && line.characterName) {
                            if (!missingCharacters.includes(line.characterName)) missingCharacters.push(line.characterName);
                        }

                        lineDetails.set(line.text, { 
                            text: line.text, 
                            lineName: defaultLineName, 
                            notes: '', 
                            takes: [],
                            characterId: resolvedCharId
                        });
                    }
                });
            }

            if (missingCharacters.length > 0) {
                alert(`Characters ${missingCharacters.join(', ')} were not available for import linking.`);
            }

        updateLineContainerUI();
        saveActiveSession();
    };

    const loadScriptFromJson = async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            processJsonScriptData(data);
        } catch (error) {
            console.error("Error loading script from json:", error);
            alert("Failed to load script. The file may be corrupted or in the wrong format.");
        }
    };

    document.getElementById('clear-session-button')?.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the session? Unsaved changes will be lost.")) {
            resetUI();
            scriptNameInput.value = '';
            scriptVersionInput.value = '';
            projectSelect.value = '';
        }
    });

    scriptNameInput.addEventListener('input', saveActiveSession);

    fileInput.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (!target.files) return;
        const file = target.files[0];

        if (file.name.endsWith('.json')) {
            loadScriptFromJson(file);
        } else if (file.name.endsWith('.zip')) {
            loadScriptFromZip(file);
        } else {
            loadScriptFromTxt(file);
        }
    });

    loadScriptIntoLineReader = (data: any) => {
        processJsonScriptData(data);
    };

    readButton?.addEventListener('click', () => {
        if (selectedLine) {
            const lineText = selectedLine.getAttribute('data-line-text') || selectedLine.textContent || '';
            const allSourceLines = Array.from(lineContainer?.children || []);
            const sourceIndex = allSourceLines.indexOf(selectedLine);

            if (selectedLine.classList.contains('read')) {
                selectedLine.classList.remove('read');
                if (readContainer) {
                    const existing = Array.from(readContainer.children).find(child => (child.getAttribute('data-line-text') || child.textContent) === lineText);
                    if (existing) existing.remove();
                }
            } else {
                selectedLine.classList.remove('omitted');
                selectedLine.classList.add('read');
                if (readContainer) {
                    if (!Array.from(readContainer.children).some(child => (child.getAttribute('data-line-text') || child.textContent) === lineText)) {
                        const readLineDiv = document.createElement('div');
                        readLineDiv.textContent = lineText;
                        readLineDiv.setAttribute('data-line-text', lineText);
                        readLineDiv.className = 'line-entry';
                        readLineDiv.addEventListener('click', () => selectLine(readLineDiv, true));
                        
                        let inserted = false;
                        for (const child of Array.from(readContainer.children)) {
                            const childLineText = child.getAttribute('data-line-text') || child.textContent || '';
                            const childSourceLine = allSourceLines.find(l => (l.getAttribute('data-line-text') || l.textContent) === childLineText);
                            const childSourceIndex = childSourceLine ? allSourceLines.indexOf(childSourceLine) : -1;
                            
                            if (childSourceIndex > sourceIndex) {
                                readContainer.insertBefore(readLineDiv, child);
                                inserted = true;
                                break;
                            }
                        }
                        
                        if (!inserted) {
                            readContainer.appendChild(readLineDiv);
                        }

                        if (!lineDetails.has(lineText)) {
                            const defaultLineName = lineText.split(' ').slice(0, 3).join('_');
                            lineDetails.set(lineText, { text: lineText, lineName: defaultLineName, notes: '', takes: [] });
                        }
                    }
                }
            }
            updateLineContainerUI();
        }
    });

    saveButton?.addEventListener('click', async () => {
        const zip = new JSZip();
        
        // Use custom root path from settings, defaulting to 'audio'
        const rootPath = settings.audioExportPath || 'audio';
        const audioFolder = zip.folder(rootPath);
        if (!audioFolder) return;

        const readLinesDetails = Array.from(lineDetails.values());
        const nameCounts = new Map<string, number>();
        readLinesDetails.forEach(d => nameCounts.set(d.lineName, (nameCounts.get(d.lineName) || 0) + 1));
        const duplicates = [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name);

        if (duplicates.length > 0) {
            alert(`Save failed. Duplicate line names found:\n- ${duplicates.join('\n- ')}`);
            return;
        }

        const jsonLineDetails: SavedLineDetail[] = [];
        let hasAudio = false;

        for (const detail of readLinesDetails) {
            let targetFolder = audioFolder;

            if (settings.scriptExportGrouping === 'character') {
                const char = characters.find(c => c.id === detail.characterId);
                const folderName = char ? char.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unassigned';
                targetFolder = audioFolder.folder(folderName) || audioFolder;
            } else {
                targetFolder = audioFolder.folder(detail.lineName) || audioFolder;
            }

            const jsonTakes: SavedTakeDetail[] = [];
            for (let i = 0; i < detail.takes.length; i++) {
                hasAudio = true;
                const take = detail.takes[i];
                
                const format = settings.exportFormat === 'wav' ? 'wav' : 'webm';
                const takeIdentifier = take.title ? take.title.replace(/[^a-zA-Z0-9]/g, '_') : `${i + 1}`;
                let fileName = `${takeIdentifier}.${format}`;
                if (settings.scriptExportGrouping === 'character') {
                    fileName = `${detail.lineName}_${takeIdentifier}.${format}`;
                }

                // Path for JSON
                let path = `${rootPath}/${detail.lineName}/${fileName}`;
                if (settings.scriptExportGrouping === 'character') {
                    const char = characters.find(c => c.id === detail.characterId);
                    const folderName = char ? char.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unassigned';
                    path = `${rootPath}/${folderName}/${fileName}`;
                }

                jsonTakes.push({ path, rating: take.rating, notes: take.notes, title: take.title });

                const blob = await getAudioBlob(take.audioId);
                if (blob) {
                    if (format === 'wav') {
                        const base64Audio = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                        const wavBlob = await convertWebMToWav(base64Audio);
                        targetFolder.file(fileName, wavBlob);
                    } else {
                        targetFolder.file(fileName, blob);
                    }
                }
            }
            
            const detailChar = characters.find(c => c.id === detail.characterId);
            jsonLineDetails.push({ 
                text: detail.text, 
                lineName: detail.lineName, 
                characterId: detail.characterId, 
                characterName: detailChar ? detailChar.name : undefined,
                notes: detail.notes, 
                takes: jsonTakes,
                state: detail.state
            });
        }

        const linesToSave = Array.from(lineContainer?.querySelectorAll('.line-entry') || []).map(line => {
            const status: 'read' | 'omitted' | 'normal' = line.classList.contains('read') ? 'read' : line.classList.contains('omitted') ? 'omitted' : 'normal';
            const text = line.getAttribute('data-line-text') || line.textContent || '';
            return { text, status: status };
        });

        const saveData: any = {
            name: scriptNameInput.value || 'Script',
            version: scriptVersionInput.value || '1.0',
            projectId: parseInt(projectSelect.value) || undefined,
            lines: linesToSave,
            lineDetails: jsonLineDetails
        };
        
        if (hasAudio && settings.recordingGear) {
            saveData.recordingGear = settings.recordingGear;
        }

        zip.file('script.json', JSON.stringify(saveData, null, 2));

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scriptNameInput.value.trim() || 'script_save'}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    ignoreButton?.addEventListener('click', () => {
        if (selectedLine) {
            if (selectedLine.classList.contains('omitted')) {
                selectedLine.classList.remove('omitted');
            } else {
                selectedLine.classList.remove('read');
                selectedLine.classList.add('omitted');
            }
            updateLineContainerUI();
        }
    });

    resetButton?.addEventListener('click', () => {
        const confirmed = confirm("Are you sure you want to reset? All line statuses, notes, and recorded audio takes for this script will be lost.");
        if (confirmed) {
            resetUI().then(() => updateLineContainerUI());
        }
    });

    loadActiveSession();
}
