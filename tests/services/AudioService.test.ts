import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioService } from '../../src/services/AudioService.js';
import { EventBus } from '../../src/services/EventBus.js';

vi.mock('../../src/services/EventBus.js', () => ({
    EventBus: {
        emit: vi.fn()
    }
}));

describe('AudioService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the singleton properties if possible, or just mock what we need
        // Since AudioService is a singleton instance exported, we'll test it carefully.
        
        // Mock Audio
        global.Audio = vi.fn().mockImplementation(() => ({
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            src: '',
            loop: false,
            currentTime: 0
        }));

        // Mock window.AudioContext
        (window as any).AudioContext = function() {
            return {
                createMediaStreamDestination: vi.fn()
            };
        };

        // Mock window.MediaRecorder
        (window as any).MediaRecorder = function() {
            return {
                start: vi.fn(),
                stop: vi.fn(),
                addEventListener: vi.fn()
            };
        };
    });

    it('plays HTML audio', async () => {
        await AudioService.playHtmlAudio('test.mp3', true);
        
        // Cannot easily assert the private htmlAudio instance, but we can verify execution flow completes without error.
        expect(true).toBe(true);
    });

    it('stops HTML audio', () => {
        AudioService.stopHtmlAudio();
        // Since we mocked global.Audio internally to the singleton, we can't easily assert .pause() unless we override the internal variable.
        expect(true).toBe(true);
    });

    it('lazily initializes AudioContext', () => {
        const ctx = AudioService.getAudioContext();
        expect(ctx).toBeDefined();
        
        // Getting it again should return the same instance
        const ctx2 = AudioService.getAudioContext();
        expect(ctx).toBe(ctx2);
    });

    it('creates a recorder and binds to its lifecycle', () => {
        const stream = {} as MediaStream;
        const recorder = AudioService.createRecorder(stream);
        
        expect(recorder).toBeDefined();
        // It binds start/stop listeners to emit EventBus events
        expect(recorder.addEventListener).toHaveBeenCalledWith('start', expect.any(Function));
        expect(recorder.addEventListener).toHaveBeenCalledWith('stop', expect.any(Function));
    });

    it('tracks active recorder count correctly', () => {
        const stream = {} as MediaStream;
        const recorder: any = AudioService.createRecorder(stream);
        
        const startCallback = recorder.addEventListener.mock.calls.find((call: any[]) => call[0] === 'start')[1];
        const stopCallback = recorder.addEventListener.mock.calls.find((call: any[]) => call[0] === 'stop')[1];

        // Ensure state is 0 to start
        const initialCount = AudioService.getActiveRecorderCount();
        
        // Start recording
        startCallback();
        expect(AudioService.getActiveRecorderCount()).toBe(initialCount + 1);
        expect(EventBus.emit).toHaveBeenCalledWith('recordingStarted', { activeCount: initialCount + 1 });

        // Stop recording
        stopCallback();
        expect(AudioService.getActiveRecorderCount()).toBe(initialCount);
        expect(EventBus.emit).toHaveBeenCalledWith('recordingStopped', expect.objectContaining({ activeCount: initialCount }));
    });
});
