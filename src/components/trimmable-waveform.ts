export class TrimmableWaveform {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private buffer: AudioBuffer | null = null;

  public startTime: number = 0;
  public endTime: number = 0;
  private duration: number = 0;

  private isDraggingLeft = false;
  private isDraggingRight = false;

  private onTrimChange?: (start: number, end: number) => void;

  constructor(canvasId: string, containerSelector: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.container = document.querySelector(containerSelector) as HTMLElement;
    this.resize();
    window.addEventListener("resize", () => {
      this.resize();
      this.draw();
    });

    this.setupEvents();
  }

  private resize() {
    if (!this.container || !this.canvas) return;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 150;
  }

  public setBuffer(
    buffer: AudioBuffer,
    initialStart?: number,
    initialEnd?: number,
  ) {
    this.buffer = buffer;
    this.duration = buffer.duration;
    this.startTime = initialStart ?? 0;
    this.endTime = initialEnd ?? this.duration;
    this.draw();
  }

  public setOnTrimChange(cb: (start: number, end: number) => void) {
    this.onTrimChange = cb;
  }

  private setupEvents() {
    const handleThickness = 20;

    this.canvas.addEventListener("mousedown", (e) => {
      if (!this.buffer) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      const startX = (this.startTime / this.duration) * rect.width;
      const endX = (this.endTime / this.duration) * rect.width;

      if (Math.abs(clickX - startX) <= handleThickness) {
        this.isDraggingLeft = true;
      } else if (Math.abs(clickX - endX) <= handleThickness) {
        this.isDraggingRight = true;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDraggingLeft && !this.isDraggingRight) return;

      const rect = this.canvas.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const time = (clickX / rect.width) * this.duration;

      if (this.isDraggingLeft) {
        this.startTime = Math.max(0, Math.min(time, this.endTime - 0.1));
      } else if (this.isDraggingRight) {
        this.endTime = Math.min(
          this.duration,
          Math.max(time, this.startTime + 0.1),
        );
      }

      this.draw();
    });

    window.addEventListener("mouseup", () => {
      if (this.isDraggingLeft || this.isDraggingRight) {
        this.isDraggingLeft = false;
        this.isDraggingRight = false;
        if (this.onTrimChange) this.onTrimChange(this.startTime, this.endTime);
      }
    });
  }

  public draw(primaryColor: string = "#007bff") {
    if (!this.buffer) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const channelData = this.buffer.getChannelData(0);
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

    // Draw overlays and handles
    const startX = (this.startTime / this.duration) * this.canvas.width;
    const endX = (this.endTime / this.duration) * this.canvas.width;

    this.ctx.fillStyle = "rgba(0,0,0,0.6)";
    // Left dark region
    if (startX > 0) this.ctx.fillRect(0, 0, startX, this.canvas.height);
    // Right dark region
    if (endX < this.canvas.width)
      this.ctx.fillRect(endX, 0, this.canvas.width - endX, this.canvas.height);

    // Lines and handles
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(startX - 1, 0, 2, this.canvas.height);
    this.ctx.fillRect(endX - 1, 0, 2, this.canvas.height);

    // Handle icons
    const handleY = this.canvas.height / 2;
    this.ctx.fillRect(startX - 8, handleY - 12, 16, 24);
    this.ctx.fillRect(endX - 8, handleY - 12, 16, 24);

    this.ctx.fillStyle = "black";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("<>", startX, handleY);
    this.ctx.fillText("<>", endX, handleY);
  }
}
