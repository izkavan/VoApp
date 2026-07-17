import JSZip from "jszip";

export class AppZipService {
  /**
   * Create a new empty JSZip instance.
   */
  async createZip(): Promise<JSZip> {
    return new JSZip();
  }

  /**
   * Load an existing ZIP file.
   */
  async loadZip(file: File | Blob): Promise<JSZip> {
    return await JSZip.loadAsync(file);
  }

  /**
   * Generate and trigger a download for a JSZip instance.
   */
  async downloadZip(zip: JSZip, filename: string): Promise<void> {
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper to read a JSON file from a ZIP instance safely.
   */
  async readJsonFile<T>(
    zip: JSZip,
    filename: string,
    defaultValue: T,
  ): Promise<T> {
    const file = zip.file(filename);
    if (!file) return defaultValue;
    try {
      const text = await file.async("string");
      return JSON.parse(text) as T;
    } catch (e) {
      console.error(`Failed to parse JSON from ${filename} in zip`, e);
      return defaultValue;
    }
  }
}

export const ZipService = new AppZipService();
