import { Character } from "../types.js";
import { html, HtmlSanitizer } from "../services/HtmlSanitizer.js";

/**
 * Web Component representing a Draggable Character Card in the library.
 *
 * Properties:
 * - `data` (Character): The character object to display.
 *
 * Events:
 * - `cardClicked` (CustomEvent<Character>): Fired when the card is clicked.
 */
export class CharacterCard extends HTMLElement {
  private character: Character | null = null;

  set data(char: Character) {
    this.character = char;
    this.dataset.characterId = char.id.toString();
    this.render();
  }

  get data(): Character | null {
    return this.character;
  }

  connectedCallback() {
    this.className = "character-card";
    this.title = this.character?.voice_description || "";
    this.draggable = true;

    this.addEventListener("dragstart", (e) => {
      if (this.character) {
        e.dataTransfer?.setData("text/plain", this.character.id.toString());
      }
      this.classList.add("dragging");
    });

    this.addEventListener("dragend", () => {
      this.classList.remove("dragging");
    });

    this.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).classList.contains("play-reference-btn"))
        return;
      if (this.character) {
        this.dispatchEvent(
          new CustomEvent("cardClicked", {
            detail: this.character,
            bubbles: true,
          }),
        );
      }
    });

    this.render();
  }

  private playAudio = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.character?.voice_sample) {
      const audio = new Audio(this.character.voice_sample);
      audio
        .play()
        .catch((err) => console.error("Could not play audio reference:", err));
    }
  };

  render() {
    if (!this.character) return;

    let artworkHtml = "";
    if (this.character.artwork) {
      artworkHtml = html`<img
        src="${this.character.artwork}"
        class="character-card-artwork"
      />`;
    }

    let odditiesHtml = "";
    if (this.character.characterOddities) {
      odditiesHtml = html`<p
        class="character-oddities"
        style="font-size: 0.85em; font-style: italic; margin-top: 5px;"
      >
        <strong>Oddities:</strong> ${this.character.characterOddities}
      </p>`;
    }

    let audioButtonHtml = "";
    if (this.character.voice_sample) {
      audioButtonHtml = html`<button
        class="play-reference-btn"
        style="margin-top: 10px; padding: 4px 8px; font-size: 0.9em;"
      >
        Play Reference
      </button>`;
    }

    // Uses the HtmlSanitizer to prevent XSS
    this.innerHTML = `${artworkHtml}<h3>${HtmlSanitizer.escape(this.character.name)}</h3>${odditiesHtml}${audioButtonHtml}`;

    const playBtn = this.querySelector(".play-reference-btn");
    if (playBtn) {
      playBtn.addEventListener("click", this.playAudio as EventListener);
    }
  }
}

customElements.define("character-card", CharacterCard);
