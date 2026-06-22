import { Project, Character } from '../types.js';
import './character-modal-element.js';

let modalWrapper: HTMLElement;
let characterModalComponent: any;

let saveCharacterCallback: (character: Character, artworkFile?: File, sampleFile?: File, recordedSample?: string) => Promise<void>;
let duplicateCharacterCallback: (character: Character) => void;
let deleteCharacterCallback: (id: number) => void;

export function initializeCharacterModal(
    modalEl: HTMLElement,
    modalContentEl: HTMLElement,
    initialCharacters: Character[],
    initialProjects: Project[],
    saveCb: (character: Character, artworkFile?: File, sampleFile?: File, recordedSample?: string) => Promise<void>,
    duplicateCb: (character: Character) => void,
    deleteCb: (id: number) => void
) {
    modalWrapper = modalEl;
    saveCharacterCallback = saveCb;
    duplicateCharacterCallback = duplicateCb;
    deleteCharacterCallback = deleteCb;

    // Clear old contents and use the new web component
    modalWrapper.innerHTML = '';
    characterModalComponent = document.createElement('character-modal');
    modalWrapper.appendChild(characterModalComponent);

    characterModalComponent.addEventListener('modalClosed', () => {
        closeModal();
    });

    characterModalComponent.addEventListener('saveCharacter', (e: any) => {
        const { character, artworkFile, recordedSample } = e.detail;
        saveCharacterCallback(character, artworkFile, undefined, recordedSample);
    });

    characterModalComponent.addEventListener('duplicateCharacter', (e: any) => {
        duplicateCharacterCallback(e.detail);
    });

    characterModalComponent.addEventListener('deleteCharacter', (e: any) => {
        deleteCharacterCallback(e.detail);
    });
}

export function openModal(character?: Character, isEditMode = false) {
    if (!characterModalComponent) return;
    modalWrapper.classList.remove('hidden');
    characterModalComponent.open(character || null, isEditMode);
}

export function closeModal() {
    if (!modalWrapper) return;
    modalWrapper.classList.add('hidden');
}
