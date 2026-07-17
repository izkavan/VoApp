export interface AudioChunk {
  buffer: AudioBuffer;
  gain: number;
}

export type SelectionType = "none" | "chunk" | "line";

export class AudioEditorCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chunks: AudioChunk[] = [];
  private splitPoints: number[] = [];

  private selectedType: SelectionType = "none";
  private selectedIndex: number = -1;

  private totalDuration: number = 0;

  public onSelectionChange?: (type: SelectionType, index: number) => void;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;

    // Handle resizing
    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.canvas.parentElement!);

    this.bindEvents();
  }

  public async loadBuffer(buffer: AudioBuffer) {
    this.chunks = [{ buffer, gain: 1 }];
    this.clearSelection();
    this.render();
  }

  public getChunks(): AudioChunk[] {
    return this.chunks;
  }

  public getSelection() {
    return { type: this.selectedType, index: this.selectedIndex };
  }

  public setGain(chunkIndex: number, gain: number) {
    if (chunkIndex >= 0 && chunkIndex < this.chunks.length) {
      this.chunks[chunkIndex].gain = Math.max(0, gain);
      this.render();
    }
  }

  public deleteChunk(chunkIndex: number) {
    if (chunkIndex >= 0 && chunkIndex < this.chunks.length) {
      this.chunks.splice(chunkIndex, 1);
      this.clearSelection();
      this.render();
    }
  }

  public replaceChunk(chunkIndex: number, newBuffer: AudioBuffer) {
    if (chunkIndex >= 0 && chunkIndex < this.chunks.length) {
      this.chunks[chunkIndex] = { buffer: newBuffer, gain: 1 };
      this.render();
    }
  }

  public insertChunk(lineIndex: number, newBuffer: AudioBuffer) {
    // lineIndex 0 means between chunk 0 and 1. So insert at index lineIndex + 1
    if (lineIndex >= 0 && lineIndex < this.chunks.length) {
      this.chunks.splice(lineIndex + 1, 0, { buffer: newBuffer, gain: 1 });
      this.clearSelection();
      this.render();
    }
  }

  private clearSelection() {
    this.selectedType = "none";
    this.selectedIndex = -1;
    if (this.onSelectionChange)
      this.onSelectionChange(this.selectedType, this.selectedIndex);
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      this.render();
    }
  }

  private bindEvents() {
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
    this.canvas.addEventListener("dblclick", (e) => this.handleDoubleClick(e));
  }

  private getTimeFromX(x: number): number {
    return (x / this.canvas.width) * this.totalDuration;
  }

  private getXFromTime(time: number): number {
    if (this.totalDuration === 0) return 0;
    return (time / this.totalDuration) * this.canvas.width;
  }

  private getChunkAtTime(
    time: number,
  ): { index: number; localTime: number } | null {
    let currentStart = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      const chunkDuration = this.chunks[i].buffer.duration;
      if (time >= currentStart && time <= currentStart + chunkDuration) {
        return { index: i, localTime: time - currentStart };
      }
      currentStart += chunkDuration;
    }
    return null;
  }

  private getBoundaryXPositions(): number[] {
    let currentStart = 0;
    const positions: number[] = [];
    for (let i = 0; i < this.chunks.length - 1; i++) {
      currentStart += this.chunks[i].buffer.duration;
      positions.push(this.getXFromTime(currentStart));
    }
    return positions;
  }

  private handleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Check if clicking near a boundary (line)
    const boundaries = this.getBoundaryXPositions();
    const hitDistance = 5; // pixels

    for (let i = 0; i < boundaries.length; i++) {
      if (Math.abs(x - boundaries[i]) <= hitDistance) {
        this.selectedType = "line";
        this.selectedIndex = i;
        if (this.onSelectionChange)
          this.onSelectionChange(this.selectedType, this.selectedIndex);
        this.render();
        return;
      }
    }

    // If not a boundary, check chunk
    const time = this.getTimeFromX(x);
    const hit = this.getChunkAtTime(time);
    if (hit) {
      this.selectedType = "chunk";
      this.selectedIndex = hit.index;
      if (this.onSelectionChange)
        this.onSelectionChange(this.selectedType, this.selectedIndex);
      this.render();
    } else {
      this.clearSelection();
      this.render();
    }
  }

  private handleDoubleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = this.getTimeFromX(x);

    const hit = this.getChunkAtTime(time);
    if (!hit) return;

    // Find zero crossing
    const buffer = this.chunks[hit.index].buffer;
    const splitTime = this.findNearestZeroCrossing(buffer, hit.localTime);

    // Split the chunk
    const chunk1 = this.copyBuffer(buffer, 0, splitTime);
    const chunk2 = this.copyBuffer(buffer, splitTime, buffer.duration);

    const originalGain = this.chunks[hit.index].gain;

    this.chunks.splice(
      hit.index,
      1,
      { buffer: chunk1, gain: originalGain },
      { buffer: chunk2, gain: originalGain },
    );

    this.clearSelection();
    this.render();
  }

  private findNearestZeroCrossing(buffer: AudioBuffer, time: number): number {
    const sampleRate = buffer.sampleRate;
    const targetSample = Math.floor(time * sampleRate);
    const data = buffer.getChannelData(0);

    // Search window: up to 0.1 seconds either direction
    const windowSize = Math.floor(0.1 * sampleRate);
    let minDiff = Infinity;
    let bestSample = targetSample;

    const startSearch = Math.max(0, targetSample - windowSize);
    const endSearch = Math.min(data.length - 2, targetSample + windowSize);

    for (let i = startSearch; i < endSearch; i++) {
      // A zero crossing occurs if consecutive samples have different signs
      if (
        (data[i] >= 0 && data[i + 1] < 0) ||
        (data[i] < 0 && data[i + 1] >= 0)
      ) {
        // Find distance from target
        const dist = Math.abs(i - targetSample);
        if (dist < minDiff) {
          minDiff = dist;
          bestSample = i;
        }
      }
    }
    return bestSample / sampleRate;
  }

  private copyBuffer(
    buffer: AudioBuffer,
    startTime: number,
    endTime: number,
  ): AudioBuffer {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const length = Math.max(1, endSample - startSample);

    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const newBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      length,
      sampleRate,
    );

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channelData = buffer.getChannelData(i);
      const newChannelData = newBuffer.getChannelData(i);
      newChannelData.set(
        channelData.subarray(startSample, startSample + length),
      );
    }

    return newBuffer;
  }

  public render() {
    this.totalDuration = this.chunks.reduce(
      (sum, c) => sum + c.buffer.duration,
      0,
    );

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.totalDuration === 0) return;

    let currentX = 0;

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const chunkWidth =
        (chunk.buffer.duration / this.totalDuration) * this.canvas.width;

      // Draw highlight if selected
      if (this.selectedType === "chunk" && this.selectedIndex === i) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        this.ctx.fillRect(currentX, 0, chunkWidth, this.canvas.height);
      }

      // Draw waveform
      this.drawWaveformChunk(chunk, currentX, chunkWidth);

      currentX += chunkWidth;

      // Draw boundary line
      if (i < this.chunks.length - 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(currentX, 0);
        this.ctx.lineTo(currentX, this.canvas.height);

        if (this.selectedType === "line" && this.selectedIndex === i) {
          this.ctx.strokeStyle = "var(--primary-color, #ffaa00)";
          this.ctx.lineWidth = 3;
        } else {
          this.ctx.strokeStyle = "var(--border-color, #444)";
          this.ctx.lineWidth = 1;
        }
        this.ctx.stroke();
      }
    }
  }

  private drawWaveformChunk(chunk: AudioChunk, xOffset: number, width: number) {
    if (width <= 0) return;
    const data = chunk.buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = this.canvas.height / 2;

    this.ctx.fillStyle = "var(--primary-color, #00ffff)";

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      const start = i * step;
      const end = Math.min(start + step, data.length);
      for (let j = start; j < end; j++) {
        const val = data[j] * chunk.gain;
        if (val < min) min = val;
        if (val > max) max = val;
      }

      const yMin = (1 + min) * amp;
      const yMax = (1 + max) * amp;

      this.ctx.fillRect(
        xOffset + i,
        Math.min(yMin, yMax),
        1,
        Math.max(1, Math.abs(yMax - yMin)),
      );
    }
  }
}
