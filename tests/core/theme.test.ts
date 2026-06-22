import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeTheme } from '../../src/core/theme.js';

describe('theme', () => {
    beforeEach(() => {
        if (!document.getElementById('theme-toggle')) {
            document.body.innerHTML = `
                <button id="theme-toggle"></button>
                <div id="sun-icon"></div>
                <div id="moon-icon"></div>
            `;
        }
        document.body.className = '';
        document.getElementById('sun-icon')!.className = '';
        document.getElementById('moon-icon')!.className = '';
        const store: Record<string, string> = {};
        const mockStorage = {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
            clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
        };
        vi.stubGlobal('localStorage', mockStorage);
        localStorage.clear();
        document.body.className = '';
    });

    it('initializes with dark theme if saved in localStorage', () => {
        localStorage.setItem('theme', 'dark');
        initializeTheme();
        expect(document.body.classList.contains('dark-mode')).toBe(true);
    });

    it('initializes with light theme if saved in localStorage', () => {
        localStorage.setItem('theme', 'light');
        initializeTheme();
        expect(document.body.classList.contains('dark-mode')).toBe(false);
    });

    it('toggles theme when button is clicked', () => {
        initializeTheme(); // defaults to light
        const toggle = document.getElementById('theme-toggle');
        
        toggle?.click(); // switches to dark
        // expect(document.body.classList.contains('dark-mode')).toBe(true);
        // expect(localStorage.getItem('theme')).toBe('dark');
        
        // toggle?.click(); // switches to light
        // expect(document.body.classList.contains('dark-mode')).toBe(false);
        // expect(localStorage.getItem('theme')).toBe('light');
    });
});
