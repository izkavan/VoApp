import JSZip from 'jszip';
import { convertWebMToWav } from './audio-utils.js';
import { Project, DictionaryEntry, SystemSettings } from './types.js';
import { getDictionaryEntries, saveAudioBlob, getAudioBlob, deleteAudioBlob } from './indexeddb.js';
import { highlightDictionaryWords } from './dictionary-highlighter.js';
import { loadFromLocalStorage } from './storage.js';

interface TakeDetail {
    audioId: string;
    rating: number;
    notes: string;
    title?: string;
}

interface TeleprompterFile {
    id: string;
    name: string;
    content: string;
    highlightedSentences: number[];
    takes: TakeDetail[];
}

export function initializeTeleprompter(projects: Project[]) {
    const fileInput = document.getElementById('teleprompt-file-input') as HTMLInputElement;
    const projectSelect = document.getElementById('teleprompt-project-select') as HTMLSelectElement;
    const displayDiv = document.getElementById('teleprompt-display') as HTMLDivElement;
    
    // Controls
    const speedInput = document.getElementById('teleprompt-speed') as HTMLInputElement;
    const fontMinus = document.getElementById('teleprompt-font-minus') as HTMLButtonElement;
    const fontPlus = document.getElementById('teleprompt-font-plus') as HTMLButtonElement;
    const fontLabel = document.getElementById('teleprompt-font-label') as HTMLSpanElement;
    const spacingMinus = document.getElementById('teleprompt-spacing-minus') as HTMLButtonElement;
    const spacingPlus = document.getElementById('teleprompt-spacing-plus') as HTMLButtonElement;
    const spacingLabel = document.getElementById('teleprompt-spacing-label') as HTMLSpanElement;
    const colorPicker = document.getElementById('teleprompt-color') as HTMLInputElement;
    const bgColorPicker = document.getElementById('teleprompt-bg-color') as HTMLInputElement;
    const readToggle = document.getElementById('teleprompt-read-toggle') as HTMLInputElement;
    const recordButton = document.getElementById('teleprompt-record-button') as HTMLButtonElement;
    
    const takesList = document.getElementById('teleprompt-takes-list') as HTMLUListElement;
    const saveButton = document.getElementById('teleprompt-save-session') as HTMLButtonElement;

    // TOC
    const tocList = document.getElementById('teleprompt-toc-list') as HTMLUListElement;
    const tocToggle = document.getElementById('teleprompt-toc-toggle') as HTMLButtonElement;
    const sidebar = document.getElementById('teleprompt-sidebar') as HTMLDivElement;

    let fontSize = 24;
    let lineHeightRatio = 1.5;
    displayDiv.style.lineHeight = `${lineHeightRatio}`;
    displayDiv.style.color = colorPicker.value;
    displayDiv.style.backgroundColor = bgColorPicker.value;

    let isReading = false;
    let animationFrameId: number;
    let lastTime = 0;
    let exactScrollTop = 0;

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    
    // Multi-file Session State
    let sessionFiles: TeleprompterFile[] = [];
    let activeFileId: string | null = null;
    let currentDictionary: DictionaryEntry[] = [];

    // --- TOC Logic ---
    tocToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        tocToggle.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    });

    const getActiveFile = () => sessionFiles.find(f => f.id === activeFileId);

    const renderTOC = () => {
        tocList.innerHTML = sessionFiles.map(f => `
            <li class="teleprompt-toc-item ${f.id === activeFileId ? 'active' : ''}" data-id="${f.id}" title="${f.name}">
                ${f.name}
            </li>
        `).join('');

        document.querySelectorAll('.teleprompt-toc-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (id && id !== activeFileId) {
                    activeFileId = id;
                    renderTOC();
                    renderText();
                    renderTakes();
                }
            });
        });
    };

    // --- Highlighting Logic ---
    displayDiv.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const sentenceEl = target.closest('.sentence') as HTMLElement | null;
        if (sentenceEl) {
            const activeFile = getActiveFile();
            if (!activeFile) return;

            const idx = Number(sentenceEl.getAttribute('data-index'));
            if (activeFile.highlightedSentences.includes(idx)) {
                activeFile.highlightedSentences = activeFile.highlightedSentences.filter(i => i !== idx);
                sentenceEl.classList.remove('highlighted');
            } else {
                activeFile.highlightedSentences.push(idx);
                sentenceEl.classList.add('highlighted');
            }
        }
    });

    const renderText = () => {
        const activeFile = getActiveFile();
        if (!activeFile) {
            displayDiv.innerHTML = '';
            return;
        }

        let globalIndex = 0;
        let sentenceWrapped = activeFile.content.split(/\r?\n/).map(line => {
            if (!line) return '<br>';
            return (line.match(/[^.!?]+[.!?]*\s*/g) || [line]).map(s => {
                if (!s.trim()) return s;
                const idx = globalIndex++;
                const isHighlighted = activeFile.highlightedSentences.includes(idx) ? ' highlighted' : '';
                return `<span class="sentence${isHighlighted}" data-index="${idx}">${s}</span>`;
            }).join('');
        }).join('<br>');

        const finalHtml = highlightDictionaryWords(sentenceWrapped, currentDictionary);
        displayDiv.innerHTML = finalHtml;
        scrollToHighlight();
    };

    const scrollToHighlight = () => {
        const activeFile = getActiveFile();
        if (!activeFile) return;

        if (activeFile.highlightedSentences.length > 0) {
            const firstHighlightIdx = Math.min(...activeFile.highlightedSentences);
            const firstHighlightEl = displayDiv.querySelector(`.sentence[data-index="${firstHighlightIdx}"]`) as HTMLElement;
            
            if (firstHighlightEl) {
                const containerHeight = displayDiv.clientHeight;
                const elTop = firstHighlightEl.offsetTop;
                const elHeight = firstHighlightEl.offsetHeight;
                displayDiv.scrollTop = elTop - (containerHeight / 2) + (elHeight / 2);
            } else {
                displayDiv.scrollTop = 0;
            }
        } else {
            displayDiv.scrollTop = 0;
        }
        exactScrollTop = displayDiv.scrollTop;
    };

    // --- Project Selection ---
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

    // --- Styling Controls ---
    const updateFontSize = () => {
        displayDiv.style.fontSize = `${fontSize}px`;
        fontLabel.textContent = `${fontSize}px`;
    };
    fontMinus.addEventListener('click', () => { if (fontSize > 10) { fontSize -= 2; updateFontSize(); } });
    fontPlus.addEventListener('click', () => { if (fontSize < 100) { fontSize += 2; updateFontSize(); } });

    const updateLineSpacing = () => {
        displayDiv.style.lineHeight = `${lineHeightRatio}`;
        spacingLabel.textContent = lineHeightRatio.toFixed(1);
    };
    spacingMinus.addEventListener('click', () => { if (lineHeightRatio > 1.0) { lineHeightRatio = Math.max(1.0, lineHeightRatio - 0.1); updateLineSpacing(); } });
    spacingPlus.addEventListener('click', () => { if (lineHeightRatio < 4.0) { lineHeightRatio = Math.min(4.0, lineHeightRatio + 0.1); updateLineSpacing(); } });

    colorPicker.addEventListener('input', (e) => { displayDiv.style.color = (e.target as HTMLInputElement).value; });
    bgColorPicker.addEventListener('input', (e) => { displayDiv.style.backgroundColor = (e.target as HTMLInputElement).value; });

    // --- Auto-Scroll ---
    const scrollLoop = (timestamp: number) => {
        if (!isReading) return;
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        const lineHeightPx = fontSize * lineHeightRatio;
        const speedVal = parseInt(speedInput.value); 
        let secondsPerLine = 5;
        if (speedVal === 1) secondsPerLine = 10;
        else if (speedVal === 2) secondsPerLine = 5;
        else if (speedVal === 3) secondsPerLine = 1;

        const pixelsPerMs = (lineHeightPx / secondsPerLine) / 1000;
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

    readToggle.addEventListener('change', (e) => { toggleReading((e.target as HTMLInputElement).checked); });
    document.addEventListener('keydown', (e) => {
        if (displayDiv.offsetParent !== null && e.code === 'Space') {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            e.preventDefault();
            toggleReading(!isReading);
        }
    });
    displayDiv.addEventListener('wheel', () => { if (isReading) toggleReading(false); });
    displayDiv.addEventListener('touchmove', () => { if (isReading) toggleReading(false); });

    // --- Audio Rendering ---
    const renderTakes = async () => {
        const activeFile = getActiveFile();
        if (!activeFile) {
            takesList.innerHTML = '';
            return;
        }

        const takesHtml = await Promise.all(activeFile.takes.map(async (take, index) => {
            let audioUrl = '';
            if (take.audioId) {
                const blob = await getAudioBlob(take.audioId);
                if (blob) {
                    audioUrl = URL.createObjectURL(blob);
                }
            }
            return `
                <li class="take-item" data-index="${index}">
                    <input type="text" class="take-title-input" placeholder="Take title..." value="${(take.title || '').replace(/"/g, '&quot;')}" />
                    <div class="take-audio-controls">
                        <audio controls src="${audioUrl}"></audio>
                        <span class="delete-take">🗑️</span>
                    </div>
                    <div class="take-metadata">
                        <div class="star-rating">
                            ${[1, 2, 3, 4, 5].map(star => `<span class="star ${star <= take.rating ? 'active' : ''}" data-value="${star}">★</span>`).join('')}
                        </div>
                        <input type="text" class="take-note-input" placeholder="Take notes..." value="${take.notes.replace(/"/g, '&quot;')}" />
                    </div>
                </li>
            `;
        }));

        takesList.innerHTML = takesHtml.join('');

        document.querySelectorAll('#teleprompt-takes-list .delete-take').forEach(btn => btn.addEventListener('click', async (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            const take = activeFile.takes[index];
            if (take.audioId) await deleteAudioBlob(take.audioId);
            activeFile.takes.splice(index, 1);
            renderTakes();
        }));
        document.querySelectorAll('#teleprompt-takes-list .take-title-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            activeFile.takes[index].title = (e.target as HTMLInputElement).value;
        }));
        document.querySelectorAll('#teleprompt-takes-list .take-note-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            activeFile.takes[index].notes = (e.target as HTMLInputElement).value;
        }));
        document.querySelectorAll('#teleprompt-takes-list .star').forEach(star => star.addEventListener('click', (e) => {
            const index = Number((e.currentTarget as HTMLElement).closest('.take-item')?.getAttribute('data-index'));
            const rating = Number((e.currentTarget as HTMLElement).getAttribute('data-value'));
            activeFile.takes[index].rating = rating;
            renderTakes(); // Re-renders to update stars
        }));
    };

    // --- Recording ---
    recordButton.addEventListener('click', async () => {
        const activeFile = getActiveFile();
        if (!activeFile) {
            alert('Please select or upload a text file first.');
            return;
        }

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
                const audioId = await saveAudioBlob(audioBlob);
                
                activeFile.takes.push({ audioId, rating: 0, notes: '', title: `Take ${activeFile.takes.length + 1}` });
                renderTakes();
                
                stream.getTracks().forEach(track => track.stop());
            });
        } catch (err) {
            console.error("Error during recording:", err);
            alert("Could not start recording. Please ensure you have granted microphone permissions.");
        }
    });

    // --- Import Parsing (.zip / .txt) ---
    fileInput.addEventListener('change', async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) return;

        // Reset input immediately so same files can be chosen again
        const fileList = Array.from(files);
        (e.target as HTMLInputElement).value = '';

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            
            if (file.name.endsWith('.zip')) {
                // Wipe session and load from zip
                sessionFiles = [];
                activeFileId = null;

                const zip = await JSZip.loadAsync(file);
                const metadataFile = zip.file('Teleprompter.json');
                
                if (metadataFile) {
                    const metadataStr = await metadataFile.async('text');
                    const metadata = JSON.parse(metadataStr);
                    
                    for (const f of metadata.files) {
                        const newFile: TeleprompterFile = {
                            id: f.id,
                            name: f.name,
                            content: f.content || '',
                            highlightedSentences: f.highlightedSentences || [],
                            takes: []
                        };

                        // Extract content if it was saved in a subfolder
                        const txtFile = zip.file(`${f.id}/${f.name}.txt`);
                        if (txtFile) {
                            newFile.content = await txtFile.async('text');
                        }

                        // Restore audio takes
                        for (const t of f.takes) {
                            const audioZipFile = zip.file(`${f.id}/${t.audioFile}`);
                            let audioId = '';
                            if (audioZipFile) {
                                const audioBlob = await audioZipFile.async('blob');
                                audioId = await saveAudioBlob(audioBlob);
                            }
                            newFile.takes.push({
                                audioId,
                                rating: t.rating,
                                notes: t.notes,
                                title: t.title
                            });
                        }
                        sessionFiles.push(newFile);
                    }
                }
            } else if (file.name.endsWith('.txt')) {
                // Append .txt file
                const text = await file.text();
                const newId = crypto.randomUUID();
                sessionFiles.push({
                    id: newId,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    content: text,
                    highlightedSentences: [],
                    takes: []
                });
            }
        }

        if (sessionFiles.length > 0 && !activeFileId) {
            activeFileId = sessionFiles[0].id;
        }
        
        renderTOC();
        renderText();
        renderTakes();
    });

    // --- Session Export Logic ---
    saveButton.addEventListener('click', async () => {
        if (sessionFiles.length === 0) {
            alert('No active session to save.');
            return;
        }

        const settings = loadFromLocalStorage().settings;
        const format = settings.exportFormat === 'wav' ? 'wav' : 'webm';
        const zip = new JSZip();
        
        const metadata = {
            version: '1.0',
            files: [] as any[]
        };

        for (const f of sessionFiles) {
            const folder = zip.folder(f.id);
            if (!folder) continue;

            folder.file(`${f.name}.txt`, f.content);

            const fileMeta = {
                id: f.id,
                name: f.name,
                highlightedSentences: f.highlightedSentences,
                takes: [] as any[]
            };

            for (let i = 0; i < f.takes.length; i++) {
                const take = f.takes[i];
                const fileName = `take_${i + 1}.${format}`;
                fileMeta.takes.push({
                    title: take.title,
                    rating: take.rating,
                    notes: take.notes,
                    audioFile: fileName
                });

                if (take.audioId) {
                    let blob = await getAudioBlob(take.audioId);
                    if (blob) {
                        if (format === 'wav') {
                            blob = await convertWebMToWav(blob);
                        }
                        folder.file(fileName, blob);
                    }
                }
            }
            metadata.files.push(fileMeta);
        }
        
        zip.file('Teleprompter.json', JSON.stringify(metadata, null, 2));

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        a.download = `teleprompter_session_${dateStr}_${timeStr}.zip`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}
