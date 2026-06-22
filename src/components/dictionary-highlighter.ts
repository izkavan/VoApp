import { DictionaryEntry } from '../types.js';

let tooltipElement: HTMLDivElement | null = null;
let audioElement: HTMLAudioElement | null = null;
let hideTimeout: number | null = null;

export function initializeDictionaryHighlighter() {
    if (tooltipElement) return; // Already initialized

    tooltipElement = document.createElement('div');
    tooltipElement.className = 'dict-tooltip';
    tooltipElement.style.display = 'none';
    document.body.appendChild(tooltipElement);

    audioElement = document.createElement('audio');
    audioElement.style.display = 'none';
    document.body.appendChild(audioElement);

    const showTooltip = (target: HTMLElement) => {
        if (hideTimeout) clearTimeout(hideTimeout);
        
        const phonetic = target.getAttribute('data-phonetic');
        const audioData = target.getAttribute('data-audio');
        
        if (!phonetic) return;

        if (tooltipElement) {
            tooltipElement.textContent = phonetic;
            tooltipElement.style.display = 'block';
            
            const rect = target.getBoundingClientRect();
            // Position below the word
            tooltipElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltipElement.style.left = `${rect.left + window.scrollX}px`;
        }

        if (audioData && audioElement) {
            if (audioElement.src !== audioData) {
                audioElement.src = audioData;
            }
            audioElement.currentTime = 0;
            audioElement.play().catch(e => console.warn("Audio play blocked", e));
        }
    };

    const hideTooltip = () => {
        if (tooltipElement) {
            tooltipElement.style.display = 'none';
        }
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
    };

    document.body.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement;
        if (target && target.classList && target.classList.contains('dict-highlight')) {
            showTooltip(target);
        } else if (tooltipElement && tooltipElement.style.display === 'block') {
             // Hide immediately if moved off
            hideTooltip();
        }
    });

    // Ensure it hides when leaving the word entirely
    document.body.addEventListener('mouseout', (e) => {
        const target = e.target as HTMLElement;
        const related = e.relatedTarget as HTMLElement;
        if (target && target.classList && target.classList.contains('dict-highlight')) {
            // Check if moving to tooltip
            if (related !== tooltipElement) {
                hideTooltip();
            }
        }
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target && target.classList && target.classList.contains('dict-highlight')) {
            const audioData = target.getAttribute('data-audio');
            if (audioData && audioElement) {
                if (audioElement.src !== audioData) {
                    audioElement.src = audioData;
                }
                audioElement.currentTime = 0;
                audioElement.play().catch(e => console.warn("Audio play blocked", e));
            }
        }
    });
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightDictionaryWords(text: string, dictionary: DictionaryEntry[]): string {
    if (!dictionary || dictionary.length === 0 || !text) return text;

    // Filter out empty words and sort by length descending to match longest phrases first
    const validEntries = dictionary.filter(e => e.word.trim().length > 0).sort((a, b) => b.word.length - a.word.length);
    if (validEntries.length === 0) return text;

    // Create a map for quick lookup (lowercase to entry)
    const entryMap = new Map<string, DictionaryEntry>();
    const patterns: string[] = [];
    
    for (const entry of validEntries) {
        const lowerWord = entry.word.toLowerCase();
        if (!entryMap.has(lowerWord)) {
            entryMap.set(lowerWord, entry);
            patterns.push(escapeRegExp(entry.word));
        }
    }

    // Replace HTML elements so we don't accidentally highlight inside tags. 
    // We can do this by splitting the text by HTML tags and only replacing inside text nodes.
    const tagRegex = /(<[^>]+>)/g;
    const parts = text.split(tagRegex);
    
    const wordPattern = new RegExp(`\\b(${patterns.join('|')})\\b`, 'gi');

    return parts.map(part => {
        // If it's a tag, return it unchanged
        if (part.startsWith('<') && part.endsWith('>')) {
            return part;
        }
        // Otherwise, replace dictionary words
        return part.replace(wordPattern, (match) => {
            const entry = entryMap.get(match.toLowerCase());
            if (entry) {
                const audioAttr = entry.audioData ? `data-audio="${entry.audioData}"` : '';
                const phoneticAttr = entry.phonetic ? `data-phonetic="${entry.phonetic.replace(/"/g, '&quot;')}"` : '';
                return `<span class="dict-highlight" ${phoneticAttr} ${audioAttr}>${match}</span>`;
            }
            return match;
        });
    }).join('');
}
