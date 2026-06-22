import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterCard } from '../../src/components/character-card.js';

describe('CharacterCard', () => {
    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
    });

    it('renders character details correctly', () => {
        const card = new CharacterCard();
        const mockCharacter = {
            id: 1,
            name: 'John Doe',
            description: 'A test character',
            voice_description: 'Deep and raspy',
            characterOddities: 'Speaks slowly',
            artwork: 'test-image.jpg',
            voice_sample: 'test-audio.mp3',
        };

        card.data = mockCharacter;
        document.body.appendChild(card);

        // Name
        expect(card.innerHTML).toContain('John Doe');
        
        // Artwork
        const img = card.querySelector('img.character-card-artwork') as HTMLImageElement;
        expect(img).not.toBeNull();
        expect(img.src).toContain('test-image.jpg');

        // Oddities
        const oddities = card.querySelector('p.character-oddities');
        expect(oddities).not.toBeNull();
        expect(oddities?.innerHTML).toContain('Speaks slowly');

        // Play Reference button
        const btn = card.querySelector('button.play-reference-btn');
        expect(btn).not.toBeNull();
    });

    it('dispatches cardClicked event on click', () => {
        const card = new CharacterCard();
        const mockCharacter = {
            id: 2,
            name: 'Jane Doe',
            description: '',
            voice_description: ''
        };

        card.data = mockCharacter;
        document.body.appendChild(card);

        let clickedChar = null;
        card.addEventListener('cardClicked', (e: Event) => {
            clickedChar = (e as CustomEvent).detail;
        });

        // Trigger click
        card.click();

        expect(clickedChar).toEqual(mockCharacter);
    });

    it('sets dataset and draggable correctly', () => {
        const card = new CharacterCard();
        const mockCharacter = {
            id: 99,
            name: 'Draggable',
            description: '',
            voice_description: 'Draggable Voice'
        };

        card.data = mockCharacter;
        document.body.appendChild(card);

        expect(card.dataset.characterId).toBe('99');
        expect(card.draggable).toBe(true);
        expect(card.title).toBe('Draggable Voice');
    });
});
