import { describe, it, expect, beforeEach } from 'vitest';
import { TableReadLine, TableReadTake } from '../../src/components/table-read-components.js';

describe('TableReadLine', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders script line data correctly', () => {
        const lineElement = new TableReadLine();
        const mockLine = {
            text: 'Hello world! This is a very long line that should probably be truncated if it exceeds fifty characters.',
            characterName: 'Hero',
            takes: [],
            preferredTakeId: null,
            isUnmatched: false
        };

        lineElement.data = { line: mockLine, index: 0, isSelected: false };
        document.body.appendChild(lineElement);

        // Check text content
        expect(lineElement.innerHTML).toContain('[Hero]');
        expect(lineElement.innerHTML).toContain('Hello world!');
        expect(lineElement.classList.contains('selected')).toBe(false);

        // Indicator class
        const indicator = lineElement.querySelector('.table-read-indicator');
        expect(indicator).not.toBeNull();
        expect(indicator?.classList.contains('indicator-red')).toBe(true);
    });

    it('applies selected styling', () => {
        const lineElement = new TableReadLine();
        const mockLine = { text: 'Short line', takes: [], preferredTakeId: null };

        lineElement.data = { line: mockLine, index: 2, isSelected: true };
        document.body.appendChild(lineElement);

        expect(lineElement.classList.contains('selected')).toBe(true);
    });

    it('dispatches lineSelected event on click', () => {
        const lineElement = new TableReadLine();
        const mockLine = { text: 'Click me', takes: [], preferredTakeId: null };

        lineElement.data = { line: mockLine, index: 5, isSelected: false };
        document.body.appendChild(lineElement);

        let selectedIndex = -1;
        lineElement.addEventListener('lineSelected', (e: Event) => {
            selectedIndex = (e as CustomEvent).detail;
        });

        lineElement.click();
        expect(selectedIndex).toBe(5);
    });
});

describe('TableReadTake', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders take data correctly', () => {
        const takeElement = new TableReadTake();
        const mockTake = {
            id: 'take123',
            sourceZip: 'audio.zip',
            audioData: 'test-audio-base64',
            title: 'Take 1'
        };

        takeElement.data = { take: mockTake, isPreferred: false };
        document.body.appendChild(takeElement);

        // Check if not golden
        expect(takeElement.classList.contains('golden')).toBe(false);

        // Title and source
        expect(takeElement.innerHTML).toContain('Take 1');
        expect(takeElement.innerHTML).toContain('audio.zip');

        // Audio
        const audio = takeElement.querySelector('audio');
        expect(audio).not.toBeNull();
        expect(audio?.src).toContain('test-audio-base64');

        // Button
        const btn = takeElement.querySelector('button');
        expect(btn).not.toBeNull();
        expect(btn?.textContent).toBe('Mark Preferred');
        expect(btn?.classList.contains('secondary')).toBe(true);
    });

    it('applies preferred styling when isPreferred is true', () => {
        const takeElement = new TableReadTake();
        const mockTake = { id: 'take123', sourceZip: '', audioData: '', title: '' };

        takeElement.data = { take: mockTake, isPreferred: true };
        document.body.appendChild(takeElement);

        expect(takeElement.classList.contains('golden')).toBe(true);
        
        const btn = takeElement.querySelector('button');
        expect(btn?.textContent).toBe('★ Preferred');
        expect(btn?.classList.contains('primary')).toBe(true);
    });

    it('dispatches togglePreferred event on button click', () => {
        const takeElement = new TableReadTake();
        const mockTake = { id: 'take123', sourceZip: '', audioData: '', title: '' };

        takeElement.data = { take: mockTake, isPreferred: false };
        document.body.appendChild(takeElement);

        let toggledId = '';
        takeElement.addEventListener('togglePreferred', (e: Event) => {
            toggledId = (e as CustomEvent).detail;
        });

        const btn = takeElement.querySelector('button');
        btn?.click();

        expect(toggledId).toBe('take123');
    });
});
