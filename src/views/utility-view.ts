import { initializeWarmUps } from './utility/warmups.js';
import { initializeVoiceMemos } from './utility/voice-memos.js';

export function initializeUtilityView(): void {
    initializeWarmUps();
    initializeVoiceMemos();
}
