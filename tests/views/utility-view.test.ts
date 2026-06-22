import { describe, it, expect, vi } from 'vitest';
import { initializeUtilityView } from '../../src/views/utility-view.js';
import * as warmups from '../../src/views/utility/warmups.js';
import * as voiceMemos from '../../src/views/utility/voice-memos.js';

describe('utility-view', () => {
    it('initializes sub-views', () => {
        vi.spyOn(warmups, 'initializeWarmUps').mockImplementation(() => {});
        vi.spyOn(voiceMemos, 'initializeVoiceMemos').mockImplementation(() => {});

        initializeUtilityView();

        expect(warmups.initializeWarmUps).toHaveBeenCalled();
        expect(voiceMemos.initializeVoiceMemos).toHaveBeenCalled();
    });
});
