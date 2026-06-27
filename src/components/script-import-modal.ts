import { Project, Character } from '../types.js';
import { generateCharacterOptionsHTML } from '../utils/dom-utils.js';

interface AssignedLine {
    id: string;
    type: 'line' | 'title';
    characterId: string;
    text: string;
    originalStart: number;
    originalEnd: number; // to keep track of sorting
}

let modal: HTMLElement;
let closeBtn: HTMLElement;
let toggleSwitch: HTMLInputElement;
let trimWordCheckbox: HTMLInputElement;
let addCharBtn: HTMLButtonElement;
let addSceneBtn: HTMLButtonElement;
let addTitleBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;
let projectSelect: HTMLSelectElement;
let characterSelect: HTMLSelectElement;
let listContainer: HTMLElement;
let textareaContainer: HTMLElement;
let cancelBtn: HTMLButtonElement;
let saveBtn: HTMLButtonElement;

let projectsData: Project[] = [];
let charactersData: Character[] = [];
let assignedLines: AssignedLine[] = [];
let rawTextLines: string[] = [];
let saveCallback: (lines: AssignedLine[]) => void;

let lockedElementId: string | null = null;

export function initializeScriptImportModal() {
    modal = document.getElementById('script-import-modal') as HTMLElement;
    closeBtn = document.getElementById('script-import-close') as HTMLElement;
    toggleSwitch = document.getElementById('script-import-toggle') as HTMLInputElement;
    trimWordCheckbox = document.getElementById('script-import-trim-word') as HTMLInputElement;
    addCharBtn = document.getElementById('script-import-add-char') as HTMLButtonElement;
    addSceneBtn = document.getElementById('script-import-add-scene') as HTMLButtonElement;
    addTitleBtn = document.getElementById('script-import-add-title') as HTMLButtonElement;
    resetBtn = document.getElementById('script-import-reset-btn') as HTMLButtonElement;
    projectSelect = document.getElementById('script-import-project') as HTMLSelectElement;
    characterSelect = document.getElementById('script-import-character') as HTMLSelectElement;
    listContainer = document.getElementById('script-import-list') as HTMLElement;
    textareaContainer = document.getElementById('script-import-textarea') as HTMLElement;
    cancelBtn = document.getElementById('script-import-cancel') as HTMLButtonElement;
    saveBtn = document.getElementById('script-import-save') as HTMLButtonElement;

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    toggleSwitch.addEventListener('change', renderTextContent);

    projectSelect.addEventListener('change', handleProjectChange);

    addCharBtn.addEventListener('click', () => assignSelection('line', characterSelect.value || 'none'));
    addSceneBtn.addEventListener('click', () => assignSelection('line', 'scene'));
    addTitleBtn.addEventListener('click', () => assignSelection('title', 'scene'));

    resetBtn.addEventListener('click', handleReset);

    saveBtn.addEventListener('click', () => {
        const unassignedSpans = textareaContainer.querySelectorAll('span.import-highlight:not(.import-assigned)');
        let hasUnassigned = false;
        unassignedSpans.forEach(span => {
            if (span.textContent && span.textContent.trim().length > 0) {
                hasUnassigned = true;
            }
        });

        if (hasUnassigned) {
            if (!confirm("There is still unassigned text in the script. Are you sure you want to save?")) {
                return;
            }
        }

        if (saveCallback) {
            saveCallback(assignedLines);
        }
        closeModal();
    });
}

export function openScriptImportModal(projects: Project[], characters: Character[], textContent: string, onSave: (lines: AssignedLine[]) => void) {
    projectsData = projects;
    charactersData = characters;
    rawTextLines = textContent.split('\n');
    assignedLines = [];
    lockedElementId = null;
    saveCallback = onSave;

    projectSelect.innerHTML = '<option value="none">No Project</option>';
    projectsData.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id.toString();
        opt.textContent = p.name;
        projectSelect.appendChild(opt);
    });
    projectSelect.value = 'none';
    handleProjectChange();

    renderTextContent();
    renderListView();
    updateButtonStates();
    
    window.addEventListener('keydown', handleKeyDown);
    
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    window.removeEventListener('keydown', handleKeyDown);
    lockedElementId = null;
    assignedLines = [];
}

function handleKeyDown(e: KeyboardEvent) {
    if (modal.classList.contains('hidden')) return;

    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    const isInputFocused = targetTag === 'input' || targetTag === 'select' || targetTag === 'textarea';

    if (!isInputFocused) {
        switch (e.key.toLowerCase()) {
            case 'c':
                if (!addCharBtn.disabled) addCharBtn.click();
                break;
            case 't':
                if (!addTitleBtn.disabled) addTitleBtn.click();
                break;
            case 's':
                if (!addSceneBtn.disabled) addSceneBtn.click();
                break;
            case 'r':
                resetBtn.click();
                break;
        }
    }

    if (e.key === 'Escape') {
        cancelBtn.click();
    } else if (e.key === 'Enter' && !isInputFocused) {
        saveBtn.click();
    }
}

function handleProjectChange() {
    const projectId = projectSelect.value;
    const pId = projectId !== 'none' ? parseInt(projectId) : undefined;
    characterSelect.innerHTML = '<option value="none">Select Character...</option>' + generateCharacterOptionsHTML(charactersData, pId);
    updateButtonStates();
}

function isSegmentAssigned(lineIdx: number, charIdxStart: number, charIdxEnd: number) {
    const startOffset = lineIdx * 100000 + charIdxStart;
    const endOffset = lineIdx * 100000 + charIdxEnd;

    for (const assigned of assignedLines) {
        if (startOffset < assigned.originalEnd && endOffset > assigned.originalStart) {
            return true;
        }
    }
    return false;
}

function renderTextContent() {
    textareaContainer.innerHTML = '';
    const isLineMode = toggleSwitch.checked;

    rawTextLines.forEach((lineText, lineIdx) => {
        const lineDiv = document.createElement('div');
        lineDiv.style.minHeight = '1.5em';

        if (lineText.length === 0) {
            textareaContainer.appendChild(lineDiv);
            return;
        }

        if (isLineMode) {
            const segStart = lineIdx * 100000;
            const segEnd = segStart + lineText.length;
            const assigned = isSegmentAssigned(lineIdx, 0, lineText.length);

            const span = document.createElement('span');
            span.textContent = lineText;
            span.dataset.id = `seg-${lineIdx}-0`;
            span.dataset.start = segStart.toString();
            span.dataset.end = segEnd.toString();
            span.dataset.text = lineText;

            if (assigned) {
                span.className = 'import-assigned';
            } else {
                span.className = 'import-highlight';
                if (lockedElementId === span.dataset.id) {
                    span.classList.add('locked');
                }
                span.addEventListener('click', handleSegmentClick);
            }
            lineDiv.appendChild(span);
        } else {
            const sentences = lineText.match(/[^.]*\.?/g) || [];
            let cursor = 0;
            sentences.forEach((sentence, sIdx) => {
                if (!sentence) return;
                const segStart = lineIdx * 100000 + cursor;
                const segEnd = segStart + sentence.length;
                const assigned = isSegmentAssigned(lineIdx, cursor, cursor + sentence.length);

                const span = document.createElement('span');
                span.textContent = sentence;
                span.dataset.id = `seg-${lineIdx}-${sIdx}`;
                span.dataset.start = segStart.toString();
                span.dataset.end = segEnd.toString();
                span.dataset.text = sentence;

                if (assigned) {
                    span.className = 'import-assigned';
                } else {
                    span.className = 'import-highlight';
                    if (lockedElementId === span.dataset.id) {
                        span.classList.add('locked');
                    }
                    span.addEventListener('click', handleSegmentClick);
                }
                lineDiv.appendChild(span);

                cursor += sentence.length;
            });
        }
        
        textareaContainer.appendChild(lineDiv);
    });
}

function handleSegmentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('import-assigned')) return;

    if (lockedElementId === target.dataset.id) {
        lockedElementId = null;
        target.classList.remove('locked');
    } else {
        if (lockedElementId) {
            const oldLocked = textareaContainer.querySelector(`span[data-id="${lockedElementId}"]`);
            if (oldLocked) oldLocked.classList.remove('locked');
        }
        lockedElementId = target.dataset.id || null;
        target.classList.add('locked');
    }
    
    // Clear any list view selections
    const allItems = listContainer.querySelectorAll('.import-list-item');
    allItems.forEach((el: any) => el.style.backgroundColor = '');

    updateButtonStates();
}

function updateButtonStates() {
    // A segment is locked, or an assigned line is selected for reset
    const hasLock = lockedElementId !== null && lockedElementId.startsWith('seg-');
    addCharBtn.disabled = !hasLock;
    addSceneBtn.disabled = !hasLock;
    addTitleBtn.disabled = !hasLock;
}

function assignSelection(type: 'line' | 'title', characterId: string) {
    if (!lockedElementId) return;

    const lockedSpan = textareaContainer.querySelector(`span[data-id="${lockedElementId}"]`) as HTMLElement;
    if (!lockedSpan) return;

    const start = parseInt(lockedSpan.dataset.start || '0');
    const end = parseInt(lockedSpan.dataset.end || '0');
    let text = lockedSpan.dataset.text || '';
    text = text.trim();

    if (trimWordCheckbox.checked && type === 'line' && characterId !== 'scene' && characterId !== 'none') {
        const firstSpace = text.indexOf(' ');
        if (firstSpace !== -1) {
            text = text.substring(firstSpace + 1).trim();
        } else {
            // Only one word exists, trimming it would make it empty
            text = '';
        }
    }

    const newLine: AssignedLine = {
        id: Math.random().toString(36).substring(2, 10),
        type,
        characterId,
        text,
        originalStart: start,
        originalEnd: end
    };

    assignedLines.push(newLine);
    assignedLines.sort((a, b) => a.originalStart - b.originalStart);

    lockedElementId = null;
    renderTextContent();
    renderListView();
    updateButtonStates();
}

function renderListView() {
    listContainer.innerHTML = '';
    assignedLines.forEach(line => {
        const item = document.createElement('div');
        item.className = 'import-list-item';
        
        if (line.type === 'title') {
            item.classList.add('title-line');
            item.textContent = `TITLE: ${line.text}`;
        } else if (line.characterId === 'scene') {
            item.classList.add('scene-line');
            item.textContent = `SCENE: ${line.text}`;
        } else {
            item.classList.add('char-line');
            let charName = 'Unknown';
            if (line.characterId !== 'none') {
                const c = charactersData.find(c => c.id.toString() === line.characterId);
                if (c) charName = c.name;
            }
            item.textContent = `${charName}: ${line.text}`;
        }

        item.dataset.lineId = line.id;
        
        item.addEventListener('click', () => {
            const allItems = listContainer.querySelectorAll('.import-list-item');
            allItems.forEach((el: any) => el.style.backgroundColor = '');
            
            if (lockedElementId === line.id) {
                lockedElementId = null;
            } else {
                lockedElementId = line.id;
                item.style.backgroundColor = 'var(--gray-300)';
                if (document.body.classList.contains('dark-mode')) item.style.backgroundColor = 'var(--gray-600)';

                if (line.type === 'line' && line.characterId !== 'scene' && line.characterId !== 'none') {
                    const char = charactersData.find(c => c.id.toString() === line.characterId);
                    if (char && char.projectId != null) {
                        projectSelect.value = char.projectId.toString();
                        handleProjectChange();
                        characterSelect.value = char.id.toString();
                    }
                }
                
                // Remove lock from text area if any
                const lockedSpan = textareaContainer.querySelector('span.locked');
                if (lockedSpan) lockedSpan.classList.remove('locked');
            }
            updateButtonStates();
        });

        listContainer.appendChild(item);
    });
}

function handleReset() {
    if (lockedElementId) {
        const idx = assignedLines.findIndex(l => l.id === lockedElementId);
        if (idx !== -1) {
            if (confirm("Reset this assigned line?")) {
                assignedLines.splice(idx, 1);
                lockedElementId = null;
                renderTextContent();
                renderListView();
                updateButtonStates();
            }
        } else {
            if (confirm("Clear selection?")) {
                lockedElementId = null;
                renderTextContent();
                updateButtonStates();
            }
        }
    } else {
        if (confirm("Are you sure you want to clear all configured lines?")) {
            assignedLines = [];
            lockedElementId = null;
            renderTextContent();
            renderListView();
            updateButtonStates();
        }
    }
}
