import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeFilterSearch, filterCharacters, updateFilterData, activeFilterTags } from '../../src/components/filter-search.js';
import * as characterRenderer from '../../src/components/character-renderer.js';
import { Character, Project } from '../../src/types.js';

describe('filter-search', () => {
    let filterInput: HTMLInputElement;
    let suggestionsEl: HTMLElement;
    let activeTagsEl: HTMLElement;
    let toggleEl: HTMLInputElement;
    let charListEl: HTMLElement;
    let mockOnDrop: any;
    let mockRenderApp: any;

    beforeEach(() => {
        filterInput = document.createElement('input');
        suggestionsEl = document.createElement('div');
        activeTagsEl = document.createElement('div');
        toggleEl = document.createElement('input');
        toggleEl.type = 'checkbox';
        charListEl = document.createElement('div');
        mockOnDrop = vi.fn();
        mockRenderApp = vi.fn();

        vi.clearAllMocks();
        activeFilterTags.length = 0;

        vi.spyOn(characterRenderer, 'renderCharacterList').mockImplementation(() => {});

        const initialCharacters = [
            { id: 1, name: 'C1', tags: ['Action', 'Hero'] },
            { id: 2, name: 'C2', tags: ['Action', 'Villain'] },
            { id: 3, name: 'C3', tags: ['Comedy'] }
        ] as Character[];
        const initialProjects = [] as Project[];

        initializeFilterSearch(
            filterInput,
            suggestionsEl,
            activeTagsEl,
            toggleEl,
            charListEl,
            initialCharacters,
            initialProjects,
            mockOnDrop,
            mockRenderApp
        );
    });

    it('handles input and shows suggestions', () => {
        filterInput.value = 'act';
        filterInput.dispatchEvent(new Event('input'));
        
        expect(suggestionsEl.children.length).toBe(1);
        expect(suggestionsEl.children[0].textContent).toBe('Action');
    });

    it('adds tag on spacebar', () => {
        filterInput.value = 'action ';
        filterInput.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));

        expect(activeFilterTags).toContain('action');
        expect(activeTagsEl.children.length).toBe(1);
        expect(filterInput.value).toBe('');
    });

    it('adds tag on suggestion click', () => {
        filterInput.value = 'act';
        filterInput.dispatchEvent(new Event('input'));
        
        const suggestionItem = suggestionsEl.children[0] as HTMLElement;
        suggestionItem.dispatchEvent(new MouseEvent('click'));

        expect(activeFilterTags).toContain('Action');
        expect(activeTagsEl.children.length).toBe(1);
        expect(filterInput.value).toBe('');
    });

    it('removes tag on close click', () => {
        filterInput.value = 'action ';
        filterInput.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));

        const closeBtn = activeTagsEl.querySelector('.tag-close') as HTMLElement;
        closeBtn.click();

        expect(activeFilterTags.length).toBe(0);
        expect(activeTagsEl.children.length).toBe(0);
    });

    it('filters characters inclusively (OR)', () => {
        activeFilterTags.push('action');
        activeFilterTags.push('comedy');
        toggleEl.checked = false; 

        filterCharacters();

        expect(characterRenderer.renderCharacterList).toHaveBeenCalled();
        const callArgs = vi.mocked(characterRenderer.renderCharacterList).mock.calls[0];
        const filteredChars = callArgs[1];
        expect(filteredChars.length).toBe(3);
    });

    it('filters characters exclusively (AND)', () => {
        activeFilterTags.push('action');
        activeFilterTags.push('hero');
        toggleEl.checked = true; 

        filterCharacters();

        const callArgs = vi.mocked(characterRenderer.renderCharacterList).mock.calls[0];
        const filteredChars = callArgs[1];
        expect(filteredChars.length).toBe(1);
        expect(filteredChars[0].id).toBe(1);
    });

    it('updates filter data', () => {
        updateFilterData([{ id: 4, name: 'C4', tags: ['magic'] }] as Character[], []);
        filterInput.value = 'mag';
        filterInput.dispatchEvent(new Event('input'));
        expect(suggestionsEl.children[0].textContent).toBe('magic');
    });
});
