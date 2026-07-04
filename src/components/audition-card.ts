import { ReceivedAudition } from '../types.js';
import { html, HtmlSanitizer } from '../services/HtmlSanitizer.js';

/**
 * Web Component representing an individual audition submission.
 * Handles internal star-rating logic and text-area comments.
 * 
 * Properties:
 * - `index` (number): The visual index of this audition.
 * - `data` (ReceivedAudition): The audition data to display.
 * 
 * Events:
 * - `ratingChanged` (CustomEvent<number>): Fired when the user clicks a star rating.
 * - `commentChanged` (CustomEvent<string>): Fired when the user modifies the comment box.
 */
export class AuditionCard extends HTMLElement {
    private audition: ReceivedAudition | null = null;
    private index: number = 0;

    set data({ audition, index }: { audition: ReceivedAudition; index: number }) {
        this.audition = audition;
        this.index = index;
        this.render();
    }

    connectedCallback() {
        this.className = 'vp-auditions-card';
        if (this.audition) this.render();
    }

    private render() {
        if (!this.audition) return;

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const isActive = this.audition.rating && i <= this.audition.rating ? 'active' : '';
            starsHtml += html`<span class="vp-auditions-star ${isActive}" data-rating="${i.toString()}">★</span>`;
        }

        const audioPlayer = this.audition.audioData 
            ? html`<audio controls style="width: 100%;" src="${this.audition.audioData}"></audio>`
            : '';

        this.innerHTML = `
            <div class="vp-auditions-card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>Audition ${HtmlSanitizer.escape(this.index.toString())}</span>
                <span class="vp-auditions-delete" title="Delete Audition" style="cursor: pointer; color: var(--error-color, #dc3545);">🗑️</span>
            </div>
            <div class="vp-auditions-stars">${starsHtml}</div>
            ${audioPlayer}
            <textarea class="vp-auditions-comments" placeholder="Leave notes here...">${HtmlSanitizer.escape(this.audition.comments || '')}</textarea>
        `;

        // Bind events
        this.querySelectorAll('.vp-auditions-star').forEach(star => {
            star.addEventListener('click', (e) => {
                const rating = parseInt((e.target as HTMLElement).dataset.rating || '0');
                if (this.audition) {
                    this.audition.rating = rating;
                    this.dispatchEvent(new CustomEvent('ratingChanged', { detail: rating }));
                    this.render(); // Re-render to update star styling
                }
            });
        });

        const textarea = this.querySelector('textarea');
        if (textarea) {
            textarea.addEventListener('change', (e) => {
                if (this.audition) {
                    this.audition.comments = (e.target as HTMLTextAreaElement).value;
                    this.dispatchEvent(new CustomEvent('commentChanged', { detail: this.audition.comments }));
                }
            });
        }

        const deleteBtn = this.querySelector('.vp-auditions-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (this.audition && confirm("Are you sure you want to delete this audition?")) {
                    this.dispatchEvent(new CustomEvent('deleteAudition', { detail: this.audition }));
                }
            });
        }
    }
}

customElements.define('audition-card', AuditionCard);
