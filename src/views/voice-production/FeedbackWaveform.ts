export class FeedbackWaveform {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;

  constructor(canvasId: string, containerSelector: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.container = document.querySelector(containerSelector) as HTMLElement;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.container || !this.canvas) return;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 150;
  }

  draw(buffer: AudioBuffer | null, primaryColor: string = "#007bff") {
    if (!buffer) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    this.resize();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const channelData = buffer.getChannelData(0);
    const step = Math.ceil(channelData.length / this.canvas.width);
    const amp = this.canvas.height / 2;

    this.ctx.fillStyle = primaryColor;

    for (let i = 0; i < this.canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = channelData[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      this.ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
  }

  renderMarkers(comments: { timeSeconds: number }[], duration: number) {
    if (!this.container) return;
    const existing = this.container.querySelectorAll(".vp-orange-marker");
    existing.forEach((el) => el.remove());

    if (comments.length > 0 && duration > 0) {
      for (const c of comments) {
        const percent = c.timeSeconds / duration;
        const marker = document.createElement("div");
        marker.className = "vp-orange-marker";
        marker.dataset.time = c.timeSeconds.toString();
        marker.style.left = `${percent * 100}%`;
        this.container.appendChild(marker);
      }
    }
  }

  getClickTime(e: MouseEvent, duration: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    return percent * duration;
  }

  getContainer(): HTMLElement {
    return this.container;
  }
}
