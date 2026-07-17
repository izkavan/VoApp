import { html, HtmlSanitizer } from "../services/HtmlSanitizer.js";

/**
 * Web Component representing a single line of script in the Table Read Simulator.
 * Visually indicates whether the line has recorded takes and whether one is "Preferred".
 *
 * Properties:
 * - `data` (any): The script line object containing text and character definitions.
 * - `takes` (any[]): Array of takes recorded for this specific line.
 * - `isSelected` (boolean): Applies an active highlighting style.
 *
 * Events:
 * - `lineSelected` (CustomEvent<{line, takes}>): Fired when the line is clicked.
 */
export class TableReadLine extends HTMLElement {
  private line: any = null;
  private index: number = 0;
  private isSelected: boolean = false;

  set data({ line, index, isSelected }: any) {
    this.line = line;
    this.index = index;
    this.isSelected = isSelected;
    this.render();
  }

  connectedCallback() {
    this.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("lineSelected", { detail: this.index }),
      );
    });
    this.render();
  }

  private render() {
    if (!this.line) return;

    this.className = "table-read-line-item";
    if (this.isSelected) this.classList.add("selected");
    if (this.line.isUnmatched) {
      this.classList.add("unmatched-line");
      this.title = "Unable to match script line.";
    }

    let indicatorClass = "indicator-red"; // No takes
    if (this.line.takes.length > 0) {
      indicatorClass = this.line.preferredTakeId
        ? "indicator-green"
        : "indicator-yellow";
    }

    const isSceneOrTitle =
      !this.line.characterName ||
      this.line.characterName.toLowerCase() === "scene" ||
      this.line.characterName.toLowerCase() === "title";
    const indicatorHtml = isSceneOrTitle
      ? html`<div style="visibility: hidden; width: 12px;"></div>`
      : html`<div class="table-read-indicator ${indicatorClass}"></div>`;

    const charSpanHtml = this.line.characterName
      ? html`<span style="font-weight: bold; margin-right: 8px;"
          >[${this.line.characterName}]</span
        >`
      : "";

    const textPreview =
      this.line.text.length > 50
        ? this.line.text.substring(0, 50) + "..."
        : this.line.text;

    this.innerHTML = `
            ${indicatorHtml}
            <div class="table-read-line-text">
                ${charSpanHtml}
                ${HtmlSanitizer.escape(textPreview)}
            </div>
        `;
  }
}

/**
 * Web Component representing a single recorded take within the Table Read details pane.
 * Contains an audio player and a button to mark the take as the "Preferred" one.
 *
 * Properties:
 * - `data` (any): The recorded take object containing the audio source.
 * - `isPreferred` (boolean): Applies a golden styling if this is the active take.
 *
 * Events:
 * - `togglePreferred` (CustomEvent<any>): Fired when the "Mark Preferred" button is clicked.
 * - `takePlayed` (CustomEvent<any>): Fired when the user clicks play on the audio element.
 */
export class TableReadTake extends HTMLElement {
  private take: any = null;
  private isPreferred: boolean = false;

  set data({ take, isPreferred }: any) {
    this.take = take;
    this.isPreferred = isPreferred;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    if (!this.take) return;

    this.className = "table-read-take-card";
    if (this.isPreferred) {
      this.classList.add("golden");
    } else {
      this.classList.remove("golden");
    }

    const infoHtml = `<strong>${html`${this.take.title || "Take"}`}</strong> <span style="color: var(--gray-500); font-size: 0.9em;">(from ${html`${this.take.sourceZip}`})</span>`;

    const audioPlayer = html`<audio
      controls
      controlsList="nodownload"
      src="${this.take.audioData}"
    ></audio>`;

    const prefBtnClass = this.isPreferred ? "primary" : "secondary";
    const prefBtnText = this.isPreferred ? "★ Preferred" : "Mark Preferred";

    this.innerHTML = `
            <div>${infoHtml}</div>
            <div style="display: flex; gap: 10px; margin-top: 10px; align-items: center;">
                ${audioPlayer}
                <button class="${prefBtnClass}" id="pref-btn">${prefBtnText}</button>
            </div>
        `;

    const audio = this.querySelector("audio");
    if (audio) {
      audio.onplay = () => {
        this.dispatchEvent(new CustomEvent("takePlayed", { bubbles: true }));
      };
    }

    const prefBtn = this.querySelector("#pref-btn");
    if (prefBtn) {
      prefBtn.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("togglePreferred", { detail: this.take.id }),
        );
      });
    }
  }
}

customElements.define("table-read-line", TableReadLine);
customElements.define("table-read-take", TableReadTake);
