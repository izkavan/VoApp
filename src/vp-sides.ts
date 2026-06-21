import { Project, Character } from './types.js';
import JSZip from 'jszip';

interface ScriptLine {
    id: string;
    type: 'line' | 'title';
    characterId: string | null;
    characterName: string;
    descriptor: string;
    text: string;
}

interface ScriptMetadata {
    name: string;
    projectId: number | null;
    lines: ScriptLine[];
}

let characters: Character[] = [];
let scriptData: ScriptMetadata | null = null;
let checkedCharacters = new Set<string>();

// DOM Elements
let importInput: HTMLInputElement;
let importBtn: HTMLButtonElement;
let exportFilenameInput: HTMLInputElement;
let exportBtn: HTMLButtonElement;
let includeContextToggle: HTMLInputElement;
let charactersContainer: HTMLElement;
let linesContainer: HTMLElement;

let openModalCallback: ((char: Character) => void) | null = null;

export function initializeSidesView(initialCharacters: Character[], openCharacterModal: (char: Character) => void) {
    characters = initialCharacters;
    openModalCallback = openCharacterModal;

    importInput = document.getElementById('vp-sides-import-input') as HTMLInputElement;
    importBtn = document.getElementById('vp-sides-import-btn') as HTMLButtonElement;
    exportFilenameInput = document.getElementById('vp-sides-export-filename') as HTMLInputElement;
    exportBtn = document.getElementById('vp-sides-export-btn') as HTMLButtonElement;
    includeContextToggle = document.getElementById('vp-sides-include-context') as HTMLInputElement;
    charactersContainer = document.getElementById('vp-sides-characters') as HTMLElement;
    linesContainer = document.getElementById('vp-sides-lines') as HTMLElement;

    if (!importBtn) return;

    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);
    exportBtn.addEventListener('click', handleExport);
    includeContextToggle.addEventListener('change', updateLinesFading);
}

export function refreshSidesView(newCharacters: Character[]) {
    characters = newCharacters;
    renderCharacters();
}

async function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    scriptData = null;
    checkedCharacters.clear();

    if (file.name.endsWith('.json')) {
        const text = await file.text();
        try {
            scriptData = JSON.parse(text);
        } catch (err) {
            alert("Invalid JSON file.");
            return;
        }
    } else if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const jsonFile = zip.file('script.json');
        if (jsonFile) {
            const text = await jsonFile.async('text');
            try {
                scriptData = JSON.parse(text);
            } catch (err) {
                alert("Invalid JSON file inside zip.");
                return;
            }
        } else {
            alert("Could not find script.json in zip file.");
            return;
        }
    } else {
        alert("Unsupported file format.");
        return;
    }

    if (scriptData) {
        exportFilenameInput.style.display = 'block';
        const safeName = (scriptData.name || 'Script').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        exportFilenameInput.value = `${safeName}_sides`;
        
        renderCharacters();
        renderLines();
    }
}

function renderCharacters() {
    if (!charactersContainer) return;
    charactersContainer.innerHTML = '';

    if (!scriptData) {
        charactersContainer.innerHTML = '<div style="text-align: center; color: var(--gray-500); margin-top: 20px;">Upload a script to view characters</div>';
        return;
    }

    // Extract unique characters from the script
    const charNamesAndIds = new Map<string, string | null>(); // name -> id
    scriptData.lines.forEach(line => {
        if (line.type !== 'title' && line.characterId !== 'scene' && line.characterName !== 'scene' && line.characterName !== 'title') {
            charNamesAndIds.set(line.characterName, line.characterId);
        }
    });

    if (charNamesAndIds.size === 0) {
        charactersContainer.innerHTML = '<div style="text-align: center; color: var(--gray-500); margin-top: 20px;">No characters found in script.</div>';
        return;
    }

    charNamesAndIds.forEach((id, name) => {
        const item = document.createElement('div');
        item.className = 'sides-character-item';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'sides-character-info';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checkedCharacters.has(name);
        
        checkbox.addEventListener('change', (e) => {
            if ((e.target as HTMLInputElement).checked) {
                checkedCharacters.add(name);
            } else {
                checkedCharacters.delete(name);
            }
            updateLinesFading();
        });

        const nameLabel = document.createElement('span');
        nameLabel.textContent = name;

        infoDiv.appendChild(checkbox);
        infoDiv.appendChild(nameLabel);

        const img = document.createElement('img');
        img.className = 'sides-character-avatar';
        let artUrl = '';
        if (id) {
            const charObj = characters.find(c => c.id.toString() === id);
            if (charObj && charObj.artwork) artUrl = charObj.artwork;
        }
        if (!artUrl) {
            const charObjByName = characters.find(c => c.name === name);
            if (charObjByName && charObjByName.artwork) artUrl = charObjByName.artwork;
        }
        if (artUrl) {
            img.src = artUrl;
        } else {
            img.style.visibility = 'hidden';
        }

        item.appendChild(infoDiv);
        item.appendChild(img);

        item.addEventListener('mouseenter', () => highlightLines(name, true));
        item.addEventListener('mouseleave', () => highlightLines(name, false));

        // Click on the entire row toggles the checkbox
        item.addEventListener('click', (e) => {
            // If they clicked the checkbox directly, don't double-toggle
            if ((e.target as HTMLElement).tagName !== 'INPUT') {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        // Click on the avatar opens the character modal
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            if (openModalCallback) {
                let charObjToOpen: Character | undefined = undefined;
                if (id) {
                    charObjToOpen = characters.find(c => c.id.toString() === id);
                }
                if (!charObjToOpen) {
                    charObjToOpen = characters.find(c => c.name === name);
                }
                if (charObjToOpen) {
                    openModalCallback(charObjToOpen);
                }
            }
        });

        charactersContainer.appendChild(item);
    });
    
    updateLinesFading();
}

function renderLines() {
    if (!linesContainer) return;
    linesContainer.innerHTML = '';

    if (!scriptData) {
        linesContainer.innerHTML = '<div style="text-align: center; color: var(--gray-500); margin-top: 20px;">Upload a script to view lines</div>';
        return;
    }

    scriptData.lines.forEach((line, index) => {
        const item = document.createElement('div');
        item.className = 'sides-line-item';
        item.dataset.index = index.toString();
        item.dataset.charName = line.characterName || '';

        const meta = document.createElement('div');
        meta.className = 'sides-line-metadata';
        if (line.type === 'title') {
            meta.textContent = 'TITLE';
            item.style.textAlign = 'center';
            meta.style.textAlign = 'center';
        } else if (line.characterId === 'scene' || line.characterName === 'scene') {
            meta.textContent = 'SCENE DETAILS';
        } else {
            meta.textContent = line.characterName || 'Unknown Character';
            if (line.descriptor) meta.textContent += ` (${line.descriptor})`;
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'sides-line-text';
        if (line.type === 'title') textDiv.style.fontWeight = 'bold';
        if (line.characterId === 'scene' || line.characterName === 'scene') textDiv.style.fontStyle = 'italic';
        textDiv.textContent = line.text;

        item.appendChild(meta);
        item.appendChild(textDiv);
        linesContainer.appendChild(item);
    });
    
    updateLinesFading();
}

function highlightLines(charName: string, highlight: boolean) {
    if (!linesContainer) return;
    Array.from(linesContainer.children).forEach(child => {
        const el = child as HTMLElement;
        if (el.dataset.charName === charName) {
            if (highlight) el.classList.add('highlight');
            else el.classList.remove('highlight');
        }
    });
}

function updateLinesFading() {
    if (!linesContainer) return;
    const includeContext = includeContextToggle.checked;
    
    Array.from(linesContainer.children).forEach(child => {
        const el = child as HTMLElement;
        const charName = el.dataset.charName || '';
        const isSceneOrTitle = charName === 'scene' || charName === 'title' || !charName;
        
        if (isSceneOrTitle) {
            if (includeContext) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        } else {
            if (checkedCharacters.has(charName)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        }
    });
}

async function handleExport() {
    if (!scriptData) {
        alert('No script loaded to export.');
        return;
    }

    if (checkedCharacters.size === 0) {
        alert('Please select at least one character to export.');
        return;
    }

    const includeContext = includeContextToggle.checked;
    const zip = new JSZip();

    // Helper to generate script contents
    const generateContents = (lines: ScriptLine[]) => {
        let txt = '';
        let md = '';
        const json = JSON.stringify({ ...scriptData, lines }, null, 2);

        lines.forEach(line => {
            if (line.type === 'title') {
                txt += `${line.text}\n\n`;
                md += `# ${line.text}\n\n`;
            } else if (line.characterId === 'scene' || line.characterName === 'scene') {
                txt += `[Scene Details: ${line.text}]\n\n`;
                md += `**[Scene Details: ${line.text}]**\n\n`;
            } else {
                let charText = line.characterName;
                if (line.descriptor) charText += ` (${line.descriptor})`;
                txt += `${charText}:\n${line.text}\n\n`;
                md += `**${charText}:**\n${line.text}\n\n`;
            }
        });
        return { txt, md, json };
    };

    // 1. Master Script (only checked characters + context if selected)
    const masterLines = scriptData.lines.filter(line => {
        const isContext = line.type === 'title' || line.characterId === 'scene' || line.characterName === 'scene';
        if (isContext) return includeContext;
        return checkedCharacters.has(line.characterName);
    });
    
    const masterFiles = generateContents(masterLines);
    zip.file('script.json', masterFiles.json);
    zip.file('script.txt', masterFiles.txt);
    zip.file('script.md', masterFiles.md);

    // 2. Individual Character Scripts
    checkedCharacters.forEach(charName => {
        const charLines = scriptData!.lines.filter(line => {
            const isContext = line.type === 'title' || line.characterId === 'scene' || line.characterName === 'scene';
            if (isContext) return includeContext;
            return line.characterName === charName;
        });

        const charFiles = generateContents(charLines);
        const folder = zip.folder(charName);
        if (folder) {
            folder.file('script.json', charFiles.json);
            folder.file('script.txt', charFiles.txt);
            folder.file('script.md', charFiles.md);
        }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    
    let downloadName = exportFilenameInput.value.trim();
    if (!downloadName) downloadName = 'sides';
    if (!downloadName.endsWith('.zip')) downloadName += '.zip';
    
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
