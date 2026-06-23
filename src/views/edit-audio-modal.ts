import { AudioEditorCanvas, SelectionType } from '../components/audio-editor-canvas.js';
import { DataStore } from '../services/DataStore.js';
import { audioBufferToWav } from '../utils/audio-utils.js';

let modal: HTMLElement | null = null;
let controlsContainer: HTMLElement | null = null;
let saveBtn: HTMLButtonElement | null = null;
let cancelBtn: HTMLButtonElement | null = null;

let editorCanvas: AudioEditorCanvas | null = null;
let currentOnSave: ((blob: Blob) => void) | null = null;

let isRecording = false;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

export function initializeEditAudioModal() {
    modal = document.getElementById('edit-audio-modal');
    controlsContainer = document.getElementById('edit-audio-controls-top');
    saveBtn = document.getElementById('edit-audio-save-btn') as HTMLButtonElement;
    cancelBtn = document.getElementById('edit-audio-cancel-btn') as HTMLButtonElement;

    const closeBtn = document.getElementById('edit-audio-close');

    if (modal) {
        editorCanvas = new AudioEditorCanvas('edit-audio-canvas');
        editorCanvas.onSelectionChange = updateControls;
    }

    closeBtn?.addEventListener('click', closeEditAudioModal);
    cancelBtn?.addEventListener('click', closeEditAudioModal);
    
    saveBtn?.addEventListener('click', async () => {
        if (!editorCanvas || !currentOnSave) return;
        saveBtn!.disabled = true;
        saveBtn!.textContent = 'Saving...';
        
        try {
            const compiledBlob = await compileAudio();
            currentOnSave(compiledBlob);
            closeEditAudioModal();
        } catch (e) {
            console.error(e);
            alert('Failed to save audio edits.');
        } finally {
            saveBtn!.disabled = false;
            saveBtn!.textContent = 'Save Changes';
        }
    });
}

export async function openEditAudioModal(blob: Blob, onSave: (blob: Blob) => void) {
    if (!modal || !editorCanvas) return;
    
    currentOnSave = onSave;
    
    // Load blob into AudioBuffer
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    await editorCanvas.loadBuffer(audioBuffer);
    
    updateControls('none', -1);
    modal.style.display = 'flex';
}

function closeEditAudioModal() {
    if (!modal) return;
    modal.style.display = 'none';
    currentOnSave = null;
    if (isRecording) stopRecording();
}

function updateControls(type: SelectionType, index: number) {
    if (!controlsContainer) return;
    
    controlsContainer.innerHTML = '';
    
    if (type === 'chunk') {
        const chunkIndex = index;
        const louderBtn = createBtn('Louder (+10%)', () => {
            const chunks = editorCanvas!.getChunks();
            editorCanvas!.setGain(chunkIndex, chunks[chunkIndex].gain * 1.1);
        });
        const quieterBtn = createBtn('Quieter (-10%)', () => {
            const chunks = editorCanvas!.getChunks();
            editorCanvas!.setGain(chunkIndex, chunks[chunkIndex].gain * 0.9);
        });
        const silenceBtn = createBtn('Silence', () => {
            editorCanvas!.setGain(chunkIndex, 0);
        });
        const deleteBtn = createBtn('Delete', () => {
            editorCanvas!.deleteChunk(chunkIndex);
        });
        deleteBtn.style.background = '#d9534f';
        deleteBtn.style.color = 'white';

        const recordBtn = createBtn('Record (Replace)', () => {
            if (isRecording) {
                stopRecording(async (newBlob) => {
                    recordBtn.textContent = 'Record (Replace)';
                    const buffer = await blobToBuffer(newBlob);
                    editorCanvas!.replaceChunk(chunkIndex, buffer);
                });
            } else {
                startRecording();
                recordBtn.textContent = 'Stop Recording...';
                recordBtn.style.background = 'var(--danger-color, #ff4444)';
            }
        });
        
        controlsContainer.append(louderBtn, quieterBtn, silenceBtn, deleteBtn, recordBtn);
        
    } else if (type === 'line') {
        const lineIndex = index;
        const recordBtn = createBtn('Record & Insert', () => {
            if (isRecording) {
                stopRecording(async (newBlob) => {
                    recordBtn.textContent = 'Record & Insert';
                    const buffer = await blobToBuffer(newBlob);
                    editorCanvas!.insertChunk(lineIndex, buffer);
                });
            } else {
                startRecording();
                recordBtn.textContent = 'Stop Recording...';
                recordBtn.style.background = 'var(--danger-color, #ff4444)';
            }
        });
        controlsContainer.appendChild(recordBtn);
        
    } else {
        const helpText = document.createElement('span');
        helpText.style.color = 'var(--gray-500)';
        helpText.style.fontStyle = 'italic';
        helpText.style.alignSelf = 'center';
        helpText.textContent = 'Double click waveform to add a split. Single click to select a section or split line.';
        controlsContainer.appendChild(helpText);
    }
}

function createBtn(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = 'secondary-btn';
    btn.addEventListener('click', onClick);
    return btn;
}

async function startRecording() {
    isRecording = true;
    recordedChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.start();
}

function stopRecording(onComplete?: (blob: Blob) => void) {
    if (!mediaRecorder) return;
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        mediaRecorder!.stream.getTracks().forEach(t => t.stop());
        mediaRecorder = null;
        isRecording = false;
        if (onComplete) onComplete(blob);
    };
    mediaRecorder.stop();
}

async function blobToBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
}

async function compileAudio(): Promise<Blob> {
    const chunks = editorCanvas!.getChunks();
    if (chunks.length === 0) throw new Error("No audio chunks left to compile.");

    let totalLength = 0;
    const sampleRate = chunks[0].buffer.sampleRate;
    const numChannels = chunks[0].buffer.numberOfChannels;

    for (const c of chunks) {
        totalLength += c.buffer.length;
    }

    const offlineCtx = new OfflineAudioContext(numChannels, totalLength, sampleRate);
    let currentTime = 0;

    for (const chunk of chunks) {
        const source = offlineCtx.createBufferSource();
        source.buffer = chunk.buffer;
        
        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = chunk.gain;

        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        
        source.start(currentTime);
        currentTime += chunk.buffer.duration;
    }

    const renderedBuffer = await offlineCtx.startRendering();
    
    // Check export format setting
    const settings = DataStore.getSettings();
    const format = settings.exportFormat || 'webm';
    
    if (format === 'wav') {
        const wavData = audioBufferToWav(renderedBuffer);
        return new Blob([wavData], { type: 'audio/wav' });
    } else {
        // We compile to WebM by playing it in real time into a MediaRecorder
        return new Promise((resolve) => {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const dest = ctx.createMediaStreamDestination();
            const source = ctx.createBufferSource();
            source.buffer = renderedBuffer;
            source.connect(dest);
            source.connect(ctx.destination); // optional, to hear it while exporting? No need.

            const mr = new MediaRecorder(dest.stream);
            const webmChunks: Blob[] = [];
            mr.ondataavailable = e => { if (e.data.size > 0) webmChunks.push(e.data); };
            mr.onstop = () => {
                resolve(new Blob(webmChunks, { type: 'audio/webm' }));
            };
            mr.start();
            source.start();
            source.onended = () => {
                mr.stop();
            };
        });
    }
}
