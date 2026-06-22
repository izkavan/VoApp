import JSZip from 'jszip';
import '../../components/table-read-components.js';

interface TableTake {
    id: string;
    sourceZip: string;
    path: string;
    audioData: string; // Base64
    rating?: number;
    notes?: string;
    title?: string;
}

interface TableLine {
    text: string;
    characterName?: string;
    takes: TableTake[];
    preferredTakeId: string | null;
    isUnmatched?: boolean;
}

let tableLines: TableLine[] = [];
let audioContext: AudioContext | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let selectedLineIndex: number | null = null;

let masterScriptName: string | null = null;
let masterScriptVersion: string | null = null;
let masterProjectId: number | null = null;
let masterCharacters: Set<string> = new Set();
let globalCharacters: any[] = [];

let linesContainer: HTMLElement;
let takesContainer: HTMLElement;
let selectedLineHeader: HTMLElement;
let isPlayingSequence = false;

let globalProjects: any[] = [];

export function setTableReadData(chars: any[], projs: any[]) {
    globalCharacters = chars;
    globalProjects = projs;
}

let openCharacterModalCb: ((character: any) => void) | null = null;

export function initializeTableReadView(openModalCb: (character: any) => void) {
    openCharacterModalCb = openModalCb;
    const importMasterBtn = document.getElementById('vp-table-read-import-master-btn') as HTMLButtonElement;
    const importMasterInput = document.getElementById('vp-table-read-import-master-input') as HTMLInputElement;
    const importBtn = document.getElementById('vp-table-read-import-btn') as HTMLButtonElement;
    const importInput = document.getElementById('vp-table-read-import-input') as HTMLInputElement;
    const resetBtn = document.getElementById('vp-table-read-reset-btn') as HTMLButtonElement;
    const playBtn = document.getElementById('vp-table-read-play-btn') as HTMLButtonElement;
    const importStateBtn = document.getElementById('vp-table-read-import-state-btn') as HTMLButtonElement;
    const importStateInput = document.getElementById('vp-table-read-import-state-input') as HTMLInputElement;
    const saveBtn = document.getElementById('vp-table-read-save-btn') as HTMLButtonElement;
    
    linesContainer = document.getElementById('vp-table-read-lines-container') as HTMLElement;
    takesContainer = document.getElementById('vp-table-read-takes-container') as HTMLElement;
    selectedLineHeader = document.getElementById('vp-table-read-selected-line-header') as HTMLElement;

    if (!importBtn) return;

    importMasterBtn.addEventListener('click', () => importMasterInput.click());
    importMasterInput.addEventListener('change', handleMasterImport);

    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);

    if (importStateBtn) {
        importStateBtn.addEventListener('click', () => importStateInput.click());
        importStateInput.addEventListener('change', handleStateImport);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', handleStateSave);
    }
    
    resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the Table Read? This will remove all imported scripts and takes.")) {
            tableLines = [];
            masterScriptName = null;
            masterScriptVersion = null;
            masterProjectId = null;
            masterCharacters.clear();
            selectedLineIndex = null;
            
            const header = document.getElementById('vp-table-read-header');
            if (header) header.style.display = 'none';
            const importBtn = document.getElementById('vp-table-read-import-btn') as HTMLButtonElement;
            if (importBtn) importBtn.disabled = true;
            stopPlayback();
            renderUI();
        }
    });

    playBtn.addEventListener('click', playTableReadSequence);

    renderUI();
}

async function handleMasterImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        let jsonStr = '';
        if (file.name.endsWith('.zip')) {
            const zip = await new JSZip().loadAsync(file);
            const scriptFile = zip.file('script.json');
            if (!scriptFile) throw new Error('No script.json found in ZIP.');
            jsonStr = await scriptFile.async('string');
        } else if (file.name.endsWith('.json')) {
            jsonStr = await file.text();
        } else {
            throw new Error('Unsupported file format.');
        }

        const data = JSON.parse(jsonStr);
        masterScriptName = data.name || 'Unknown Script';
        masterScriptVersion = data.version || '1.0';
        masterProjectId = data.projectId || null;
        masterCharacters.clear();

        tableLines = [];
        if (data.lines && Array.isArray(data.lines)) {
            for (const line of data.lines) {
                if (line.type !== 'title' && line.characterId !== 'scene' && line.characterId !== null) {
                    masterCharacters.add(line.characterId.toString());
                }
                tableLines.push({
                    text: line.text,
                    characterName: line.characterName || '',
                    takes: [],
                    preferredTakeId: null,
                    isUnmatched: false
                });
            }
        }

        const header = document.getElementById('vp-table-read-header');
        if (header) header.style.display = 'block';
        
        const projectNameEl = document.getElementById('vp-table-read-project-name');
        if (projectNameEl) {
            if (masterProjectId) {
                const p = globalProjects.find(pr => pr.id === masterProjectId);
                projectNameEl.textContent = p ? p.name : `Project #${masterProjectId}`;
            } else {
                projectNameEl.textContent = 'No Project';
            }
        }
        
        const scriptNameEl = document.getElementById('vp-table-read-script-name');
        if (scriptNameEl) scriptNameEl.textContent = masterScriptName;
        
        const versionEl = document.getElementById('vp-table-read-script-version');
        if (versionEl) versionEl.textContent = masterScriptVersion;

        const charContainer = document.getElementById('vp-table-read-characters');
        if (charContainer) {
            charContainer.innerHTML = '';
            masterCharacters.forEach(charId => {
                const charObj = globalCharacters.find(c => c.id.toString() === charId);
                if (charObj && charObj.artwork) {
                    const img = document.createElement('img');
                    img.src = charObj.artwork;
                    img.style.width = '40px';
                    img.style.height = '40px';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                    img.style.cursor = 'pointer';
                    img.title = charObj.name;
                    img.addEventListener('click', () => {
                        if (openCharacterModalCb) openCharacterModalCb(charObj);
                    });
                    charContainer.appendChild(img);
                }
            });
        }

        const importBtn = document.getElementById('vp-table-read-import-btn') as HTMLButtonElement;
        if (importBtn) importBtn.disabled = false;

        renderUI();
    } catch (e: any) {
        alert("Failed to import master script: " + e.message);
    }
    (e.target as HTMLInputElement).value = '';
}

async function handleImport(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.zip')) {
            await processZipImport(file);
        }
    }
    
    (e.target as HTMLInputElement).value = '';
    renderUI();
}

async function processZipImport(file: File) {
    const zip = new JSZip();
    try {
        const loadedZip = await zip.loadAsync(file);
        
        // Find script.json
        const scriptDetailsFile = loadedZip.files['script.json'];
        if (!scriptDetailsFile) {
            alert(`No script.json found in ${file.name}. Ensure you are importing a zip exported from the Line Reader.`);
            return;
        }

        const jsonStr = await scriptDetailsFile.async('string');
        const scriptData = JSON.parse(jsonStr);

        if (scriptData.name !== masterScriptName || scriptData.version !== masterScriptVersion) {
            const proceed = confirm(`Warning: The imported line reads (${scriptData.name} v${scriptData.version}) do not match the master script (${masterScriptName} v${masterScriptVersion}). Proceed anyway?`);
            if (!proceed) return;
        }

        // Process audio takes for each line detail
        if (scriptData.lineDetails) {
            let lastMatchedIndex = -1;
            
            for (const detail of scriptData.lineDetails) {
                // Find matching line in our baseline
                let matchedIndex = tableLines.findIndex(l => l.text === detail.text && !l.isUnmatched);
                let lineObj = matchedIndex !== -1 ? tableLines[matchedIndex] : null;
                
                if (lineObj) {
                    lastMatchedIndex = matchedIndex;
                    if (!lineObj.characterName && detail.characterName) {
                        lineObj.characterName = detail.characterName;
                    }
                } else {
                    // Line does not exist in master script, insert it as unmatched
                    lineObj = {
                        text: detail.text,
                        characterName: detail.characterName || '',
                        takes: [],
                        preferredTakeId: null,
                        isUnmatched: true
                    };
                    const insertIndex = lastMatchedIndex !== -1 ? lastMatchedIndex + 1 : tableLines.length;
                    tableLines.splice(insertIndex, 0, lineObj);
                    lastMatchedIndex = insertIndex; // Update last matched to here so sequential unmatched lines flow in order
                }

                if (detail.takes) {
                    for (const take of detail.takes) {
                        if (take.path && loadedZip.files[take.path]) {
                            const blob = await loadedZip.files[take.path].async('blob');
                            const base64 = await blobToBase64(blob);
                            
                            lineObj.takes.push({
                                id: Date.now() + Math.random().toString(36).substring(7),
                                sourceZip: file.name,
                                path: take.path,
                                audioData: base64,
                                rating: take.rating,
                                notes: take.notes,
                                title: take.title
                            });
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error processing ZIP", e);
        alert(`Failed to process ${file.name}`);
    }
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function renderUI() {
    renderLinesList();
    renderTakesList();
}

function renderLinesList() {
    linesContainer.innerHTML = '';
    
    if (tableLines.length === 0) {
        linesContainer.innerHTML = '<div style="color: var(--gray-500); text-align: center; margin-top: 20px;">Import ZIP to load script lines.</div>';
        return;
    }

    tableLines.forEach((line, index) => {
        const lineEl = document.createElement('table-read-line') as any;
        lineEl.data = { line, index, isSelected: selectedLineIndex === index };
        lineEl.addEventListener('lineSelected', (e: any) => {
            selectedLineIndex = e.detail;
            renderUI();
        });
        linesContainer.appendChild(lineEl);
    });
}

function renderTakesList() {
    takesContainer.innerHTML = '';
    
    if (selectedLineIndex === null || selectedLineIndex >= tableLines.length) {
        selectedLineHeader.textContent = 'Selected Line Takes';
        takesContainer.innerHTML = '<div style="color: var(--gray-500); text-align: center; margin-top: 20px;">Select a line to view available takes.</div>';
        return;
    }

    const line = tableLines[selectedLineIndex];
    selectedLineHeader.textContent = line.text;

    if (line.takes.length === 0) {
        takesContainer.innerHTML = '<div style="color: var(--gray-500); text-align: center; margin-top: 20px;">No takes found for this line.</div>';
        return;
    }

    line.takes.forEach(take => {
        const takeEl = document.createElement('table-read-take') as any;
        takeEl.data = { take, isPreferred: line.preferredTakeId === take.id };
        
        takeEl.addEventListener('takePlayed', () => stopPlayback());
        
        takeEl.addEventListener('togglePreferred', (e: any) => {
            if (line.preferredTakeId === e.detail) {
                line.preferredTakeId = null;
            } else {
                line.preferredTakeId = e.detail;
            }
            renderUI();
        });

        takesContainer.appendChild(takeEl);
    });
}



function stopPlayback() {
    isPlayingSequence = false;
    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement = null;
    }
}

async function playTableReadSequence() {
    if (tableLines.length === 0) return;
    stopPlayback();
    isPlayingSequence = true;

    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    let i = 0;
    
    const playNext = () => {
        if (!isPlayingSequence || i >= tableLines.length) {
            isPlayingSequence = false;
            return;
        }

        const line = tableLines[i];
        
        // Auto-select line in UI so user can follow along
        selectedLineIndex = i;
        renderUI();

        const goldenTake = line.takes.find(t => t.id === line.preferredTakeId);

        if (goldenTake) {
            currentAudioElement = new Audio(goldenTake.audioData);
            currentAudioElement.onended = () => {
                i++;
                playNext();
            };
            currentAudioElement.play().catch(e => {
                console.error("Sequence playback error", e);
                i++;
                playNext();
            });
        } else {
            // Play Beep
            const osc = audioContext!.createOscillator();
            const gain = audioContext!.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 275;
            
            osc.connect(gain);
            gain.connect(audioContext!.destination);
            
            // 0.25 seconds beep
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, audioContext!.currentTime + 0.25);
            osc.stop(audioContext!.currentTime + 0.25);
            
            setTimeout(() => {
                i++;
                playNext();
            }, 300); // Wait a tiny bit longer than the beep
        }
    };

    playNext();
}

async function handleStateSave() {
    if (tableLines.length === 0) {
        alert("No table read data to save.");
        return;
    }

    const zip = new JSZip();

    // 1. Save metadata state
    const stateData = {
        masterScriptName,
        masterScriptVersion,
        masterProjectId,
        masterCharacters: Array.from(masterCharacters),
        tableLines
    };
    zip.file("Raw Data/table_read_state.json", JSON.stringify(stateData, null, 2));

    // 2. Save raw audio files by character
    const rawFolder = zip.folder("Raw Data");
    if (rawFolder) {
        for (const line of tableLines) {
            const charFolder = line.characterName ? rawFolder.folder(line.characterName) : rawFolder.folder("Unassigned");
            if (charFolder) {
                for (const take of line.takes) {
                    const ext = take.path.split('.').pop() || 'webm';
                    const base64Data = take.audioData.split(',')[1];
                    charFolder.file(`${take.id}.${ext}`, base64Data, { base64: true });
                }
            }
        }
    }

    // 3. Save preferred master files
    const prefFolder = zip.folder("Preferred Master");
    if (prefFolder) {
        let seq = 1;
        for (const line of tableLines) {
            if (line.preferredTakeId) {
                const take = line.takes.find(t => t.id === line.preferredTakeId);
                if (take) {
                    const ext = take.path.split('.').pop() || 'webm';
                    const base64Data = take.audioData.split(',')[1];
                    const seqStr = String(seq).padStart(3, '0');
                    const charName = (line.characterName || 'Unassigned').replace(/[^a-zA-Z0-9]/g, '_');
                    const title = (take.title || 'Take').replace(/[^a-zA-Z0-9]/g, '_');
                    prefFolder.file(`${seqStr}_${charName}_${title}.${ext}`, base64Data, { base64: true });
                    seq++;
                }
            }
        }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${masterScriptName || 'TableRead'}_TableRead.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function handleStateImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        const zip = await new JSZip().loadAsync(file);
        const stateFile = zip.file("Raw Data/table_read_state.json");
        if (!stateFile) {
            alert("No table_read_state.json found in the imported ZIP. Ensure this is a Table Read export.");
            return;
        }

        const jsonStr = await stateFile.async('string');
        const stateData = JSON.parse(jsonStr);

        masterScriptName = stateData.masterScriptName;
        masterScriptVersion = stateData.masterScriptVersion;
        masterProjectId = stateData.masterProjectId;
        masterCharacters = new Set(stateData.masterCharacters || []);
        tableLines = stateData.tableLines || [];
        selectedLineIndex = null;
        stopPlayback();

        const header = document.getElementById('vp-table-read-header');
        if (header) header.style.display = 'block';
        
        const projectNameEl = document.getElementById('vp-table-read-project-name');
        if (projectNameEl) {
            if (masterProjectId) {
                const p = globalProjects.find(pr => pr.id === masterProjectId);
                projectNameEl.textContent = p ? p.name : `Project #${masterProjectId}`;
            } else {
                projectNameEl.textContent = 'No Project';
            }
        }
        
        const scriptNameEl = document.getElementById('vp-table-read-script-name');
        if (scriptNameEl) scriptNameEl.textContent = masterScriptName;
        
        const versionEl = document.getElementById('vp-table-read-script-version');
        if (versionEl) versionEl.textContent = masterScriptVersion;

        const charContainer = document.getElementById('vp-table-read-characters');
        if (charContainer) {
            charContainer.innerHTML = '';
            masterCharacters.forEach(charId => {
                const charObj = globalCharacters.find(c => c.id.toString() === charId);
                if (charObj && charObj.artwork) {
                    const img = document.createElement('img');
                    img.src = charObj.artwork;
                    img.style.width = '40px';
                    img.style.height = '40px';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                    img.style.cursor = 'pointer';
                    img.title = charObj.name;
                    img.addEventListener('click', () => {
                        if (openCharacterModalCb) openCharacterModalCb(charObj);
                    });
                    charContainer.appendChild(img);
                }
            });
        }

        const importBtn = document.getElementById('vp-table-read-import-btn') as HTMLButtonElement;
        if (importBtn) importBtn.disabled = false;

        renderUI();
    } catch (err: any) {
        alert("Failed to import Table Read state: " + err.message);
    }

    (e.target as HTMLInputElement).value = '';
}
