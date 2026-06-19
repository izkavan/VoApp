import JSZip from 'jszip';
import { Project, DictionaryEntry } from './types.js';
import { getDictionaryEntries } from './indexeddb.js';
import { highlightDictionaryWords } from './dictionary-highlighter.js';

interface TakeDetail {
    audioData: string;
    rating: number;
    notes: string;
    title?: string;
}

export function initializeTeleprompter(projects: Project[]) {
    const fileInput = document.getElementById('teleprompt-file-input') as HTMLInputElement;
    const projectSelect = document.getElementById('teleprompt-project-select') as HTMLSelectElement;
    const displayDiv = document.getElementById('teleprompt-display') as HTMLDivElement;
    const speedInput = document.getElementById('teleprompt-speed') as HTMLInputElement;
    const fontMinus = document.getElementById('teleprompt-font-minus') as HTMLButtonElement;
    const fontPlus = document.getElementById('teleprompt-font-plus') as HTMLButtonElement;
    const fontLabel = document.getElementById('teleprompt-font-label') as HTMLSpanElement;
    const readToggle = document.getElementById('teleprompt-read-toggle') as HTMLInputElement;
    const recordButton = document.getElementById('teleprompt-record-button') as HTMLButtonElement;
    const takesList = document.getElementById('teleprompt-takes-list') as HTMLUListElement;
    const saveButton = document.getElementById('teleprompt-save-session') as HTMLButtonElement;

    let fontSize = 24;
    const lineHeightRatio = 1.5;
    displayDiv.style.lineHeight = `${lineHeightRatio}`;

    let isReading = false;
    let animationFrameId: number;
    let lastTime = 0;
    let exactScrollTop = 0;

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let takes: TakeDetail[] = [];
    let uploadedFilename = 'session';
    let currentRawText = '';
    let currentDictionary: DictionaryEntry[] = [];

    // Initialize Project Dropdown
    if (projectSelect) {
        projectSelect.innerHTML = `<option value="">--Select Project--</option>${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}`;
        
        projectSelect.addEventListener('change', async () => {
            const projectId = parseInt(projectSelect.value);
            if (!isNaN(projectId)) {
                currentDictionary = await getDictionaryEntries(projectId);
            } else {
                currentDictionary = [];
            }
            renderText();
        });
    }

    const renderText = () => {
        if (!currentRawText) {
            displayDiv.innerHTML = '';
            return;
        }
        const highlighted = highlightDictionaryWords(currentRawText, currentDictionary);
        displayDiv.innerHTML = highlighted.split(/\r?\n/).map(line => line || '<br>').join('<br>');
    };

    // Font Size Logic
    const updateFontSize = () => {
        displayDiv.style.fontSize = `${fontSize}px`;
        fontLabel.textContent = `${fontSize}px`;
    };

    fontMinus.addEventListener('click', () => { if (fontSize > 10) { fontSize -= 2; updateFontSize(); } });
    fontPlus.addEventListener('click', () => { if (fontSize < 100) { fontSize += 2; updateFontSize(); } });

    // File Upload
    fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        uploadedFilename = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_');
        const reader = new FileReader();
        reader.onload = (event) => {
            currentRawText = event.target?.result as string;
            renderText();
        };
        reader.readAsText(file);
    });

    // Auto-Scroll Logic
    const scrollLoop = (timestamp: number) => {
        if (!isReading) return;
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // Calculate speed: pixels per millisecond
        const lineHeightPx = fontSize * lineHeightRatio;
        const speedVal = parseInt(speedInput.value); // 1, 2, 3
        let secondsPerLine = 5;
        if (speedVal === 1) secondsPerLine = 10;
        else if (speedVal === 2) secondsPerLine = 5;
        else if (speedVal === 3) secondsPerLine = 1;

        const pixelsPerSecond = lineHeightPx / secondsPerLine;
        const pixelsPerMs = pixelsPerSecond / 1000;

        exactScrollTop += pixelsPerMs * deltaTime;
        displayDiv.scrollTop = Math.floor(exactScrollTop);

        animationFrameId = requestAnimationFrame(scrollLoop);
    };

    const toggleReading = (state: boolean) => {
        isReading = state;
        readToggle.checked = state;
        if (isReading) {
            lastTime = 0;
            exactScrollTop = displayDiv.scrollTop;
            animationFrameId = requestAnimationFrame(scrollLoop);
        } else {
            cancelAnimationFrame(animationFrameId);
        }
    };

    readToggle.addEventListener('change', (e) => {
        toggleReading((e.target as HTMLInputElement).checked);
    });

    // Spacebar to toggle
    document.addEventListener('keydown', (e) => {
        if (displayDiv.offsetParent !== null && e.code === 'Space') {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            e.preventDefault();
            toggleReading(!isReading);
        }
    });

    // Auto-pause on scroll
    displayDiv.addEventListener('wheel', () => {
        if (isReading) toggleReading(false);
    });
    displayDiv.addEventListener('touchmove', () => {
        if (isReading) toggleReading(false);
    });

    // Recording Logic
    const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const renderTakes = () => {
        takesList.innerHTML = takes.map((take, index) => `
            <li class="take-item" data-index="${index}">
                <input type="text" class="take-title-input" placeholder="Take title..." value="${(take.title || '').replace(/"/g, '&quot;')}" />
                <div class="take-audio-controls">
                    <audio controls src="${take.audioData}"></audio>
                    <span class="delete-take">🗑️</span>
                </div>
                <div class="take-metadata">
                    <div class="star-rating">
                        ${[1, 2, 3, 4, 5].map(star => `<span class="star ${star <= take.rating ? 'active' : ''}" data-value="${star}">★</span>`).join('')}
                    </div>
                    <input type="text" class="take-note-input" placeholder="Take notes..." value="${take.notes.replace(/"/g, '&quot;')}" />
                </div>
            </li>
        `).join('');

        document.querySelectorAll('#teleprompt-takes-list .delete-take').forEach(btn => btn.addEventListener('click', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            takes.splice(index, 1);
            renderTakes();
        }));
        document.querySelectorAll('#teleprompt-takes-list .take-title-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            takes[index].title = (e.target as HTMLInputElement).value;
        }));
        document.querySelectorAll('#teleprompt-takes-list .take-note-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            takes[index].notes = (e.target as HTMLInputElement).value;
        }));
        document.querySelectorAll('#teleprompt-takes-list .star').forEach(star => star.addEventListener('click', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            const rating = Number((e.currentTarget as HTMLElement).getAttribute('data-value'));
            takes[index].rating = rating;
            renderTakes();
        }));
    };

    recordButton.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordButton.classList.remove('recording');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.start();
            recordButton.classList.add('recording');

            mediaRecorder.addEventListener("dataavailable", event => audioChunks.push(event.data));
            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const base64Audio = await blobToBase64(audioBlob);
                
                takes.push({ audioData: base64Audio, rating: 0, notes: '', title: `Take ${takes.length + 1}` });
                renderTakes();
                
                stream.getTracks().forEach(track => track.stop());
            });
        } catch (err) {
            console.error("Error during recording:", err);
            alert("Could not start recording. Please ensure you have granted microphone permissions.");
        }
    });

    // Save Session Logic
    saveButton.addEventListener('click', async () => {
        const zip = new JSZip();
        const sessionData = takes.map((take, index) => ({
            title: take.title,
            rating: take.rating,
            notes: take.notes,
            audioFile: `take_${index + 1}.webm`
        }));
        
        zip.file('session.json', JSON.stringify(sessionData, null, 2));

        for (let i = 0; i < takes.length; i++) {
            const response = await fetch(takes[i].audioData);
            const blob = await response.blob();
            zip.file(`take_${i + 1}.webm`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        a.download = `teleprompt_${uploadedFilename}_${dateStr}_${timeStr}.zip`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}
