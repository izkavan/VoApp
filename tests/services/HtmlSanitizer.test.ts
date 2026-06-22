import { describe, it, expect } from 'vitest';
import { HtmlSanitizer, html } from '../../src/services/HtmlSanitizer.js';

describe('HtmlSanitizer', () => {
    it('escapes standard HTML tags', () => {
        const input = '<div>Hello</div>';
        const expected = '&lt;div&gt;Hello&lt;/div&gt;';
        expect(HtmlSanitizer.escape(input)).toBe(expected);
    });

    it('escapes quotes and ampersands', () => {
        const input = 'John & "Jane"';
        const expected = 'John &amp; &quot;Jane&quot;';
        expect(HtmlSanitizer.escape(input)).toBe(expected);
    });



    it('handles undefined or null gracefully', () => {
        expect(HtmlSanitizer.escape(undefined as any)).toBe('');
        expect(HtmlSanitizer.escape(null as any)).toBe('');
        expect(HtmlSanitizer.escape('')).toBe('');
    });

    describe('html template literal tag', () => {
        it('processes template literals and escapes values', () => {
            const unsafe = '<script>';
            const result = html`<p>${unsafe}</p>`;
            expect(result).toBe('<p>&lt;script&gt;</p>');
        });

        it('does not escape literal parts of the template string', () => {
            const value = 'safe text';
            const result = html`<h1>Title</h1> <p>${value}</p>`;
            expect(result).toBe('<h1>Title</h1> <p>safe text</p>');
        });
    });
});
