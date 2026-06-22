export class AppHtmlSanitizer {
    /**
     * Escapes HTML entities in a string to prevent XSS when using innerHTML.
     */
    escape(unsafe: string | null | undefined): string {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    /**
     * Tagged template literal for safely interpolating strings into HTML.
     * Usage: html`<div>${unsafeVar}</div>`
     */
    html(strings: TemplateStringsArray, ...values: any[]): string {
        return strings.reduce((result, str, i) => {
            const value = values[i - 1];
            
            let safeValue = '';
            if (Array.isArray(value)) {
                safeValue = value.map(v => typeof v === 'string' ? this.escape(v) : String(v)).join('');
            } else if (typeof value === 'string') {
                safeValue = this.escape(value);
            } else if (value !== null && value !== undefined) {
                // Numbers, booleans, etc.
                safeValue = String(value);
            }
            
            return result + safeValue + str;
        });
    }
}

export const HtmlSanitizer = new AppHtmlSanitizer();

// Export a handy shortcut for template literals
export const html = HtmlSanitizer.html.bind(HtmlSanitizer);
