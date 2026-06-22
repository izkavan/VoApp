import { Project, ReceivedAudition, Character } from '../../types.js';
import JSZip from 'jszip';
import '../../components/audition-card.js';

let receivedAuditions: ReceivedAudition[] = [];
let projects: Project[] = [];
let characters: Character[] = [];
let saveCallback: (auditions: ReceivedAudition[]) => void;

let activeCharacter = '';

// DOM Elements
let importInput: HTMLInputElement;
let importBtn: HTMLButtonElement;
let manualBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;
let finalizeBtn: HTMLButtonElement;
let finalistCountInput: HTMLInputElement;

let charactersContainer: HTMLElement;
let listContainer: HTMLElement;

export function initializeVPAuditionsView(
    initialAuditions: ReceivedAudition[],
    initialProjects: Project[],
    initialCharacters: Character[],
    onSave: (auditions: ReceivedAudition[]) => void
) {
    receivedAuditions = initialAuditions;
    projects = initialProjects;
    characters = initialCharacters;
    saveCallback = onSave;

    saveCallback = onSave;
    importInput = document.getElementById('vp-auditions-import-input') as HTMLInputElement;
    importBtn = document.getElementById('vp-auditions-import-btn') as HTMLButtonElement;
    manualBtn = document.getElementById('vp-auditions-manual-btn') as HTMLButtonElement;
    resetBtn = document.getElementById('vp-auditions-reset-btn') as HTMLButtonElement;
    finalizeBtn = document.getElementById('vp-auditions-finalize-btn') as HTMLButtonElement;
    finalistCountInput = document.getElementById('vp-auditions-finalist-count') as HTMLInputElement;
    charactersContainer = document.getElementById('vp-auditions-characters') as HTMLElement;
    listContainer = document.getElementById('vp-auditions-list') as HTMLElement;

    if (!importBtn) return;

    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);
    
    manualBtn.addEventListener('click', openManualAuditionModal);

    resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all loaded auditions? This action cannot be undone.")) {
            receivedAuditions = [];
            saveCallback(receivedAuditions);
            activeCharacter = '';
            renderCharacters();
            renderAuditions();
        }
    });

    finalizeBtn.addEventListener('click', handleFinalize);

    finalizeBtn.addEventListener('click', handleFinalize);

    renderCharacters();
    renderAuditions();
}



async function handleImport(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.zip')) {
            await processZipImport(file);
        } else if (file.name.endsWith('.json')) {
            await processJsonImport(file);
        }
    }

    saveCallback(receivedAuditions);
    renderCharacters();
    renderAuditions();
    (e.target as HTMLInputElement).value = '';
}

async function processJsonImport(file: File) {
    const text = await file.text();
    try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
            // Audition Master Array
            data.forEach(item => addOrUpdateAudition(item));
        } else {
            // Single audition
            addOrUpdateAudition(data);
        }
    } catch (e) {
        console.error("Failed to parse JSON", e);
    }
}

async function processZipImport(file: File) {
    const zip = new JSZip();
    try {
        const loadedZip = await zip.loadAsync(file);
        
        // Check for Audition_Master.json at root
        if (loadedZip.files['Audition_Master.json']) {
            const masterStr = await loadedZip.files['Audition_Master.json'].async('string');
            try {
                const masterData = JSON.parse(masterStr);
                if (Array.isArray(masterData)) {
                    masterData.forEach(item => addOrUpdateAudition(item));
                }
            } catch (e) {
                console.error("Failed parsing Audition_Master.json", e);
            }
        }

        const jsonFiles = Object.keys(loadedZip.files).filter(name => name.endsWith('.json') && !name.startsWith('__MACOSX/') && name !== 'Audition_Master.json');
        
        for (const jsonPath of jsonFiles) {
            const jsonStr = await loadedZip.files[jsonPath].async('string');
            const data = JSON.parse(jsonStr);
            
            const baseName = jsonPath.substring(0, jsonPath.lastIndexOf('.'));
            const audioExtensions = ['.wav', '.webm', '.mp3', '.ogg'];
            let audioData = data.audioData || '';
            let fileName = data.fileName || 'audio.wav';
            
            if (!audioData) {
                for (const ext of audioExtensions) {
                    const audioPath = baseName + ext;
                    if (loadedZip.files[audioPath]) {
                        const blob = await loadedZip.files[audioPath].async('blob');
                        audioData = await blobToBase64(blob);
                        fileName = audioPath.split('/').pop() || audioPath;
                        break;
                    }
                }
            }
            
            data.audioData = audioData;
            data.fileName = fileName;
            addOrUpdateAudition(data);
        }
    } catch (e) {
        console.error("Failed to process zip", e);
    }
}

function addOrUpdateAudition(data: any) {
    if (!data.character || !data.actorFirstName || !data.actorLastName) return;
    
    const existing = receivedAuditions.find(a => 
        a.character === data.character && 
        a.actorFirstName === data.actorFirstName && 
        a.actorLastName === data.actorLastName &&
        a.project === data.project
    );

    if (existing) {
        // Only override if new data is provided, otherwise keep existing (like ratings/comments)
        existing.audioData = data.audioData || existing.audioData;
        existing.rating = data.rating !== undefined ? data.rating : existing.rating;
        existing.comments = data.comments !== undefined ? data.comments : existing.comments;
    } else {
        const newAudition: ReceivedAudition = {
            id: data.id || Date.now() + Math.floor(Math.random() * 1000),
            actorFirstName: data.actorFirstName || '',
            actorLastName: data.actorLastName || '',
            actorEmail: data.actorEmail || '',
            actorRate: data.actorRate || '',
            actorPhone: data.actorPhone || '',
            actorAddress: data.actorAddress || '',
            actorAvailability: data.actorAvailability || '',
            character: data.character,
            project: data.project || '',
            dateSubmitted: data.dateSubmitted || new Date().toISOString().split('T')[0],
            fileName: data.fileName || '',
            audioData: data.audioData || '',
            rating: data.rating || 0,
            comments: data.comments || ''
        };
        receivedAuditions.push(newAudition);
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

function renderCharacters() {
    if (!charactersContainer) return;
    charactersContainer.innerHTML = '';

    const filtered = receivedAuditions;

    if (filtered.length === 0) {
        charactersContainer.innerHTML = '<div style="text-align: center; color: var(--gray-500); margin-top: 20px;">Upload auditions to view characters</div>';
        return;
    }

    const uniqueChars = Array.from(new Set(filtered.map(a => a.character).filter(Boolean)));

    uniqueChars.forEach(charName => {
        const div = document.createElement('div');
        div.className = 'vp-auditions-character-item';
        if (charName === activeCharacter) {
            div.classList.add('selected');
        }
        div.textContent = charName;
        
        div.addEventListener('click', () => {
            activeCharacter = charName;
            renderCharacters();
            renderAuditions();
        });

        charactersContainer.appendChild(div);
    });
}

function renderAuditions() {
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (!activeCharacter) {
        listContainer.innerHTML = '<div style="text-align: center; color: var(--gray-500); margin-top: 20px;">Select a character to review auditions</div>';
        return;
    }

    let filtered = receivedAuditions.filter(a => a.character === activeCharacter);

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; color: var(--gray-500); margin-top: 20px;">No auditions found for this character.</div>';
        return;
    }

    filtered.sort((a, b) => a.id - b.id);

    filtered.forEach((aud, index) => {
        const card = document.createElement('audition-card') as any;
        card.data = { audition: aud, index: index + 1 };
        
        card.addEventListener('ratingChanged', () => saveCallback(receivedAuditions));
        card.addEventListener('commentChanged', () => saveCallback(receivedAuditions));

        listContainer.appendChild(card);
    });
}

async function handleFinalize() {
    if (receivedAuditions.length === 0) {
        alert("No auditions to finalize.");
        return;
    }

    const count = parseInt(finalistCountInput.value, 10);
    if (isNaN(count) || count < 1) {
        alert("Please enter a valid number of final candidates.");
        return;
    }

    const zip = new JSZip();

    // Export Audition Master JSON
    zip.file("Audition_Master.json", JSON.stringify(receivedAuditions, null, 2));

    // Group by Character
    const byCharacter = new Map<string, ReceivedAudition[]>();
    receivedAuditions.forEach(a => {
        const char = a.character || 'Unknown';
        if (!byCharacter.has(char)) byCharacter.set(char, []);
        byCharacter.get(char)!.push(a);
    });

    for (const [char, auditions] of byCharacter.entries()) {
        // Sort by rating descending
        auditions.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        // Get Top N
        const topN = auditions.slice(0, count);

        for (let i = 0; i < auditions.length; i++) {
            const aud = auditions[i];
            const actorName = `${aud.actorFirstName} ${aud.actorLastName}`.trim();
            const ext = aud.fileName ? aud.fileName.split('.').pop() : 'wav';
            const audioFileName = `${actorName}.${ext}`;

            // Create base folder path: <character_name>/<Actor_Name>/
            const charFolder = zip.folder(char);
            if (charFolder) {
                const actorFolder = charFolder.folder(actorName);
                if (actorFolder) {
                    actorFolder.file("Audition.json", JSON.stringify(aud, null, 2));
                    if (aud.audioData) {
                        const base64Data = aud.audioData.split(',')[1];
                        if (base64Data) actorFolder.file(audioFileName, base64Data, { base64: true });
                    }
                }
            }

            // Create Top Choices path if in Top N
            const rank = i + 1;
            if (rank <= count) {
                const topChoicesFolder = zip.folder("Top_Choices");
                if (topChoicesFolder) {
                    const tcCharFolder = topChoicesFolder.folder(char);
                    if (tcCharFolder) {
                        const tcActorFolder = tcCharFolder.folder(`${rank}_${actorName}`);
                        if (tcActorFolder) {
                            tcActorFolder.file("Audition.json", JSON.stringify(aud, null, 2));
                            if (aud.audioData) {
                                const base64Data = aud.audioData.split(',')[1];
                                if (base64Data) tcActorFolder.file(audioFileName, base64Data, { base64: true });
                            }
                        }
                    }
                }
            }
        }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finalized_Auditions.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function openManualAuditionModal() {
    const modal = document.getElementById('vp-manual-audition-modal');
    if (!modal) return;

    // Populate character dropdown
    const charSelect = document.getElementById('vp-manual-character') as HTMLSelectElement;
    charSelect.innerHTML = '<option value="">Select a Character</option>';
    
    // Show all characters since project filter is removed
    const relevantCharacters = characters;
        
    relevantCharacters.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        charSelect.appendChild(opt);
    });

    charSelect.value = activeCharacter || '';
    (document.getElementById('vp-manual-fname') as HTMLInputElement).value = '';
    (document.getElementById('vp-manual-lname') as HTMLInputElement).value = '';
    (document.getElementById('vp-manual-email') as HTMLInputElement).value = '';
    (document.getElementById('vp-manual-phone') as HTMLInputElement).value = '';
    (document.getElementById('vp-manual-rate') as HTMLInputElement).value = '';
    (document.getElementById('vp-manual-availability') as HTMLInputElement).value = '';
    (document.getElementById('vp-manual-address') as HTMLInputElement).value = '';
    
    const audioInput = document.getElementById('vp-manual-audio-upload') as HTMLInputElement;
    const audioStatus = document.getElementById('vp-manual-audio-status') as HTMLSpanElement;
    audioInput.value = '';
    audioStatus.textContent = 'No audio loaded';
    
    let loadedAudioData = '';
    let loadedFileName = '';

    const uploadBtn = document.getElementById('vp-manual-audio-upload-btn');
    uploadBtn!.onclick = () => audioInput.click();

    audioInput.onchange = () => {
        const file = audioInput.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadedAudioData = e.target?.result as string;
                loadedFileName = file.name;
                audioStatus.textContent = file.name;
            };
            reader.readAsDataURL(file);
        }
    };

    const closeBtn = document.getElementById('vp-manual-audition-modal-close');
    closeBtn!.onclick = () => modal.style.display = 'none';

    const saveBtn = document.getElementById('vp-manual-save-btn');
    saveBtn!.onclick = () => {
        const project = ''; // Project filter removed
        const character = (document.getElementById('vp-manual-character') as HTMLSelectElement).value;
        const fName = (document.getElementById('vp-manual-fname') as HTMLInputElement).value.trim();
        const lName = (document.getElementById('vp-manual-lname') as HTMLInputElement).value.trim();
        
        if (!character || !fName || !lName) {
            alert("Character, First Name, and Last Name are required!");
            return;
        }

        const newAud: ReceivedAudition = {
            // Random ID to randomize placement in the list which sorts by ID
            id: Date.now() + Math.floor(Math.random() * 1000000),
            project: project,
            character: character,
            actorFirstName: fName,
            actorLastName: lName,
            actorEmail: (document.getElementById('vp-manual-email') as HTMLInputElement).value,
            actorPhone: (document.getElementById('vp-manual-phone') as HTMLInputElement).value,
            actorRate: (document.getElementById('vp-manual-rate') as HTMLInputElement).value,
            actorAvailability: (document.getElementById('vp-manual-availability') as HTMLInputElement).value,
            actorAddress: (document.getElementById('vp-manual-address') as HTMLInputElement).value,
            dateSubmitted: new Date().toISOString().split('T')[0],
            fileName: loadedFileName,
            audioData: loadedAudioData,
            rating: 0,
            comments: ''
        };

        receivedAuditions.push(newAud);
        saveCallback(receivedAuditions);
        
        renderCharacters();
        renderAuditions();
        
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}
