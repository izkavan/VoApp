import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeWarmUps } from '../../src/views/utility/warmups.js';
import { AudioService } from '../../src/services/AudioService.js';

describe('warmup-view', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="warm-up-text"></div>
            <button id="warm-up-record-button"></button>
            <div id="warm-up-audio-player"></div>
        `;

        vi.stubGlobal('URL', {
            createObjectURL: vi.fn().mockReturnValue('blob:url'),
            revokeObjectURL: vi.fn()
        });
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        vi.spyOn(AudioService, 'createRecorder').mockReturnValue({
            state: 'inactive',
            start: function(this: any) { this.state = 'recording'; },
            stop: function(this: any) { this.state = 'inactive'; },
            addEventListener: function(this: any, evt: string, cb: any) {
                if (evt === 'stop') {
                    this.onstop = cb;
                }
                if (evt === 'dataavailable') {
                    this.ondataavailable = cb;
                }
            },
            onstop: null,
            ondataavailable: null
        } as any);

        vi.stubGlobal('navigator', {
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue({
                    getTracks: () => [{ stop: vi.fn() }]
                })
            }
        });
    });

    it('initializes text and handles recording', async () => {
        initializeWarmUps();

        const textDiv = document.getElementById('warm-up-text') as HTMLDivElement;
        expect(textDiv.innerHTML).toContain('Lip Trills');

        const recordBtn = document.getElementById('warm-up-record-button') as HTMLButtonElement;
        recordBtn.click();

        await new Promise(r => setTimeout(r, 50));
        expect(recordBtn.classList.contains('recording')).toBe(true);

        const recorder = (AudioService.createRecorder as any).mock.results[0].value;
        
        recordBtn.click();
        await new Promise(r => setTimeout(r, 50));
        
        expect(recordBtn.classList.contains('recording')).toBe(false);

        if (recorder.onstop) recorder.onstop();
        
        const playerDiv = document.getElementById('warm-up-audio-player') as HTMLDivElement;
        expect(playerDiv.innerHTML).toContain('<audio');
    });
});
