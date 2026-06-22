import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackAudioPlayer } from '../../../src/views/voice-production/FeedbackAudioPlayer.js';
import { AudioService } from '../../../src/services/AudioService.js';
import { EventBus } from '../../../src/services/EventBus.js';

vi.mock('../../../src/services/AudioService.js', () => ({
    AudioService: {
        getAudioContext: vi.fn()
    }
}));

vi.mock('../../../src/services/EventBus.js', () => ({
    EventBus: {
        emit: vi.fn()
    }
}));

describe('FeedbackAudioPlayer', () => {
    let player: FeedbackAudioPlayer;
    let mockContext: any;
    let mockSource: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSource = {
            buffer: null,
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            disconnect: vi.fn()
        };

        mockContext = {
            currentTime: 10,
            createBufferSource: vi.fn(() => mockSource),
            destination: {}
        };

        (AudioService.getAudioContext as any).mockReturnValue(mockContext);

        player = new FeedbackAudioPlayer();
    });

    it('sets buffer and stops previous playback', () => {
        const buffer = { duration: 10 } as AudioBuffer;
        const stopSpy = vi.spyOn(player, 'stop');

        player.setBuffer(buffer);

        expect(stopSpy).toHaveBeenCalled();
        expect(player.getBuffer()).toBe(buffer);
        expect(player.getPauseTime()).toBe(0);
    });

    it('plays audio and emits event', () => {
        const buffer = { duration: 10 } as AudioBuffer;
        player.setBuffer(buffer);
        
        player.play(2);

        expect(mockContext.createBufferSource).toHaveBeenCalled();
        expect(mockSource.connect).toHaveBeenCalledWith(mockContext.destination);
        expect(mockSource.start).toHaveBeenCalledWith(0, 2);
        expect(player.getIsPlaying()).toBe(true);
        expect(EventBus.emit).toHaveBeenCalledWith('feedbackPlaybackStarted');
    });

    it('stops audio and records pause time', () => {
        const buffer = { duration: 10 } as AudioBuffer;
        player.setBuffer(buffer);
        player.play(0); // startTime = 10
        
        mockContext.currentTime = 14; // Time advanced
        player.stop(true); // Stop and pause

        expect(mockSource.stop).toHaveBeenCalled();
        expect(mockSource.disconnect).toHaveBeenCalled();
        expect(player.getIsPlaying()).toBe(false);
        expect(player.getPauseTime()).toBe(4);
        expect(EventBus.emit).toHaveBeenCalledWith('feedbackPlaybackStopped', { pauseTime: 4 });
    });

    it('toggles playback', () => {
        const buffer = { duration: 10 } as AudioBuffer;
        player.setBuffer(buffer);
        
        const playSpy = vi.spyOn(player, 'play');
        const stopSpy = vi.spyOn(player, 'stop');

        player.toggle(); // starts playing
        expect(playSpy).toHaveBeenCalledWith(0);

        player.toggle(); // stops playing
        expect(stopSpy).toHaveBeenCalledWith(true);
    });
});
