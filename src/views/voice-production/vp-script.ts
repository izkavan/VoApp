import { Project, Character, DictionaryEntry } from '../../types.js';
import JSZip from 'jszip';
import { highlightDictionaryWords } from '../../components/dictionary-highlighter.js';
import { getDictionaryEntries } from '../../services/indexeddb.js';
import { loadScriptIntoSides } from './vp-sides.js';
import { loadScriptIntoLineReader } from '../line-reader.js';

interface ScriptLine {
    id: string;
    type: 'line' | 'title';
    characterId: string; // 'scene' or stringified number
    descriptor: string;
    text: string;
}

let projects: Project[] = [];
let characters: Character[] = [];
let currentDictionary: DictionaryEntry[] = [];
let openDictionaryCallback: (project: Project) => void = () => {};

let scriptLines: ScriptLine[] = [];
let dragSourceId: string | null = null;

function getCaretCharacterOffsetWithin(element: HTMLElement): number {
    let caretOffset = 0;
    const doc = element.ownerDocument || element.ownerDocument;
    const win = doc.defaultView || window;
    const sel = win.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
}

function setCaretPosition(el: HTMLElement, pos: number) {
    const doc = el.ownerDocument || document;
    const win = doc.defaultView || window;
    let found = false;

    function walk(node: Node) {
        if (found) return;
        if (node.nodeType === Node.TEXT_NODE) {
            const len = (node as Text).length;
            if (pos <= len) {
                const range = doc.createRange();
                range.setStart(node, pos);
                range.collapse(true);
                const sel = win.getSelection();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                found = true;
            } else {
                pos -= len;
            }
        } else {
            for (const child of Array.from(node.childNodes)) {
                walk(child);
                if (found) break;
            }
        }
    }
    walk(el);
}

// DOM Elements
let nameInput: HTMLInputElement;
let versionInput: HTMLInputElement;
let projectSelect: HTMLSelectElement;
let dictionaryBtn: HTMLButtonElement;
let importBtn: HTMLButtonElement;
let saveBtn: HTMLButtonElement;
let sendSidesBtn: HTMLButtonElement;
let sendLineReadBtn: HTMLButtonElement;
let importInput: HTMLInputElement;
let linesContainer: HTMLElement;
let tocContainer: HTMLElement;
let tocList: HTMLElement;
let addLineBtn: HTMLButtonElement;
let scrollInterval: number | null = null;
let addTitleBtn: HTMLButtonElement;

export function initializeScriptView(
    initialProjects: Project[], 
    initialCharacters: Character[],
    openDictCb: (project: Project) => void
) {
    projects = initialProjects;
    characters = initialCharacters;
    openDictionaryCallback = openDictCb;

    nameInput = document.getElementById('vp-script-name') as HTMLInputElement;
    versionInput = document.getElementById('vp-script-version') as HTMLInputElement;
    projectSelect = document.getElementById('vp-script-project-select') as HTMLSelectElement;
    dictionaryBtn = document.getElementById('vp-script-dictionary-btn') as HTMLButtonElement;
    importBtn = document.getElementById('vp-script-import-btn') as HTMLButtonElement;
    saveBtn = document.getElementById('vp-script-save-btn') as HTMLButtonElement;
    sendSidesBtn = document.getElementById('vp-script-send-sides-btn') as HTMLButtonElement;
    sendLineReadBtn = document.getElementById('vp-script-send-line-read-btn') as HTMLButtonElement;
    importInput = document.getElementById('vp-script-import-input') as HTMLInputElement;
    linesContainer = document.getElementById('vp-script-lines') as HTMLElement;
    tocContainer = document.getElementById('vp-script-toc') as HTMLElement;
    tocList = document.getElementById('vp-script-toc-list') as HTMLElement;
    addLineBtn = document.getElementById('vp-script-add-line-btn') as HTMLButtonElement;
    addTitleBtn = document.getElementById('vp-script-add-title-btn') as HTMLButtonElement;

    if (!nameInput) return;

    projectSelect.addEventListener('change', handleProjectChange);
    dictionaryBtn.addEventListener('click', openDictionary);
    importBtn?.addEventListener('click', () => importInput.click());
    importInput?.addEventListener('change', handleImport);
    addLineBtn.addEventListener('click', () => addLine('line'));
    addTitleBtn.addEventListener('click', () => addLine('title'));
    saveBtn?.addEventListener('click', handleExport);
    sendSidesBtn?.addEventListener('click', () => sendScriptToExternal('sides'));
    sendLineReadBtn?.addEventListener('click', () => sendScriptToExternal('line-read'));

    linesContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const rect = linesContainer.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < 50) {
            if (!scrollInterval) scrollInterval = window.setInterval(() => linesContainer.scrollTop -= 10, 20);
        } else if (y > rect.height - 50) {
            if (!scrollInterval) scrollInterval = window.setInterval(() => linesContainer.scrollTop += 10, 20);
        } else {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        }
    });

    linesContainer.addEventListener('drop', () => {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    });

    linesContainer.addEventListener('dragleave', () => {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    });

    window.addEventListener('dictionaryUpdated', async (e: Event) => {
        const customEvent = e as CustomEvent;
        if (projectSelect.value !== 'none' && parseInt(projectSelect.value) === customEvent.detail.projectId) {
            currentDictionary = await getDictionaryEntries(customEvent.detail.projectId);
            renderLines();
        }
    });

    refreshScriptView(projects, characters);
}

function getScriptPayload() {
    return {
        name: (document.getElementById('vp-script-name') as HTMLInputElement)?.value || 'Script',
        version: (document.getElementById('vp-script-version') as HTMLInputElement)?.value || '1.0',
        projectId: projectSelect.value === 'none' ? null : parseInt(projectSelect.value),
        lines: scriptLines.map(line => {
            let charName = '';
            if (line.characterId !== 'scene') {
                const char = characters.find(c => c.id.toString() === line.characterId);
                charName = char ? char.name : 'Unknown';
            }
            return {
                id: line.id,
                type: line.type,
                characterId: line.characterId === 'scene' ? null : parseInt(line.characterId),
                characterName: charName,
                descriptor: line.descriptor,
                text: line.text
            };
        })
    };
}

function sendScriptToExternal(target: 'sides' | 'line-read') {
    const payload = getScriptPayload();
    if (target === 'sides') {
        if (loadScriptIntoSides) {
            loadScriptIntoSides(payload);
            document.querySelector<HTMLElement>('[data-tab="vp-sides"]')?.click();
        }
    } else if (target === 'line-read') {
        if (loadScriptIntoLineReader) {
            loadScriptIntoLineReader(payload);
            document.getElementById('nav-voice-actors')?.click();
            document.querySelector<HTMLElement>('[data-tab="scripts"]')?.click();
        }
    }
}

export function refreshScriptView(newProjects: Project[], newCharacters: Character[]) {
    projects = newProjects;
    characters = newCharacters;

    const currentProject = projectSelect.value;
    projectSelect.innerHTML = '<option value="none">No Project</option>';
    projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id.toString();
        opt.textContent = p.name;
        projectSelect.appendChild(opt);
    });
    
    if (projects.some(p => p.id.toString() === currentProject)) {
        projectSelect.value = currentProject;
    } else {
        projectSelect.value = 'none';
    }

    handleProjectChange();
    renderLines();
}

async function handleProjectChange() {
    const projectId = projectSelect.value;
    if (projectId !== 'none') {
        dictionaryBtn.classList.remove('hidden');
        currentDictionary = await getDictionaryEntries(parseInt(projectId));
    } else {
        dictionaryBtn.classList.add('hidden');
        currentDictionary = [];
    }

    renderLines();
}

function openDictionary() {
    const projectId = parseInt(projectSelect.value);
    const project = projects.find(p => p.id === projectId);
    if (project) {
        openDictionaryCallback(project);
    }
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 10);
}

function addLine(type: 'line' | 'title') {
    const newLine: ScriptLine = {
        id: generateId(),
        type: type,
        characterId: 'scene',
        descriptor: '',
        text: ''
    };
    scriptLines.push(newLine);
    renderLines();
    
    setTimeout(() => {
        linesContainer.scrollTop = linesContainer.scrollHeight;
    }, 50);
}

function deleteLine(id: string) {
    scriptLines = scriptLines.filter(l => l.id !== id);
    renderLines();
}

function renderLines() {
    linesContainer.innerHTML = '';
    tocList.innerHTML = '';
    
    const projectId = projectSelect.value;
    const availableCharacters = projectId === 'none' 
        ? characters 
        : characters.filter(c => c.projectId === parseInt(projectId));

    const titles = scriptLines.filter(l => l.type === 'title');
    if (titles.length > 0) {
        tocContainer.style.display = 'block';
    } else {
        tocContainer.style.display = 'none';
    }

    scriptLines.forEach((line, index) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'script-line-item';
        let tocLi: HTMLElement | null = null;
        if (line.type === 'title') {
            lineEl.classList.add('script-title-card');
            
            tocLi = document.createElement('li');
            tocLi.textContent = line.text || 'Untitled Title Card';
            tocLi.style.cursor = 'pointer';
            tocLi.style.color = 'var(--primary-color)';
            tocLi.style.textDecoration = 'underline';
            tocLi.addEventListener('click', () => {
                lineEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            tocList.appendChild(tocLi);
        } else if (line.characterId === 'scene') {
            lineEl.classList.add('script-scene-details');
        }
        
        lineEl.dataset.id = line.id;
        lineEl.draggable = true;
        
        lineEl.addEventListener('dragstart', handleDragStart);
        lineEl.addEventListener('dragover', handleDragOver);
        lineEl.addEventListener('drop', handleDrop);
        lineEl.addEventListener('dragend', handleDragEnd);

        const dragHandle = document.createElement('div');
        dragHandle.className = 'script-drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        lineEl.appendChild(dragHandle);

        if (line.type === 'title') {
            const content = document.createElement('div');
            content.className = 'script-line-content';
            
            const titleInput = document.createElement('textarea');
            titleInput.value = line.text;
            titleInput.placeholder = "ACT I";
            titleInput.rows = 2;
            titleInput.addEventListener('input', (e) => {
                line.text = (e.target as HTMLTextAreaElement).value;
                if (tocLi) {
                    tocLi.textContent = line.text || 'Untitled Title Card';
                }
            });
            content.appendChild(titleInput);
            
            lineEl.appendChild(content);

        } else {
            const header = document.createElement('div');
            header.className = 'script-line-header';

            const charSelect = document.createElement('select');
            charSelect.className = 'script-char-select';
            charSelect.innerHTML = `<option value="scene">Scene Details</option>`;
            availableCharacters.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id.toString();
                opt.textContent = c.name;
                charSelect.appendChild(opt);
            });
            charSelect.value = line.characterId;
            
            header.appendChild(charSelect);

            if (line.characterId !== 'scene') {
                const selectedChar = availableCharacters.find(c => c.id.toString() === line.characterId);
                if (selectedChar && selectedChar.artwork) {
                    const avatar = document.createElement('img');
                    avatar.src = selectedChar.artwork;
                    avatar.className = 'script-character-avatar';
                    header.appendChild(avatar);
                }

                const descInput = document.createElement('input');
                descInput.type = 'text';
                descInput.className = 'script-desc-input';
                descInput.placeholder = 'e.g. whispered';
                descInput.value = line.descriptor;
                descInput.addEventListener('input', (e) => {
                    line.descriptor = (e.target as HTMLInputElement).value;
                });
                header.appendChild(descInput);
            }

            charSelect.addEventListener('change', (e) => {
                line.characterId = (e.target as HTMLSelectElement).value;
                if (line.characterId === 'scene') line.descriptor = '';
                renderLines();
            });

            lineEl.appendChild(header);

            const content = document.createElement('div');
            content.className = 'script-line-content';

            const textInput = document.createElement('div');
            textInput.contentEditable = 'true';
            textInput.className = 'script-text-input';
            
            const dict = currentDictionary;
            
            textInput.innerHTML = highlightDictionaryWords(line.text || '', dict);
            if (!line.text) {
                textInput.dataset.placeholder = line.characterId === 'scene' ? 'Describe the scene...' : 'Dialogue...';
            }

            textInput.addEventListener('input', (e) => {
                const target = e.target as HTMLElement;
                const rawText = target.textContent || '';
                line.text = rawText;

                // Check if last character typed was space or punctuation
                const lastChar = rawText.slice(-1);
                if (/[ \.,!\?;:\]\)]/.test(lastChar)) {
                    const caretPos = getCaretCharacterOffsetWithin(target);
                    target.innerHTML = highlightDictionaryWords(rawText, dict);
                    setCaretPosition(target, caretPos);
                }
            });
            
            // To emulate textarea styling:
            textInput.style.minHeight = '1.5em';
            textInput.style.whiteSpace = 'pre-wrap';
            textInput.style.padding = '10px';
            textInput.style.color = 'var(--text-color)';
            textInput.style.flexGrow = '1';
            
            content.appendChild(textInput);
            lineEl.appendChild(content);
        }

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '🗑️';
        delBtn.className = 'icon-btn';
        delBtn.title = 'Delete Line';
        delBtn.style.color = 'var(--gray-600)';
        delBtn.addEventListener('click', () => deleteLine(line.id));
        lineEl.appendChild(delBtn);

        linesContainer.appendChild(lineEl);
    });
}

function handleDragStart(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
    dragSourceId = target.dataset.id || null;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSourceId || '');
    }
}

function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    
    const target = (e.target as HTMLElement).closest('.script-line-item') as HTMLElement | null;
    if (target && target.dataset.id !== dragSourceId) {
        target.classList.add('drag-over');
    }
}

function handleDrop(e: DragEvent) {
    e.stopPropagation();
    const target = (e.target as HTMLElement).closest('.script-line-item') as HTMLElement | null;
    if (target && dragSourceId && target.dataset.id !== dragSourceId) {
        const targetId = target.dataset.id;
        
        const sourceIndex = scriptLines.findIndex(l => l.id === dragSourceId);
        const targetIndex = scriptLines.findIndex(l => l.id === targetId);
        
        if (sourceIndex > -1 && targetIndex > -1) {
            const [movedItem] = scriptLines.splice(sourceIndex, 1);
            scriptLines.splice(targetIndex, 0, movedItem);
            renderLines();
        }
    }
    target?.classList.remove('drag-over');
}

function handleDragEnd(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    
    const items = linesContainer.querySelectorAll('.script-line-item');
    items.forEach(item => item.classList.remove('drag-over'));
    dragSourceId = null;

    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
}

async function handleExport() {
    if (scriptLines.length === 0) {
        alert("Script is empty!");
        return;
    }

    const payload = getScriptPayload();
    const zip = new JSZip();

    zip.file('script.json', JSON.stringify(payload, null, 2));

    let txtContent = '';
    let mdContent = '';

    const projectId = projectSelect.value;
    const availableCharacters = projectId === 'none' 
        ? characters 
        : characters.filter(c => c.projectId === parseInt(projectId));

    scriptLines.forEach(line => {
        if (line.type === 'title') {
            txtContent += `${line.text}\n\n`;
            mdContent += `# ${line.text}\n\n`;
        } else if (line.characterId === 'scene') {
            txtContent += `SCENE: ${line.text}\n\n`;
            mdContent += `**${line.text}**\n\n`;
        } else {
            const char = availableCharacters.find(c => c.id.toString() === line.characterId);
            const charName = char ? char.name : 'Unknown';
            const desc = line.descriptor ? ` [${line.descriptor}]` : '';
            const mdDesc = line.descriptor ? ` *${line.descriptor}*` : '';
            
            txtContent += `${charName}${desc}: ${line.text}\n\n`;
            mdContent += `[[${charName}]]${mdDesc}: ${line.text}\n\n`;
        }
    });

    zip.file('script.txt', txtContent.trim());
    zip.file('script.md', mdContent.trim());

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.zip`;
    a.click();
    
    URL.revokeObjectURL(url);
}

async function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        let jsonStr = '';

        if (file.name.endsWith('.zip')) {
            const zip = await JSZip.loadAsync(file);
            let jsonFile = zip.file('script.json');
            
            // Fallback: find any .json file if script.json is missing
            if (!jsonFile) {
                const files = Object.keys(zip.files);
                const jsonPath = files.find(f => f.endsWith('.json'));
                if (jsonPath) {
                    jsonFile = zip.file(jsonPath);
                }
            }

            if (!jsonFile) throw new Error('No JSON file found in the ZIP archive.');
            jsonStr = await jsonFile.async('string');
        } else if (file.name.endsWith('.json')) {
            jsonStr = await file.text();
        } else {
            throw new Error('Unsupported file format. Please upload a .json or .zip file.');
        }

        const data = JSON.parse(jsonStr);
        if (!data.lines || !Array.isArray(data.lines)) {
            throw new Error('Invalid script data format.');
        }

        if (data.name) nameInput.value = data.name;
        if (data.version) versionInput.value = data.version;
        if (data.projectId) {
            projectSelect.value = data.projectId.toString();
        } else {
            projectSelect.value = 'none';
        }
        handleProjectChange();

        scriptLines = data.lines;
        renderLines();

    } catch (err: any) {
        alert('Failed to import script: ' + err.message);
    } finally {
        importInput.value = ''; // reset input
    }
}
