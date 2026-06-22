import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeDictionaryHighlighter, highlightDictionaryWords } from '../../src/components/dictionary-highlighter.js';

describe('dictionary-highlighter', () => {
    beforeEach(() => {
        // Mock Audio
        if (!window.HTMLMediaElement.prototype.play) {
            window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined) as any;
        } else {
            vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
        }
        if (!window.HTMLMediaElement.prototype.pause) {
            window.HTMLMediaElement.prototype.pause = vi.fn() as any;
        } else {
            vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
        }
    });

    describe('highlightDictionaryWords', () => {
        it('highlights words correctly', () => {
            const dict = [
                { id: 1, word: 'Test', phonetic: 'test-uh', audioData: 'base64:123' },
                { id: 2, word: 'Multiple Words', phonetic: 'mul-ti-pul' }
            ];
            
            const text = "This is a Test of Multiple Words here.";
            const highlighted = highlightDictionaryWords(text, dict as any);
            
            expect(highlighted).toContain('<span class="dict-highlight" data-phonetic="test-uh" data-audio="base64:123">Test</span>');
            expect(highlighted).toContain('<span class="dict-highlight" data-phonetic="mul-ti-pul" >Multiple Words</span>');
        });

        it('does not highlight inside html tags', () => {
            const dict = [{ id: 1, word: 'Test', phonetic: 'test-uh' }];
            const text = "A <a href=\"Test\">Test</a>";
            const highlighted = highlightDictionaryWords(text, dict as any);
            expect(highlighted).toBe('A <a href="Test"><span class="dict-highlight" data-phonetic="test-uh" >Test</span></a>');
        });
    });

    describe('initializeDictionaryHighlighter', () => {
        it('initializes tooltip and audio elements', () => {
            initializeDictionaryHighlighter();
            expect(document.querySelector('.dict-tooltip')).not.toBeNull();
            expect(document.querySelector('audio')).not.toBeNull();
        });

        it('shows tooltip on mouseover', () => {
            initializeDictionaryHighlighter();
            const span = document.createElement('span');
            span.className = 'dict-highlight';
            span.setAttribute('data-phonetic', 'foo');
            document.body.appendChild(span);

            span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

            const tooltip = document.querySelector('.dict-tooltip') as HTMLElement;
            expect(tooltip.style.display).toBe('block');
            expect(tooltip.textContent).toBe('foo');
        });

        it('plays audio on click', () => {
            initializeDictionaryHighlighter();
            const span = document.createElement('span');
            span.className = 'dict-highlight';
            span.setAttribute('data-audio', 'audio-src');
            document.body.appendChild(span);

            span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            const audio = document.querySelector('audio') as HTMLAudioElement;
            expect(audio.src).toContain('audio-src');
            expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
        });
        
        it('hides tooltip on mouseout', () => {
            initializeDictionaryHighlighter();
            const span = document.createElement('span');
            span.className = 'dict-highlight';
            span.setAttribute('data-phonetic', 'foo');
            document.body.appendChild(span);

            span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

            const tooltip = document.querySelector('.dict-tooltip') as HTMLElement;
            expect(tooltip.style.display).toBe('none');
        });
    });
});
