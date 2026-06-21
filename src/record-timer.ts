import { SystemSettings } from './types.js';

let activeRecorders = 0;
let accumulatedTime = 0; // in milliseconds
let timerInterval: number | null = null;
let lastTickTime = 0;

const STORAGE_KEY = 'VoApp_RecordTimer';

export function initializeRecordTimer(settings: SystemSettings) {
    const container = document.getElementById('record-timer-container');
    const display = document.getElementById('record-timer-display');
    const resetBtn = document.getElementById('record-timer-reset');

    const savedTime = localStorage.getItem(STORAGE_KEY);
    if (savedTime) {
        accumulatedTime = parseInt(savedTime, 10);
    }

    const updateDisplay = () => {
        if (!display) return;
        const totalSecs = Math.floor(accumulatedTime / 1000);
        const ms = Math.floor(accumulatedTime % 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        display.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    updateDisplay();

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Reset total recording time to zero?")) {
                accumulatedTime = 0;
                localStorage.setItem(STORAGE_KEY, '0');
                updateDisplay();
            }
        });
    }

    const tick = () => {
        const now = performance.now();
        const dt = now - lastTickTime;
        lastTickTime = now;
        accumulatedTime += dt;
        updateDisplay();
        
        // Save roughly every second instead of every frame to save I/O
        if (Math.random() < 0.05) {
            localStorage.setItem(STORAGE_KEY, accumulatedTime.toString());
        }
    };

    // Monkey-patch MediaRecorder globally
    if (!(window as any).__mediaRecorderPatched) {
        const originalStart = MediaRecorder.prototype.start;
        const originalStop = MediaRecorder.prototype.stop;

        MediaRecorder.prototype.start = function(timeslice?: number) {
            activeRecorders++;
            if (activeRecorders === 1) {
                lastTickTime = performance.now();
                timerInterval = window.setInterval(tick, 37);
            }
            return originalStart.apply(this, arguments as any);
        };

        MediaRecorder.prototype.stop = function() {
            if (activeRecorders > 0) activeRecorders--;
            if (activeRecorders === 0 && timerInterval !== null) {
                window.clearInterval(timerInterval);
                timerInterval = null;
                
                const now = performance.now();
                const dt = now - lastTickTime;
                accumulatedTime += dt;
                updateDisplay();
                localStorage.setItem(STORAGE_KEY, accumulatedTime.toString());
            }
            return originalStop.apply(this, arguments as any);
        };
        (window as any).__mediaRecorderPatched = true;
    }

    updateRecordTimerVisibility(settings);
}

export function updateRecordTimerVisibility(settings: SystemSettings) {
    const container = document.getElementById('record-timer-container');
    if (container) {
        container.style.display = settings.featureVisibility?.showRecordTimer ? 'flex' : 'none';
    }
}
