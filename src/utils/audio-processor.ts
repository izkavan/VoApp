import { audioBufferToWav } from './audio-utils.js';

export interface AudioClip {
    id: string;
    buffer: AudioBuffer;
    startTime: number;
    endTime: number;
}

export async function compileDemoReelBuffer(
    clips: AudioClip[],
    silenceSecs: number
): Promise<AudioBuffer> {
    if (clips.length === 0) throw new Error("No clips provided");

    let maxChannels = 1;
    let maxSampleRate = clips[0].buffer.sampleRate;

    for (const clip of clips) {
        if (clip.buffer.numberOfChannels > maxChannels) maxChannels = clip.buffer.numberOfChannels;
        if (clip.buffer.sampleRate > maxSampleRate) maxSampleRate = clip.buffer.sampleRate;
    }

    let totalSecs = 0;
    for (const clip of clips) {
        totalSecs += (clip.endTime - clip.startTime);
    }
    totalSecs += (clips.length - 1) * silenceSecs;

    const totalSamples = Math.ceil(totalSecs * maxSampleRate);
    const offlineCtx = new OfflineAudioContext(maxChannels, totalSamples, maxSampleRate);

    let currentTime = 0;
    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const duration = clip.endTime - clip.startTime;
        
        const source = offlineCtx.createBufferSource();
        source.buffer = clip.buffer;
        source.connect(offlineCtx.destination);
        source.start(currentTime, clip.startTime, duration);
        
        currentTime += duration;
        if (i < clips.length - 1) {
            currentTime += silenceSecs;
        }
    }

    return await offlineCtx.startRendering();
}

export async function exportDemoReel(
    clips: AudioClip[],
    silenceSecs: number,
    format: 'wav' | 'webm',
    onProgress?: (msg: string) => void
): Promise<Blob> {
    const combinedBuffer = await compileDemoReelBuffer(clips, silenceSecs);

    if (format === 'wav') {
        return audioBufferToWav(combinedBuffer);
    } else {
        // Real-time encode to webm
        return new Promise((resolve) => {
            if (onProgress) onProgress(`Encoding WebM (takes ${Math.ceil(combinedBuffer.duration)}s)...`);
            
            const ctx = new window.AudioContext();
            const dest = ctx.createMediaStreamDestination();
            const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
            const chunks: Blob[] = [];
            
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                ctx.close();
                resolve(new Blob(chunks, { type: 'audio/webm' }));
            };
            
            recorder.start();

            const source = ctx.createBufferSource();
            source.buffer = combinedBuffer;
            source.connect(dest);
            source.start(0);

            source.onended = () => {
                recorder.stop();
            };
        });
    }
}
