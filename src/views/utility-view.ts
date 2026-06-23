import { initializeWarmUps } from './utility/warmups.js';
import { initializeVoiceMemos } from './utility/voice-memos.js';
import { initializeAudioOverlay } from './utilities/audio-overlay.js';

export function initializeUtilityView(): void {
    initializeWarmUps();
    initializeVoiceMemos();
    initializeAudioOverlay();
}
