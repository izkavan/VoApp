import { ZipService } from '../../services/ZipService.js';
import { AudioService } from '../../services/AudioService.js';
import { EventBus } from '../../services/EventBus.js';
import { FeedbackAudioPlayer } from './FeedbackAudioPlayer.js';
import { FeedbackWaveform } from './FeedbackWaveform.js';
import { html } from '../../services/HtmlSanitizer.js';

export interface VPComment {
    timestampStr: string;
    timeSeconds: number;
    text: string;
}

let player: FeedbackAudioPlayer;
let waveform: FeedbackWaveform;

let currentAudioBlob: Blob | null = null;
let currentAudioFilename: string = '';
let isHoveringLine: boolean = false;
let comments: VPComment[] = [];

// DOM Elements
let fileInput: HTMLInputElement;
let progressBar: HTMLElement;
let btnStart: HTMLButtonElement;
let btnPrevComment: HTMLButtonElement;
let btnPlayPause: HTMLButtonElement;
let btnInsertComment: HTMLButtonElement;
let timeDisplay: HTMLElement;
let commentList: HTMLElement;
let titleInput: HTMLInputElement;
let btnExport: HTMLButtonElement;

let commentModal: HTMLElement;
let timestampInput: HTMLInputElement;
let commentInput: HTMLTextAreaElement;
let cancelBtn: HTMLButtonElement;
let saveBtn: HTMLButtonElement;

export function initializeVoiceProductionFeedback() {
    player = new FeedbackAudioPlayer();
    waveform = new FeedbackWaveform('vp-waveform-canvas', '.vp-waveform-container');

    fileInput = document.getElementById('vp-audio-upload') as HTMLInputElement;
    progressBar = document.getElementById('vp-progress-bar') as HTMLElement;
    btnStart = document.getElementById('vp-btn-start') as HTMLButtonElement;
    btnPrevComment = document.getElementById('vp-btn-prev-comment') as HTMLButtonElement;
    btnPlayPause = document.getElementById('vp-btn-play-pause') as HTMLButtonElement;
    btnInsertComment = document.getElementById('vp-btn-insert-comment') as HTMLButtonElement;
    timeDisplay = document.getElementById('vp-time-display') as HTMLElement;
    commentList = document.getElementById('vp-comment-list') as HTMLElement;
    titleInput = document.getElementById('vp-feedback-title') as HTMLInputElement;
    btnExport = document.getElementById('vp-btn-export') as HTMLButtonElement;

    commentModal = document.getElementById('comment-modal') as HTMLElement;
    timestampInput = document.getElementById('comment-timestamp-input') as HTMLInputElement;
    commentInput = document.getElementById('comment-text-input') as HTMLTextAreaElement;
    cancelBtn = document.getElementById('comment-cancel-btn') as HTMLButtonElement;
    saveBtn = document.getElementById('comment-save-btn') as HTMLButtonElement;

    fileInput.addEventListener('change', handleFileUpload);
    
    const container = waveform.getContainer();
    container.addEventListener('click', handleWaveformClick);
    container.addEventListener('mousemove', handleWaveformHover);
    container.addEventListener('mouseleave', handleWaveformMouseLeave);
    
    btnPlayPause.addEventListener('click', () => player.toggle());
    btnStart.addEventListener('click', seekToBeginning);
    btnPrevComment.addEventListener('click', seekToLastComment);
    btnInsertComment.addEventListener('click', openCommentModal);
    btnExport.addEventListener('click', exportFeedback);

    cancelBtn.addEventListener('click', closeCommentModal);
    saveBtn.addEventListener('click', saveComment);

    // Event Bus Bindings
    EventBus.on('feedbackPlaybackStarted', () => {
        btnPlayPause.textContent = '⏸';
    });
    
    EventBus.on('feedbackPlaybackStopped', (e) => {
        btnPlayPause.textContent = '▶';
        if (e.detail.pauseTime === 0) {
            progressBar.style.display = 'none';
            updateTimeDisplay(0);
        }
    });

    EventBus.on('feedbackPlaybackProgress', (e) => {
        const { currentTime, duration } = e.detail;
        updateTimeDisplay(currentTime);
        progressBar.style.display = 'block';
        progressBar.style.left = `${(currentTime / duration) * 100}%`;

        let activeComment = null;
        for (const c of comments) {
            if (c.timeSeconds <= currentTime) {
                activeComment = c;
            }
        }
        highlightComment(activeComment ? activeComment.timeSeconds : -1, 'active');
    });
}

async function handleFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const ctx = AudioService.getAudioContext();

    if (file.name.endsWith('.zip')) {
        const zip = await ZipService.loadZip(file);
        
        const data = await ZipService.readJsonFile<any>(zip, 'comments.json', {});
        titleInput.value = data.title || '';
        comments = data.comments || [];

        const audioFiles = Object.keys(zip.files).filter(k => k.startsWith('audio.'));
        if (audioFiles.length > 0) {
            const audioZipFile = zip.file(audioFiles[0]);
            if (audioZipFile) {
                const arrayBuffer = await audioZipFile.async('arraybuffer');
                currentAudioBlob = new Blob([arrayBuffer]);
                currentAudioFilename = file.name.replace(/\.zip$/, '');
                player.setBuffer(await ctx.decodeAudioData(arrayBuffer));
            }
        }
    } else {
        const arrayBuffer = await file.arrayBuffer();
        currentAudioBlob = new Blob([arrayBuffer], { type: file.type });
        currentAudioFilename = file.name.replace(/\.[^/.]+$/, '');
        titleInput.value = currentAudioFilename;
        player.setBuffer(await ctx.decodeAudioData(arrayBuffer));
        comments = [];
    }
    
    renderComments();
    const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary-color').trim() || '#007bff';
    waveform.draw(player.getBuffer(), primaryColor);
    waveform.renderMarkers(comments, player.getBuffer()?.duration || 0);
    updateTimeDisplay(0);
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

function handleWaveformClick(e: MouseEvent) {
    const buffer = player.getBuffer();
    if (!buffer) return;
    
    // Rounded down to nearest second
    const seekTime = Math.floor(waveform.getClickTime(e, buffer.duration));
    player.play(seekTime);
}

function seekToBeginning() {
    if (player.getIsPlaying()) {
        player.play(0);
    } else {
        player.setPauseTime(0);
        updateTimeDisplay(0);
        progressBar.style.left = '0%';
    }
}

function seekToLastComment() {
    const current = player.getCurrentTime();
    let prevCommentTime = 0;

    for (const c of comments) {
        if (c.timeSeconds < current - 0.5) {
            if (c.timeSeconds > prevCommentTime) {
                prevCommentTime = c.timeSeconds;
            }
        }
    }

    if (player.getIsPlaying()) {
        player.play(prevCommentTime);
    } else {
        player.setPauseTime(prevCommentTime);
        updateTimeDisplay(prevCommentTime);
        const buffer = player.getBuffer();
        if (buffer) {
            progressBar.style.left = `${(prevCommentTime / buffer.duration) * 100}%`;
            progressBar.style.display = 'block';
        }
    }
}

function openCommentModal() {
    if (player.getIsPlaying()) {
        player.stop(true);
    }
    
    timestampInput.value = formatTime(player.getPauseTime());
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
        waveform.renderMarkers(comments, player.getBuffer()?.duration || 0);
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
            if (player.getIsPlaying()) {
                player.play(c.timeSeconds);
            } else {
                player.setPauseTime(c.timeSeconds);
                updateTimeDisplay(c.timeSeconds);
                const buffer = player.getBuffer();
                if (buffer) {
                    progressBar.style.left = `${(c.timeSeconds / buffer.duration) * 100}%`;
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
            waveform.renderMarkers(comments, player.getBuffer()?.duration || 0);
        });

        header.appendChild(timeEl);
        header.appendChild(deleteBtn);

        const textEl = document.createElement('div');
        textEl.className = 'vp-comment-text';
        // HTML Sanitizer to prevent XSS in comment text!
        textEl.innerHTML = html`${c.text}`;

        item.appendChild(header);
        item.appendChild(textEl);
        commentList.appendChild(item);
    });
}

function handleWaveformHover(e: MouseEvent) {
    const buffer = player.getBuffer();
    if (!buffer || comments.length === 0) return;
    
    const hoverTime = waveform.getClickTime(e, buffer.duration);
    let foundComment = null;
    const threshold = (3 / waveform.getContainer().getBoundingClientRect().width) * buffer.duration;

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
        const markers = waveform.getContainer().querySelectorAll('.vp-orange-marker');
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

    const zip = await ZipService.createZip();
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

    await ZipService.downloadZip(zip, `${title}.zip`);
}
