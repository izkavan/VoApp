import JSZip from 'jszip';

export interface VPComment {
    timestampStr: string; // HH:MM:SS.mmm
    timeSeconds: number;
    text: string;
}

let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let currentAudioBlob: Blob | null = null;
let currentAudioFilename: string = '';
let isHoveringLine: boolean = false;
let sourceNode: AudioBufferSourceNode | null = null;
let startTime: number = 0;
let pauseTime: number = 0;
let isPlaying: boolean = false;
let animationFrameId: number | null = null;

let comments: VPComment[] = [];

// DOM Elements
let fileInput: HTMLInputElement;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let progressBar: HTMLElement;
let btnStart: HTMLButtonElement;
let btnPrevComment: HTMLButtonElement;
let btnPlayPause: HTMLButtonElement;
let btnInsertComment: HTMLButtonElement;
let timeDisplay: HTMLElement;
let commentList: HTMLElement;
let waveformContainer: HTMLElement;
let titleInput: HTMLInputElement;
let btnExport: HTMLButtonElement;

let commentModal: HTMLElement;
let timestampInput: HTMLInputElement;
let commentInput: HTMLTextAreaElement;
let cancelBtn: HTMLButtonElement;
let saveBtn: HTMLButtonElement;

export function initializeVoiceProductionFeedback() {
    fileInput = document.getElementById('vp-audio-upload') as HTMLInputElement;
    canvas = document.getElementById('vp-waveform-canvas') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;
    progressBar = document.getElementById('vp-progress-bar') as HTMLElement;
    btnStart = document.getElementById('vp-btn-start') as HTMLButtonElement;
    btnPrevComment = document.getElementById('vp-btn-prev-comment') as HTMLButtonElement;
    btnPlayPause = document.getElementById('vp-btn-play-pause') as HTMLButtonElement;
    btnInsertComment = document.getElementById('vp-btn-insert-comment') as HTMLButtonElement;
    timeDisplay = document.getElementById('vp-time-display') as HTMLElement;
    commentList = document.getElementById('vp-comment-list') as HTMLElement;
    waveformContainer = document.querySelector('.vp-waveform-container') as HTMLElement;
    titleInput = document.getElementById('vp-feedback-title') as HTMLInputElement;
    btnExport = document.getElementById('vp-btn-export') as HTMLButtonElement;

    commentModal = document.getElementById('comment-modal') as HTMLElement;
    timestampInput = document.getElementById('comment-timestamp-input') as HTMLInputElement;
    commentInput = document.getElementById('comment-text-input') as HTMLTextAreaElement;
    cancelBtn = document.getElementById('comment-cancel-btn') as HTMLButtonElement;
    saveBtn = document.getElementById('comment-save-btn') as HTMLButtonElement;

    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        if (audioBuffer) drawWaveform(audioBuffer);
    });

    fileInput.addEventListener('change', handleFileUpload);
    waveformContainer.addEventListener('click', handleWaveformClick);
    waveformContainer.addEventListener('mousemove', handleWaveformHover);
    waveformContainer.addEventListener('mouseleave', handleWaveformMouseLeave);
    
    btnPlayPause.addEventListener('click', togglePlayback);
    btnStart.addEventListener('click', seekToBeginning);
    btnPrevComment.addEventListener('click', seekToLastComment);
    btnInsertComment.addEventListener('click', openCommentModal);
    btnExport.addEventListener('click', exportFeedback);

    cancelBtn.addEventListener('click', closeCommentModal);
    saveBtn.addEventListener('click', saveComment);
}

function resizeCanvas() {
    const rect = waveformContainer.getBoundingClientRect();
    canvas.width = rect.width || 800;
    canvas.height = rect.height || 150;
}

async function handleFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        await zip.loadAsync(file);
        
        const jsonFile = zip.file('comments.json');
        if (jsonFile) {
            const content = await jsonFile.async('string');
            const data = JSON.parse(content);
            titleInput.value = data.title || '';
            comments = data.comments || [];
        }

        const audioFiles = Object.keys(zip.files).filter(k => k.startsWith('audio.'));
        if (audioFiles.length > 0) {
            const audioZipFile = zip.file(audioFiles[0]);
            if (audioZipFile) {
                const arrayBuffer = await audioZipFile.async('arraybuffer');
                currentAudioBlob = new Blob([arrayBuffer]);
                currentAudioFilename = file.name.replace(/\.zip$/, '');
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            }
        }
    } else {
        const arrayBuffer = await file.arrayBuffer();
        currentAudioBlob = new Blob([arrayBuffer], { type: file.type });
        currentAudioFilename = file.name.replace(/\.[^/.]+$/, '');
        titleInput.value = currentAudioFilename;
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        comments = []; // reset comments on new raw audio file
    }
    
    stopPlayback();
    pauseTime = 0;
    renderComments();
    if (audioBuffer) drawWaveform(audioBuffer);
    updateTimeDisplay(0);
}

function drawWaveform(buffer: AudioBuffer) {
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const channelData = buffer.getChannelData(0);
    const step = Math.ceil(channelData.length / canvas.width);
    const amp = canvas.height / 2;

    const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary-color').trim();
    ctx.fillStyle = primaryColor || '#007bff';

    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = channelData[i * step + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    renderOrangeMarkers(buffer);
}

function renderOrangeMarkers(buffer: AudioBuffer) {
    const existing = waveformContainer.querySelectorAll('.vp-orange-marker');
    existing.forEach(el => el.remove());

    if (comments.length > 0) {
        for (const c of comments) {
            const percent = c.timeSeconds / buffer.duration;
            const marker = document.createElement('div');
            marker.className = 'vp-orange-marker';
            marker.dataset.time = c.timeSeconds.toString();
            marker.style.left = `${percent * 100}%`;
            waveformContainer.appendChild(marker);
        }
    }
}

function updateProgress() {
    if (!audioContext || !audioBuffer || !isPlaying) return;
    
    const currentTime = audioContext.currentTime - startTime;
    if (currentTime >= audioBuffer.duration) {
        stopPlayback();
        return;
    }

    updateTimeDisplay(currentTime);
    const percent = currentTime / audioBuffer.duration;
    progressBar.style.display = 'block';
    progressBar.style.left = `${percent * 100}%`;

    // Track active comment
    let activeComment = null;
    for (const c of comments) {
        if (c.timeSeconds <= currentTime) {
            activeComment = c;
        }
    }
    if (activeComment) {
        highlightComment(activeComment.timeSeconds, 'active');
    } else {
        highlightComment(-1, 'active');
    }

    animationFrameId = requestAnimationFrame(updateProgress);
}

function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function parseTime(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    const secParts = parts[2].split('.');
    
    const hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    const secs = parseInt(secParts[0], 10);
    const ms = secParts.length > 1 ? parseInt(secParts[1], 10) : 0;

    return hrs * 3600 + mins * 60 + secs + (ms / 1000);
}

function updateTimeDisplay(seconds: number) {
    timeDisplay.textContent = formatTime(seconds);
}

function togglePlayback() {
    if (!audioBuffer || !audioContext) return;

    if (isPlaying) {
        stopPlayback(true); // pause
    } else {
        startPlayback(pauseTime);
    }
}

function startPlayback(offset: number) {
    if (!audioBuffer || !audioContext) return;
    if (isPlaying) stopPlayback();

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    
    sourceNode.start(0, offset);
    startTime = audioContext.currentTime - offset;
    isPlaying = true;
    btnPlayPause.textContent = '⏸';
    updateProgress();
}

function stopPlayback(pause: boolean = false) {
    if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
        sourceNode = null;
    }
    isPlaying = false;
    btnPlayPause.textContent = '▶';
    
    if (pause && audioContext) {
        pauseTime = audioContext.currentTime - startTime;
    } else {
        pauseTime = 0;
        progressBar.style.display = 'none';
        updateTimeDisplay(0);
    }

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function handleWaveformClick(e: MouseEvent) {
    if (!audioBuffer) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    
    // Rounded down to nearest second
    const seekTime = Math.floor(percent * audioBuffer.duration);
    
    startPlayback(seekTime);
}

function seekToBeginning() {
    if (isPlaying) {
        startPlayback(0);
    } else {
        pauseTime = 0;
        updateTimeDisplay(0);
        progressBar.style.left = '0%';
    }
}

function seekToLastComment() {
    const current = isPlaying ? (audioContext!.currentTime - startTime) : pauseTime;
    let prevCommentTime = 0;

    for (const c of comments) {
        if (c.timeSeconds < current - 0.5) {
            if (c.timeSeconds > prevCommentTime) {
                prevCommentTime = c.timeSeconds;
            }
        }
    }

    if (isPlaying) {
        startPlayback(prevCommentTime);
    } else {
        pauseTime = prevCommentTime;
        updateTimeDisplay(prevCommentTime);
        if (audioBuffer) {
            progressBar.style.left = `${(prevCommentTime / audioBuffer.duration) * 100}%`;
            progressBar.style.display = 'block';
        }
    }
}

function openCommentModal() {
    if (isPlaying) {
        stopPlayback(true);
    }
    
    const currentT = pauseTime;
    timestampInput.value = formatTime(currentT);
    commentInput.value = '';
    commentModal.classList.remove('hidden');
    commentInput.focus();
}

function closeCommentModal() {
    commentModal.classList.add('hidden');
}

function saveComment() {
    const timeStr = timestampInput.value;
    const tSecs = parseTime(timeStr);
    const text = commentInput.value.trim();

    if (text && !isNaN(tSecs)) {
        comments.push({
            timestampStr: timeStr,
            timeSeconds: tSecs,
            text: text
        });
        
        comments.sort((a, b) => a.timeSeconds - b.timeSeconds);
        renderComments();
        if (audioBuffer) drawWaveform(audioBuffer);
    }
    closeCommentModal();
}

function renderComments() {
    commentList.innerHTML = '';
    
    if (comments.length === 0) {
        commentList.innerHTML = '<p style="color: var(--gray-600); font-style: italic;">No comments yet.</p>';
        return;
    }

    comments.forEach(c => {
        const item = document.createElement('div');
        item.className = 'vp-comment-item';
        item.dataset.time = c.timeSeconds.toString();
        
        item.addEventListener('mouseenter', () => {
            isHoveringLine = true;
            highlightComment(c.timeSeconds, 'hover');
        });
        
        item.addEventListener('mouseleave', () => {
            isHoveringLine = false;
            highlightComment(-1, 'hover');
        });
        
        const header = document.createElement('div');
        header.className = 'vp-comment-header';
        
        const timeEl = document.createElement('span');
        timeEl.className = 'vp-comment-timestamp';
        timeEl.textContent = c.timestampStr;
        timeEl.addEventListener('click', () => {
            if (isPlaying) {
                startPlayback(c.timeSeconds);
            } else {
                pauseTime = c.timeSeconds;
                updateTimeDisplay(pauseTime);
                if (audioBuffer) {
                    progressBar.style.left = `${(pauseTime / audioBuffer.duration) * 100}%`;
                    progressBar.style.display = 'block';
                }
            }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '1.2em';
        deleteBtn.title = 'Delete Comment';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            comments = comments.filter(comment => comment !== c);
            renderComments();
            if (audioBuffer) renderOrangeMarkers(audioBuffer);
        });

        header.appendChild(timeEl);
        header.appendChild(deleteBtn);

        const textEl = document.createElement('div');
        textEl.className = 'vp-comment-text';
        textEl.textContent = c.text;

        item.appendChild(header);
        item.appendChild(textEl);
        commentList.appendChild(item);
    });
}

function handleWaveformHover(e: MouseEvent) {
    if (!audioBuffer || comments.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const hoverTime = percent * audioBuffer.duration;

    let foundComment = null;
    // Assume 3px threshold = (3 / canvas.width) * duration
    const threshold = (3 / canvas.width) * audioBuffer.duration;

    for (const c of comments) {
        if (Math.abs(c.timeSeconds - hoverTime) <= threshold) {
            foundComment = c;
            break;
        }
    }

    if (foundComment) {
        isHoveringLine = true;
        highlightComment(foundComment.timeSeconds, 'hover');
    } else {
        isHoveringLine = false;
        highlightComment(-1, 'hover');
    }
}

function handleWaveformMouseLeave() {
    isHoveringLine = false;
    highlightComment(-1, 'hover');
}

function highlightComment(timeSeconds: number, type: 'active' | 'hover') {
    const items = commentList.querySelectorAll('.vp-comment-item');
    items.forEach((item: Element) => {
        if (type === 'hover') item.classList.remove('vp-comment-hover-purple');
        if (type === 'active') item.classList.remove('vp-comment-active-orange');
        
        const itemTime = parseFloat((item as HTMLElement).dataset.time || '-1');
        if (itemTime === timeSeconds) {
            if (type === 'hover') {
                item.classList.add('vp-comment-hover-purple');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (type === 'active') {
                item.classList.add('vp-comment-active-orange');
                if (!isHoveringLine) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    });

    if (type === 'hover') {
        const markers = waveformContainer.querySelectorAll('.vp-orange-marker');
        markers.forEach(marker => {
            const markerTime = parseFloat((marker as HTMLElement).dataset.time || '-1');
            if (markerTime === timeSeconds) {
                marker.classList.add('vp-marker-hover');
            } else {
                marker.classList.remove('vp-marker-hover');
            }
        });
    }
}

async function exportFeedback() {
    if (!currentAudioBlob) {
        alert("No audio file loaded.");
        return;
    }

    const zip = new JSZip();
    const title = titleInput.value || currentAudioFilename || "Feedback";
    
    zip.file("comments.json", JSON.stringify({
        title: titleInput.value,
        comments: comments
    }, null, 2));

    let ext = "webm";
    if (currentAudioBlob.type.includes("wav") || currentAudioFilename.endsWith(".wav")) {
        ext = "wav";
    }
    zip.file(`audio.${ext}`, currentAudioBlob);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.zip`;
    a.click();
    
    URL.revokeObjectURL(url);
}
