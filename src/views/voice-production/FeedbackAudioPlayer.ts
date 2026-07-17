import { AudioService } from "../../services/AudioService.js";
import { EventBus } from "../../services/EventBus.js";

export class FeedbackAudioPlayer {
  private sourceNode: AudioBufferSourceNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private audioBuffer: AudioBuffer | null = null;

  setBuffer(buffer: AudioBuffer | null) {
    this.stop();
    this.pauseTime = 0;
    this.audioBuffer = buffer;
  }

  getBuffer() {
    return this.audioBuffer;
  }
  getIsPlaying() {
    return this.isPlaying;
  }
  getPauseTime() {
    return this.pauseTime;
  }
  setPauseTime(t: number) {
    this.pauseTime = t;
  }

  toggle() {
    if (!this.audioBuffer) return;
    if (this.isPlaying) this.stop(true);
    else this.play(this.pauseTime);
  }

  play(offset: number) {
    if (!this.audioBuffer) return;
    if (this.isPlaying) this.stop();

    const ctx = AudioService.getAudioContext();
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(ctx.destination);

    this.sourceNode.start(0, offset);
    this.startTime = ctx.currentTime - offset;
    this.isPlaying = true;

    EventBus.emit("feedbackPlaybackStarted");
    this.updateProgress();
  }

  stop(pause: boolean = false) {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;

    const ctx = AudioService.getAudioContext();
    if (pause && ctx) {
      this.pauseTime = ctx.currentTime - this.startTime;
    } else {
      this.pauseTime = 0;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    EventBus.emit("feedbackPlaybackStopped", { pauseTime: this.pauseTime });
  }

  private updateProgress = () => {
    if (!this.audioBuffer || !this.isPlaying) return;

    const ctx = AudioService.getAudioContext();
    const currentTime = ctx.currentTime - this.startTime;

    if (currentTime >= this.audioBuffer.duration) {
      this.stop();
      return;
    }

    EventBus.emit("feedbackPlaybackProgress", {
      currentTime,
      duration: this.audioBuffer.duration,
    });
    this.animationFrameId = requestAnimationFrame(this.updateProgress);
  };

  getCurrentTime() {
    if (this.isPlaying) {
      return AudioService.getAudioContext().currentTime - this.startTime;
    }
    return this.pauseTime;
  }
}
