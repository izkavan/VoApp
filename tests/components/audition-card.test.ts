import { describe, it, expect, beforeEach } from 'vitest';
import { AuditionCard } from '../../src/components/audition-card.js';

describe('AuditionCard', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders audition data correctly', () => {
        const card = new AuditionCard();
        const mockAudition = {
            id: 1,
            character: 'TestChar',
            project: 'TestProj',
            actorFirstName: 'Test',
            actorLastName: 'Actor',
            dateSubmitted: '2025-01-01',
            fileName: 'test.wav',
            audioData: 'test-audio-base64',
            rating: 3,
            comments: 'Good audition'
        };

        card.data = { audition: mockAudition, index: 1 };
        document.body.appendChild(card);

        // Header
        const header = card.querySelector('.vp-auditions-card-header');
        expect(header?.textContent).toBe('Audition 1');

        // Stars
        const activeStars = card.querySelectorAll('.vp-auditions-star.active');
        expect(activeStars.length).toBe(3);

        const allStars = card.querySelectorAll('.vp-auditions-star');
        expect(allStars.length).toBe(5);

        // Audio
        const audio = card.querySelector('audio');
        expect(audio).not.toBeNull();
        expect(audio?.src).toContain('test-audio-base64');

        // Comments
        const textarea = card.querySelector('textarea.vp-auditions-comments') as HTMLTextAreaElement;
        expect(textarea).not.toBeNull();
        expect(textarea.value).toBe('Good audition');
    });

    it('dispatches ratingChanged when a star is clicked', () => {
        const card = new AuditionCard();
        const mockAudition = {
            id: 1,
            character: 'TestChar',
            project: 'TestProj',
            actorFirstName: 'Test',
            actorLastName: 'Actor',
            dateSubmitted: '2025-01-01',
            fileName: 'test.wav',
            audioData: '',
            rating: 0,
            comments: ''
        };

        card.data = { audition: mockAudition, index: 1 };
        document.body.appendChild(card);

        let newRating = 0;
        card.addEventListener('ratingChanged', (e: Event) => {
            newRating = (e as CustomEvent).detail;
        });

        // Click the 4th star
        const stars = card.querySelectorAll('.vp-auditions-star');
        (stars[3] as HTMLElement).click();

        expect(newRating).toBe(4);
        expect(mockAudition.rating).toBe(4); // Internal state updated
        
        // Ensure UI is updated
        const activeStars = card.querySelectorAll('.vp-auditions-star.active');
        expect(activeStars.length).toBe(4);
    });

    it('dispatches commentChanged when textarea is changed', () => {
        const card = new AuditionCard();
        const mockAudition = {
            id: 1,
            character: 'TestChar',
            project: 'TestProj',
            actorFirstName: 'Test',
            actorLastName: 'Actor',
            dateSubmitted: '2025-01-01',
            fileName: '',
            audioData: '',
            rating: 0,
            comments: ''
        };

        card.data = { audition: mockAudition, index: 1 };
        document.body.appendChild(card);

        let newComment = '';
        card.addEventListener('commentChanged', (e: Event) => {
            newComment = (e as CustomEvent).detail;
        });

        const textarea = card.querySelector('textarea') as HTMLTextAreaElement;
        textarea.value = 'Awesome!';
        textarea.dispatchEvent(new Event('change'));

        expect(newComment).toBe('Awesome!');
        expect(mockAudition.comments).toBe('Awesome!');
    });
});
