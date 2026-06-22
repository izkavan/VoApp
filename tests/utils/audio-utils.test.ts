import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertWebMToWav } from '../../src/utils/audio-utils.js';

describe('audio-utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock AudioContext
        (window as any).AudioContext = function() {
            return {
                decodeAudioData: vi.fn().mockResolvedValue({
                    numberOfChannels: 1,
                    length: 10,
                    sampleRate: 44100,
                    getChannelData: vi.fn().mockReturnValue(new Float32Array(10))
                })
            };
        };

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({
            blob: vi.fn().mockResolvedValue(new Blob(['mock data']))
        });
    });

    it('converts base64 string to wav blob', async () => {
        const result = await convertWebMToWav('data:audio/webm;base64,mock');
        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('audio/wav');
        expect(global.fetch).toHaveBeenCalledWith('data:audio/webm;base64,mock');
    });

    it('converts webm blob to wav blob', async () => {
        const blob = new Blob(['mock data']);
        blob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(10));
        
        const result = await convertWebMToWav(blob);
        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('audio/wav');
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
