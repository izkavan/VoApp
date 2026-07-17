import { Character, Project } from "../types.js";
import { renderCharacterList } from "./character-renderer.js";

// --- Module State ---
let characters: Character[] = [];
let projects: Project[] = [];
export let activeFilterTags: string[] = [];
let renderAppCallback: () => void;

// --- DOM Elements ---
let filterTagsInput: HTMLInputElement;
let tagSuggestionsElement: HTMLElement;
let activeTagsContainer: HTMLElement;
let exclusiveToggle: HTMLInputElement;
let characterListElement: HTMLElement; // Need this to pass to renderCharacterList
let onCharacterDropCallback: (characterId: number, projectId?: number) => void; // Callback for drag and drop

export function initializeFilterSearch(
  filterInput: HTMLInputElement,
  suggestionsEl: HTMLElement,
  activeTagsEl: HTMLElement,
  toggleEl: HTMLInputElement,
  charListEl: HTMLElement,
  initialCharacters: Character[],
  initialProjects: Project[],
  onDropCb: (characterId: number, projectId?: number) => void,
  renderAppCb: () => void,
) {
  filterTagsInput = filterInput;
  tagSuggestionsElement = suggestionsEl;
  activeTagsContainer = activeTagsEl;
  exclusiveToggle = toggleEl;
  characterListElement = charListEl;
  characters = initialCharacters;
  projects = initialProjects;
  onCharacterDropCallback = onDropCb;
  renderAppCallback = renderAppCb;

  filterTagsInput.addEventListener("input", handleTagSuggestions);
  filterTagsInput.addEventListener("keyup", (e) => {
    if (e.key === " " && filterTagsInput.value.trim() !== "") {
      const newTags = filterTagsInput.value.trim().split(/\s+/);
      newTags.forEach((t) => {
        if (t && !activeFilterTags.includes(t)) {
          activeFilterTags.push(t);
        }
      });
      filterTagsInput.value = "";
      filterCharacters();
    }
  });
  exclusiveToggle.addEventListener("change", filterCharacters);
  document.addEventListener("click", (e) => {
    if (tagSuggestionsElement && !filterTagsInput.contains(e.target as Node)) {
      tagSuggestionsElement.innerHTML = "";
    }
  });
}

function getAllUniqueTags(): string[] {
  const allTags = new Set<string>();
  characters.forEach((character) => {
    character.tags?.forEach((tag) => allTags.add(tag));
  });
  return Array.from(allTags);
}

export function renderActiveTags() {
  if (!activeTagsContainer) return;
  activeTagsContainer.innerHTML = "";
  activeFilterTags.forEach((tag, index) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag-item";
    tagEl.textContent = tag;

    const closeEl = document.createElement("span");
    closeEl.className = "tag-close";
    closeEl.innerHTML = "&times;";
    closeEl.addEventListener("click", () => {
      activeFilterTags.splice(index, 1);
      filterCharacters();
    });

    tagEl.appendChild(closeEl);
    activeTagsContainer.appendChild(tagEl);
  });
}

export function handleTagSuggestions() {
  if (!tagSuggestionsElement) return;

  const inputValue = filterTagsInput.value.trim().toLowerCase();
  tagSuggestionsElement.innerHTML = "";

  if (inputValue === "") {
    return;
  }

  const uniqueTags = getAllUniqueTags();
  const suggestions = uniqueTags.filter(
    (tag) =>
      tag.toLowerCase().startsWith(inputValue) &&
      !activeFilterTags.includes(tag.toLowerCase()),
  );

  suggestions.forEach((suggestion) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = suggestion;
    item.addEventListener("click", () => {
      if (!activeFilterTags.includes(suggestion)) {
        activeFilterTags.push(suggestion);
      }
      filterTagsInput.value = "";
      filterCharacters();
      tagSuggestionsElement.innerHTML = "";
      filterTagsInput.focus();
    });
    tagSuggestionsElement.appendChild(item);
  });
}

export function filterCharacters() {
  renderActiveTags();

  let filteredCharacters = characters;

  if (activeFilterTags.length > 0) {
    const isExclusive = exclusiveToggle.checked;
    const filterValues = activeFilterTags.map((t) => t.toLowerCase());

    filteredCharacters = characters.filter((character) => {
      const charTags = character.tags?.map((t) => t.toLowerCase()) || [];
      if (isExclusive) {
        return filterValues.every((filterTag) => charTags.includes(filterTag));
      } else {
        return filterValues.some((filterTag) => charTags.includes(filterTag));
      }
    });
  }

  if (characterListElement) {
    renderCharacterList(
      characterListElement,
      filteredCharacters,
      projects,
      onCharacterDropCallback,
    );
  }
}

export function updateFilterData(
  newCharacters: Character[],
  newProjects: Project[],
) {
  characters = newCharacters;
  projects = newProjects;
  filterCharacters();
}
