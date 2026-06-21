import { ReceivedAudition } from './types.js';
import JSZip from 'jszip';

let receivedAuditions: ReceivedAudition[] = [];
let saveCallback: (auditions: ReceivedAudition[]) => void;

// Selection State: characterName -> audition id
let selectedAuditions: Map<string, number> = new Map();
let currentAudio: HTMLAudioElement | null = null;
let currentlyPlayingId: number | null = null;

// DOM Elements
let boardContainer: HTMLElement;
let importInput: HTMLInputElement;
let importBtn: HTMLButtonElement;
let playSeqBtn: HTMLButtonElement;
let exportBtn: HTMLButtonElement;

export function initializeContrasterView(
    initialAuditions: ReceivedAudition[],
    onSave: (auditions: ReceivedAudition[]) => void
) {
    receivedAuditions = initialAuditions;
    saveCallback = onSave;

    boardContainer = document.getElementById('vp-contraster-board') as HTMLElement;
    importInput = document.getElementById('vp-contraster-import-input') as HTMLInputElement;
    importBtn = document.getElementById('vp-contraster-import-btn') as HTMLButtonElement;
    playSeqBtn = document.getElementById('vp-contraster-play-btn') as HTMLButtonElement;
    exportBtn = document.getElementById('vp-contraster-export-btn') as HTMLButtonElement;

    if (!importBtn) return;

    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);
    playSeqBtn.addEventListener('click', playSequence);
    exportBtn.addEventListener('click', handleExport);

    renderBoard();
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
    renderBoard();
    (e.target as HTMLInputElement).value = '';
}

async function processJsonImport(file: File) {
    // In a real scenario, the audio file would be alongside the JSON.
    // Since we only get the JSON file here if uploaded individually, we'll try to parse it.
    // If it has audioData embedded (base64), great. Otherwise it's missing audio.
    const text = await file.text();
    try {
        const data = JSON.parse(text);
        addOrUpdateAudition(data);
    } catch (e) {
        console.error("Failed to parse JSON", e);
    }
}

async function processZipImport(file: File) {
    const zip = new JSZip();
    try {
        const loadedZip = await zip.loadAsync(file);
        // Find all JSON files
        const jsonFiles = Object.keys(loadedZip.files).filter(name => name.endsWith('.json') && !name.startsWith('__MACOSX/'));
        
        for (const jsonPath of jsonFiles) {
            const jsonStr = await loadedZip.files[jsonPath].async('string');
            const data = JSON.parse(jsonStr);
            
            // Try to find accompanying audio file
            // Assume audio file has same name but different extension (.wav, .webm, .mp3, etc.)
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
        Object.assign(existing, data);
        if (!existing.id) existing.id = Date.now() + Math.floor(Math.random() * 1000);
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
            audioData: data.audioData || ''
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

function renderBoard() {
    if (!boardContainer) return;
    boardContainer.innerHTML = '';

    if (receivedAuditions.length === 0) {
        boardContainer.innerHTML = '<div style="text-align: center; color: var(--gray-500); width: 100%; margin-top: 40px;">Upload auditions to begin casting</div>';
        return;
    }

    // Group by character
    const byCharacter = new Map<string, ReceivedAudition[]>();
    receivedAuditions.forEach(a => {
        const char = a.character || 'Unknown';
        if (!byCharacter.has(char)) byCharacter.set(char, []);
        byCharacter.get(char)!.push(a);
    });

    for (const [character, auditions] of byCharacter.entries()) {
        const col = document.createElement('div');
        col.className = 'contraster-column';

        const header = document.createElement('div');
        header.className = 'contraster-column-header';
        header.textContent = character;
        col.appendChild(header);

        const content = document.createElement('div');
        content.className = 'contraster-column-content';

        auditions.forEach(aud => {
            const item = document.createElement('div');
            item.className = 'contraster-audition-item';
            if (selectedAuditions.get(character) === aud.id) {
                item.classList.add('selected');
            }

            const info = document.createElement('div');
            info.className = 'contraster-audition-info';

            const name = document.createElement('div');
            name.className = 'contraster-audition-name';
            name.textContent = `${aud.actorFirstName} ${aud.actorLastName}`;

            const meta = document.createElement('div');
            meta.className = 'contraster-audition-meta';
            meta.textContent = aud.dateSubmitted;

            info.appendChild(name);
            info.appendChild(meta);

            const indicator = document.createElement('div');
            indicator.className = 'contraster-play-indicator';
            indicator.textContent = (currentlyPlayingId === aud.id) ? '⏸' : '▶';

            item.appendChild(info);
            item.appendChild(indicator);

            item.addEventListener('click', () => {
                // If it's already selected, clicking it again toggles play/pause
                if (selectedAuditions.get(character) === aud.id) {
                    if (currentlyPlayingId === aud.id) {
                        stopAudio();
                    } else {
                        playAudio(aud);
                    }
                } else {
                    // Select it and play
                    selectedAuditions.set(character, aud.id);
                    renderBoard(); // re-render to update selected class
                    playAudio(aud);
                }
            });

            content.appendChild(item);
        });

        col.appendChild(content);
        boardContainer.appendChild(col);
    }
}

function playAudio(aud: ReceivedAudition) {
    stopAudio();
    if (!aud.audioData) return;

    currentlyPlayingId = aud.id;
    currentAudio = new Audio(aud.audioData);
    currentAudio.onended = () => {
        currentlyPlayingId = null;
        renderBoard();
    };
    currentAudio.play().catch(e => {
        console.error("Playback failed", e);
        currentlyPlayingId = null;
    });
    renderBoard();
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    currentlyPlayingId = null;
    renderBoard();
}

async function playSequence() {
    stopAudio();
    
    // Play selected auditions in order of the columns
    const byCharacter = new Map<string, ReceivedAudition[]>();
    receivedAuditions.forEach(a => {
        const char = a.character || 'Unknown';
        if (!byCharacter.has(char)) byCharacter.set(char, []);
        byCharacter.get(char)!.push(a);
    });

    const characters = Array.from(byCharacter.keys());
    const queue: ReceivedAudition[] = [];
    
    characters.forEach(char => {
        const selId = selectedAuditions.get(char);
        if (selId) {
            const aud = byCharacter.get(char)!.find(a => a.id === selId);
            if (aud) queue.push(aud);
        }
    });

    if (queue.length === 0) {
        alert("Please select at least one audition to play the sequence.");
        return;
    }

    let currentIndex = 0;

    const playNext = () => {
        if (currentIndex >= queue.length) {
            currentlyPlayingId = null;
            renderBoard();
            return;
        }

        const aud = queue[currentIndex];
        if (!aud.audioData) {
            currentIndex++;
            playNext();
            return;
        }

        currentlyPlayingId = aud.id;
        renderBoard();

        currentAudio = new Audio(aud.audioData);
        currentAudio.onended = () => {
            currentIndex++;
            playNext();
        };
        currentAudio.play().catch(e => {
            console.error("Sequence playback failed", e);
            currentIndex++;
            playNext();
        });
    };

    playNext();
}

async function handleExport() {
    const byCharacter = new Map<string, ReceivedAudition[]>();
    receivedAuditions.forEach(a => {
        const char = a.character || 'Unknown';
        if (!byCharacter.has(char)) byCharacter.set(char, []);
        byCharacter.get(char)!.push(a);
    });

    const characters = Array.from(byCharacter.keys());
    const castList: ReceivedAudition[] = [];
    
    characters.forEach(char => {
        const selId = selectedAuditions.get(char);
        if (selId) {
            const aud = byCharacter.get(char)!.find(a => a.id === selId);
            if (aud) castList.push(aud);
        }
    });

    if (castList.length === 0) {
        alert("Please select at least one audition to export.");
        return;
    }

    const zip = new JSZip();
    let txtContent = "Selected Cast:\n\n";
    let mdContent = "# Selected Cast\n\n";

    for (const aud of castList) {
        const actorName = `${aud.actorFirstName} ${aud.actorLastName}`.trim();
        const charName = aud.character;
        const ext = aud.fileName ? aud.fileName.split('.').pop() : 'wav';
        const newFileName = `${actorName} - ${charName}.${ext}`;

        // Add Audio file
        if (aud.audioData) {
            const base64Data = aud.audioData.split(',')[1];
            if (base64Data) {
                zip.file(newFileName, base64Data, { base64: true });
            }
        }

        // Text summary
        txtContent += `Character: ${charName}\nActor: ${actorName}\n`;
        if (aud.actorEmail) txtContent += `Email: ${aud.actorEmail}\n`;
        txtContent += `\n`;

        // Markdown summary
        mdContent += `**Character:** [[${charName}]]\n**Actor:** [[${actorName}]]\n`;
        if (aud.actorEmail) mdContent += `**Email:** ${aud.actorEmail}\n`;
        mdContent += `\n`;
    }

    zip.file("cast_list.txt", txtContent);
    zip.file("cast_list.md", mdContent);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contraster_Cast_Export.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
