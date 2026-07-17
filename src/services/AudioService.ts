import { EventBus } from "./EventBus.js";

/**
 * Centralized service for managing Web Audio API contexts and HTML5 Audio playback.
 * Also acts as a factory for MediaRecorders, tracking global recording times and states.
 */
class AppAudioService {
  private htmlAudio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;

  // For tracking global recording
  private activeRecorders: Set<MediaRecorder> = new Set();
  private accumulatedRecordTime: number = 0;
  private recordStartTimes: Map<MediaRecorder, number> = new Map();

  constructor() {
    this.htmlAudio = new Audio();
  }

  // --- HTML Audio Playback ---
  /**
   * Plays a given audio URL through a singleton HTMLAudioElement.
   * Ensures that previous audio is automatically halted before the new source begins.
   * @param url The source URL or base64 data string to play.
   * @param loop Whether the audio should loop continuously.
   * @returns A promise that resolves when playback starts.
   */
  playHtmlAudio(url: string, loop: boolean = false): Promise<void> {
    this.htmlAudio.src = url;
    this.htmlAudio.loop = loop;
    return this.htmlAudio.play();
  }

  stopHtmlAudio() {
    this.htmlAudio.pause();
    this.htmlAudio.currentTime = 0;
  }

  getHtmlAudioElement(): HTMLAudioElement {
    return this.htmlAudio;
  }

  // --- Web Audio API ---
  /**
   * Lazily instantiates and returns a singleton Web AudioContext.
   * Must be called after a user interaction to satisfy browser auto-play policies.
   */
  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return this.audioContext;
  }

  // --- Recording Factory ---
  /**
   * Creates and returns a configured MediaRecorder for a given MediaStream.
   * Automatically hooks into the recorder's start/stop events to track total
   * application recording time and broadcasts `recordingStarted`/`recordingStopped` events.
   * @param stream The MediaStream (usually from getUserMedia) to record.
   */
  createRecorder(stream: MediaStream): MediaRecorder {
    const recorder = new MediaRecorder(stream);

    recorder.addEventListener("start", () => {
      this.activeRecorders.add(recorder);
      this.recordStartTimes.set(recorder, performance.now());

      // Notify the system that a recording has started (useful for live timers)
      EventBus.emit("recordingStarted", {
        activeCount: this.activeRecorders.size,
      });
    });

    recorder.addEventListener("stop", () => {
      this.activeRecorders.delete(recorder);
      const startTime = this.recordStartTimes.get(recorder);

      if (startTime) {
        const duration = performance.now() - startTime;
        this.accumulatedRecordTime += duration;
        EventBus.emit("recordingStopped", {
          activeCount: this.activeRecorders.size,
          durationAdded: duration,
          totalAccumulated: this.accumulatedRecordTime,
        });
      }
      this.recordStartTimes.delete(recorder);
    });

    return recorder;
  }

  getActiveRecorderCount(): number {
    return this.activeRecorders.size;
  }
}

export const AudioService = new AppAudioService();
