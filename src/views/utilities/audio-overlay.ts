import { AudioService } from '../../services/AudioService.js';

let fileInput1: HTMLInputElement;
let fileInput2: HTMLInputElement;
let volInput1: HTMLInputElement;
let volInput2: HTMLInputElement;
let muteInput1: HTMLInputElement;
let muteInput2: HTMLInputElement;
let trackInput1: HTMLInputElement;
let trackInput2: HTMLInputElement;
let trackVal1: HTMLInputElement;
let trackVal2: HTMLInputElement;
let playBtn: HTMLButtonElement;
let clearBtn: HTMLButtonElement;
let canvas: HTMLCanvasElement;
let playhead: HTMLDivElement;

let ctx: AudioContext;
let buffer1: AudioBuffer | null = null;
let buffer2: AudioBuffer | null = null;
let offset1 = 0;
let offset2 = 0;

let source1: AudioBufferSourceNode | null = null;
let source2: AudioBufferSourceNode | null = null;
let gain1: GainNode | null = null;
let gain2: GainNode | null = null;

let isPlaying = false;
let startTime = 0;
let animationFrameId: number;

export function initializeAudioOverlay() {
    fileInput1 = document.getElementById('ao-file1') as HTMLInputElement;
    fileInput2 = document.getElementById('ao-file2') as HTMLInputElement;
    volInput1 = document.getElementById('ao-vol1') as HTMLInputElement;
    volInput2 = document.getElementById('ao-vol2') as HTMLInputElement;
    muteInput1 = document.getElementById('ao-mute1') as HTMLInputElement;
    muteInput2 = document.getElementById('ao-mute2') as HTMLInputElement;
    trackInput1 = document.getElementById('ao-track1') as HTMLInputElement;
    trackInput2 = document.getElementById('ao-track2') as HTMLInputElement;
    trackVal1 = document.getElementById('ao-track1-val') as HTMLInputElement;
    trackVal2 = document.getElementById('ao-track2-val') as HTMLInputElement;
    playBtn = document.getElementById('ao-play-btn') as HTMLButtonElement;
    clearBtn = document.getElementById('ao-clear-btn') as HTMLButtonElement;
    canvas = document.getElementById('ao-canvas') as HTMLCanvasElement;
    playhead = document.getElementById('ao-playhead') as HTMLDivElement;

    ctx = AudioService.getAudioContext();

    fileInput1.addEventListener('change', (e) => handleFile(e, 1));
    fileInput2.addEventListener('change', (e) => handleFile(e, 2));

    trackInput1.addEventListener('input', () => {
        offset1 = parseFloat(trackInput1.value);
        trackVal1.value = offset1.toFixed(2);
        drawWaveforms();
    });
    trackInput2.addEventListener('input', () => {
        offset2 = parseFloat(trackInput2.value);
        trackVal2.value = offset2.toFixed(2);
        drawWaveforms();
    });

    trackVal1.addEventListener('change', () => {
        let val = parseFloat(trackVal1.value);
        if (isNaN(val)) val = 0;
        trackInput1.value = val.toString();
        offset1 = parseFloat(trackInput1.value);
        trackVal1.value = offset1.toFixed(2);
        drawWaveforms();
    });

    trackVal2.addEventListener('change', () => {
        let val = parseFloat(trackVal2.value);
        if (isNaN(val)) val = 0;
        trackInput2.value = val.toString();
        offset2 = parseFloat(trackInput2.value);
        trackVal2.value = offset2.toFixed(2);
        drawWaveforms();
    });

    const handleSliderScroll = (e: WheelEvent, input: HTMLInputElement, valInput: HTMLInputElement, isTrack1: boolean) => {
        e.preventDefault();
        const step = parseFloat(input.step) || 0.01;
        // Scroll up (negative delta) moves right (increase), Scroll down moves left (decrease)
        let newVal = parseFloat(input.value) + (e.deltaY < 0 ? step * 10 : -step * 10);
        
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        input.value = newVal.toString();
        valInput.value = newVal.toFixed(2);
        
        if (isTrack1) {
            offset1 = parseFloat(input.value);
        } else {
            offset2 = parseFloat(input.value);
        }
        drawWaveforms();
    };

    trackInput1.addEventListener('wheel', (e) => handleSliderScroll(e, trackInput1, trackVal1, true));
    trackInput2.addEventListener('wheel', (e) => handleSliderScroll(e, trackInput2, trackVal2, false));

    volInput1.addEventListener('input', updateVolumes);
    volInput2.addEventListener('input', updateVolumes);
    muteInput1.addEventListener('change', updateVolumes);
    muteInput2.addEventListener('change', updateVolumes);

    playBtn.addEventListener('click', togglePlay);
    clearBtn.addEventListener('click', clearAll);

    // Resize observer to redraw on layout changes
    new ResizeObserver(() => {
        drawWaveforms();
    }).observe(canvas.parentElement!);
}

async function handleFile(e: Event, trackNum: number) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);

    if (trackNum === 1) {
        buffer1 = decoded;
    } else {
        buffer2 = decoded;
    }

    updateTrackLimits();
    drawWaveforms();
}

function updateTrackLimits() {
    const maxDur = Math.max(buffer1?.duration || 0, buffer2?.duration || 0);
    if (maxDur > 0) {
        trackInput1.min = (-maxDur).toString();
        trackInput1.max = maxDur.toString();
        trackInput2.min = (-maxDur).toString();
        trackInput2.max = maxDur.toString();
    }
}

function clearAll() {
    stopPlayback();
    buffer1 = null;
    buffer2 = null;
    offset1 = 0;
    offset2 = 0;
    fileInput1.value = '';
    fileInput2.value = '';
    trackInput1.value = '0';
    trackInput2.value = '0';
    trackVal1.value = '0.00';
    trackVal2.value = '0.00';
    volInput1.value = '1';
    volInput2.value = '1';
    muteInput1.checked = false;
    muteInput2.checked = false;
    updateTrackLimits();
    drawWaveforms();
}

function updateVolumes() {
    if (gain1) gain1.gain.value = muteInput1.checked ? 0 : parseFloat(volInput1.value);
    if (gain2) gain2.gain.value = muteInput2.checked ? 0 : parseFloat(volInput2.value);
}

function togglePlay() {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    if (!buffer1 && !buffer2) return;
    stopPlayback();

    const maxDur = Math.max(buffer1?.duration || 0, buffer2?.duration || 0);
    if (maxDur === 0) return;

    isPlaying = true;
    playBtn.textContent = 'Stop';
    playBtn.style.background = 'var(--danger-color)';
    playhead.style.display = 'block';

    if (buffer1) {
        source1 = ctx.createBufferSource();
        source1.buffer = buffer1;
        gain1 = ctx.createGain();
        source1.connect(gain1);
        gain1.connect(ctx.destination);
    }

    if (buffer2) {
        source2 = ctx.createBufferSource();
        source2.buffer = buffer2;
        gain2 = ctx.createGain();
        source2.connect(gain2);
        gain2.connect(ctx.destination);
    }

    updateVolumes();

    startTime = ctx.currentTime;

    if (source1) {
        if (offset1 >= 0) {
            source1.start(startTime + offset1);
        } else {
            source1.start(startTime, -offset1);
        }
    }

    if (source2) {
        if (offset2 >= 0) {
            source2.start(startTime + offset2);
        } else {
            source2.start(startTime, -offset2);
        }
    }

    const animate = () => {
        if (!isPlaying) return;
        const elapsed = ctx.currentTime - startTime;
        
        if (elapsed > maxDur) {
            stopPlayback();
            return;
        }

        const pct = elapsed / maxDur;
        playhead.style.left = `${pct * 100}%`;
        animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
}

function stopPlayback() {
    isPlaying = false;
    playBtn.textContent = 'Play';
    playBtn.style.background = 'var(--success-color)';
    playhead.style.display = 'none';

    if (source1) {
        try { source1.stop(); } catch(e) {}
        source1.disconnect();
        source1 = null;
    }
    if (gain1) { gain1.disconnect(); gain1 = null; }

    if (source2) {
        try { source2.stop(); } catch(e) {}
        source2.disconnect();
        source2 = null;
    }
    if (gain2) { gain2.disconnect(); gain2 = null; }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

function drawWaveforms() {
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    canvasCtx.scale(dpr, dpr);
    canvasCtx.clearRect(0, 0, rect.width, rect.height);
    
    const maxDur = Math.max(buffer1?.duration || 0, buffer2?.duration || 0);
    if (maxDur === 0) return;

    canvasCtx.globalCompositeOperation = 'source-over';

    if (buffer1) {
        drawBuffer(canvasCtx, buffer1, offset1, maxDur, rect.width, rect.height, 'rgba(0, 255, 255, 0.5)');
    }
    
    if (buffer2) {
        drawBuffer(canvasCtx, buffer2, offset2, maxDur, rect.width, rect.height, 'rgba(255, 0, 255, 0.5)');
    }
}

function drawBuffer(
    ctx: CanvasRenderingContext2D, 
    buffer: AudioBuffer, 
    offset: number, 
    maxDur: number, 
    width: number, 
    height: number, 
    color: string
) {
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    ctx.fillStyle = color;

    const offsetPx = (offset / maxDur) * width;
    const durationPx = (buffer.duration / maxDur) * width;

    const startX = Math.max(0, offsetPx);
    const endX = Math.min(width, offsetPx + durationPx);

    for (let i = startX; i < endX; i++) {
        const relativePx = i - offsetPx;
        const relativePct = relativePx / durationPx;
        const dataIndex = Math.floor(relativePct * data.length);
        
        let min = 1.0;
        let max = -1.0;
        
        for (let j = 0; j < step && (dataIndex + j) < data.length; j++) {
            const datum = data[dataIndex + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }

        const y1 = (1 + min) * amp;
        const y2 = (1 + max) * amp;
        const h = Math.max(1, y2 - y1);
        
        ctx.fillRect(i, y1, 1, h);
    }
}
