import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeRecordTimer, updateRecordTimerVisibility } from '../../src/components/record-timer.js';
import { SystemSettings } from '../../src/types.js';

describe('record-timer', () => {
    let container: HTMLElement;
    let display: HTMLElement;
    let resetBtn: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'record-timer-container';
        display = document.createElement('div');
        display.id = 'record-timer-display';
        resetBtn = document.createElement('button');
        resetBtn.id = 'record-timer-reset';
        
        document.body.appendChild(container);
        document.body.appendChild(display);
        document.body.appendChild(resetBtn);

        vi.useFakeTimers();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((k) => store[k] || null),
            setItem: vi.fn((k, v) => store[k] = v),
            removeItem: vi.fn((k) => delete store[k]),
            clear: vi.fn(() => {})
        });

        if (!window.MediaRecorder) {
            (window as any).MediaRecorder = class MediaRecorder {
                start() {}
                stop() {}
            };
        } else {
             // ensure base methods exist to patch safely if re-running
             if (!MediaRecorder.prototype.start) MediaRecorder.prototype.start = function() {};
             if (!MediaRecorder.prototype.stop) MediaRecorder.prototype.stop = function() {};
        }
        delete (window as any).__mediaRecorderPatched;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('initializes and formats time correctly', () => {
        localStorage.setItem('VoApp_RecordTimer', '3661005'); // 1h 1m 1s 5ms
        initializeRecordTimer({ featureVisibility: { showRecordTimer: true } } as SystemSettings);

        expect(display.textContent).toBe('01:01:01.005');
        expect(container.style.display).toBe('flex');
    });

    it('resets timer on click', () => {
        localStorage.setItem('VoApp_RecordTimer', '5000');
        initializeRecordTimer({ featureVisibility: { showRecordTimer: true } } as SystemSettings);

        resetBtn.click();
        expect(window.confirm).toHaveBeenCalled();
        expect(display.textContent).toBe('00:00:00.000');
        expect(localStorage.setItem).toHaveBeenCalledWith('VoApp_RecordTimer', '0');
    });

    it('updates visibility', () => {
        initializeRecordTimer({ featureVisibility: { showRecordTimer: false } } as SystemSettings);
        expect(container.style.display).toBe('none');

        updateRecordTimerVisibility({ featureVisibility: { showRecordTimer: true } } as SystemSettings);
        expect(container.style.display).toBe('flex');
    });

    it('monkey patches MediaRecorder and tracks time', () => {
        initializeRecordTimer({ featureVisibility: { showRecordTimer: true } } as SystemSettings);
        expect((window as any).__mediaRecorderPatched).toBe(true);

        const mr = new MediaRecorder({} as any);
        
        let perfNow = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => perfNow);

        mr.start();
        
        perfNow = 1000;
        vi.advanceTimersByTime(1000); 
        
        mr.stop();

        expect(display.textContent).toBe('00:00:01.000');
    });
});
