import { AudioClip, exportDemoReel } from '../utils/audio-processor.js';
import { TrimmableWaveform } from '../components/trimmable-waveform.js';
import { DataStore } from '../services/DataStore.js';
import { loadMeViewData } from './me-view.js';
import { openEditAudioModal } from './edit-audio-modal.js';
import { audioBufferToWav } from '../utils/audio-utils.js';

interface UIAudioClip extends AudioClip {
    name: string;
}

let clips: UIAudioClip[] = [];
let selectedClipId: string | null = null;
let waveform: TrimmableWaveform;
let audioContext = new window.AudioContext();
let currentSource: AudioBufferSourceNode | null = null;
let playTimeout: any = null;

export function initializeCraftDemoReel() {
    const btn = document.getElementById('craft-demo-reel-btn');
    if (btn) btn.addEventListener('click', openCraftModal);

    const canvas = document.getElementById('craft-waveform-canvas');
    if (canvas) {
        waveform = new TrimmableWaveform('craft-waveform-canvas', '.craft-waveform-container');
        waveform.setOnTrimChange((start, end) => {
            const clip = clips.find(c => c.id === selectedClipId);
            if (clip) {
                clip.startTime = start;
                clip.endTime = end;
            }
        });
    }

    document.getElementById('craft-demo-close')?.addEventListener('click', closeCraftModal);
    
    document.getElementById('craft-add-audio-btn')?.addEventListener('click', () => {
        document.getElementById('craft-audio-upload')?.click();
    });

    document.getElementById('craft-audio-upload')?.addEventListener('change', handleAudioUpload);

    document.getElementById('craft-play-btn')?.addEventListener('click', playDemoReel);
    document.getElementById('craft-save-btn')?.addEventListener('click', saveDemoReel);
}

function openCraftModal() {
    const modal = document.getElementById('craft-demo-reel-modal');
    if (modal) modal.style.display = 'flex';
    clips = [];
    selectedClipId = null;
    renderClipList();
    if (waveform) {
        waveform.setBuffer(null as any);
        waveform.draw();
    }
}

function closeCraftModal() {
    stopPlayback();
    const modal = document.getElementById('craft-demo-reel-modal');
    if (modal) modal.style.display = 'none';
}

async function handleAudioUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const arrayBuffer = await file.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        
        clips.push({
            id: Date.now().toString() + i,
            buffer,
            startTime: 0,
            endTime: buffer.duration,
            name: file.name
        });
    }

    input.value = '';
    renderClipList();
}

function renderClipList() {
    const container = document.getElementById('craft-clip-list');
    if (!container) return;

    container.innerHTML = clips.map((clip, i) => `
        <div class="craft-clip-item ${clip.id === selectedClipId ? 'selected' : ''}" data-id="${clip.id}" draggable="true" style="padding: 10px; border: 1px solid var(--border-color); margin-bottom: 5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: ${clip.id === selectedClipId ? 'var(--primary-color)' : 'var(--surface-color)'}; color: ${clip.id === selectedClipId ? 'white' : 'inherit'}; border-radius: 4px;">
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${clip.name}</span>
            <div style="display: flex; gap: 5px;">
                <button class="craft-clip-edit secondary-btn" data-id="${clip.id}" style="padding: 2px 6px;">✏️</button>
                <button class="craft-clip-up secondary-btn" data-index="${i}" ${i === 0 ? 'disabled' : ''} style="padding: 2px 6px;">↑</button>
                <button class="craft-clip-down secondary-btn" data-index="${i}" ${i === clips.length - 1 ? 'disabled' : ''} style="padding: 2px 6px;">↓</button>
                <button class="craft-clip-delete danger-btn" data-id="${clip.id}" style="padding: 2px 6px;">X</button>
            </div>
        </div>
    `).join('');

    // Events
    container.querySelectorAll('.craft-clip-item').forEach(el => {
        el.addEventListener('click', (e) => {
            // Ignore if clicked on a button
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            selectClip((el as HTMLElement).dataset.id!);
        });

        // Drag and drop
        el.addEventListener('dragstart', (e: any) => {
            e.dataTransfer.setData('text/plain', (el as HTMLElement).dataset.id!);
        });
        el.addEventListener('dragover', e => e.preventDefault());
        el.addEventListener('drop', (e: any) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const targetId = (el as HTMLElement).dataset.id!;
            if (draggedId && draggedId !== targetId) {
                const draggedIndex = clips.findIndex(c => c.id === draggedId);
                const targetIndex = clips.findIndex(c => c.id === targetId);
                const [draggedClip] = clips.splice(draggedIndex, 1);
                clips.splice(targetIndex, 0, draggedClip);
                renderClipList();
            }
        });
    });

    container.querySelectorAll('.craft-clip-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = Number((e.currentTarget as HTMLElement).dataset.index);
            if (index > 0) {
                const temp = clips[index];
                clips[index] = clips[index - 1];
                clips[index - 1] = temp;
                renderClipList();
            }
        });
    });

    container.querySelectorAll('.craft-clip-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = Number((e.currentTarget as HTMLElement).dataset.index);
            if (index < clips.length - 1) {
                const temp = clips[index];
                clips[index] = clips[index + 1];
                clips[index + 1] = temp;
                renderClipList();
            }
        });
    });

    container.querySelectorAll('.craft-clip-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).dataset.id!;
            clips = clips.filter(c => c.id !== id);
            if (selectedClipId === id) {
                selectedClipId = null;
                if (waveform) {
                    waveform.setBuffer(null as any);
                    waveform.draw(); // Clear
                }
            }
            renderClipList();
        });
    });

    container.querySelectorAll('.craft-clip-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = (e.currentTarget as HTMLElement).dataset.id!;
            const clip = clips.find(c => c.id === id);
            if (!clip) return;
            
            // Convert audio buffer to blob
            const wavData = audioBufferToWav(clip.buffer);
            const blob = new Blob([wavData], { type: 'audio/wav' });
            
            openEditAudioModal(blob, async (newBlob: Blob) => {
                const arrayBuffer = await newBlob.arrayBuffer();
                const newAudioContext = new window.AudioContext();
                const newBuffer = await newAudioContext.decodeAudioData(arrayBuffer);
                clip.buffer = newBuffer;
                clip.startTime = 0;
                clip.endTime = newBuffer.duration;
                if (selectedClipId === id && waveform) {
                    waveform.setBuffer(clip.buffer, clip.startTime, clip.endTime);
                }
                renderClipList();
            });
        });
    });
}

function selectClip(id: string) {
    selectedClipId = id;
    renderClipList(); // update active state
    const clip = clips.find(c => c.id === id);
    if (clip && waveform) {
        waveform.setBuffer(clip.buffer, clip.startTime, clip.endTime);
    }
}

function stopPlayback() {
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    if (playTimeout) {
        clearTimeout(playTimeout);
        playTimeout = null;
    }
}

function playDemoReel() {
    stopPlayback();
    if (clips.length === 0) return;

    const silenceSecs = Number((document.getElementById('craft-silence-select') as HTMLSelectElement).value);
    
    let currentIndex = 0;
    
    const playNext = () => {
        if (currentIndex >= clips.length) return;
        const clip = clips[currentIndex];
        
        currentSource = audioContext.createBufferSource();
        currentSource.buffer = clip.buffer;
        currentSource.connect(audioContext.destination);
        
        const duration = clip.endTime - clip.startTime;
        currentSource.start(0, clip.startTime, duration);
        
        playTimeout = setTimeout(() => {
            currentIndex++;
            if (currentIndex < clips.length && silenceSecs > 0) {
                playTimeout = setTimeout(playNext, silenceSecs * 1000);
            } else {
                playNext();
            }
        }, duration * 1000);
    };
    
    playNext();
}

async function saveDemoReel() {
    if (clips.length === 0) {
        alert('Please add at least one audio file.');
        return;
    }

    const saveBtn = document.getElementById('craft-save-btn') as HTMLButtonElement;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Processing...';

    try {
        const silenceSecs = Number((document.getElementById('craft-silence-select') as HTMLSelectElement).value);
        const settings = DataStore.getSettings();
        const format = settings.exportFormat || 'webm';
        
        const blob = await exportDemoReel(clips, silenceSecs, format, (msg) => {
            saveBtn.textContent = msg;
        });

        const safeDate = new Date().toISOString().split('T')[0];
        const filename = `Demo_Reel_${safeDate}.${format}`;

        // Save to system as demo reel
        const profile = DataStore.getUserProfile() || { firstName: '', lastName: '', email: '', phone: '', address: '', yearsOfExperience: '', preferredJobTypes: [], socialLinks: { twitter: '', mastodon: '', bluesky: '', linkedin: '', personalSite: '', custom: [] }, roleHistory: [] };
        
        const { saveAudioBlob } = await import('../services/indexeddb.js');
        const fileObj = new File([blob], filename, { type: blob.type });
        const demoReelId = await saveAudioBlob(fileObj);
        
        profile.demoReelId = demoReelId;
        profile.demoReelFilename = filename;
        DataStore.setUserProfile(profile);

        // Download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();

        alert('Demo Reel saved successfully!');
        
        // Refresh Me View if open
        loadMeViewData();
        closeCraftModal();

    } catch (err) {
        console.error(err);
        alert('Failed to save demo reel.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Demo Reel';
    }
}
