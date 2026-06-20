import { Project, Character } from './types.js';
import JSZip from 'jszip';

interface ScriptLine {
    id: string;
    type: 'line' | 'title';
    characterId: string; // 'scene' or stringified number
    descriptor: string;
    text: string;
}

let projects: Project[] = [];
let characters: Character[] = [];
let openDictionaryCallback: (project: Project) => void = () => {};

let scriptLines: ScriptLine[] = [];
let dragSourceId: string | null = null;

// DOM Elements
let nameInput: HTMLInputElement;
let projectSelect: HTMLSelectElement;
let dictionaryBtn: HTMLButtonElement;
let importBtn: HTMLButtonElement;
let importInput: HTMLInputElement;
let saveBtn: HTMLButtonElement;
let linesContainer: HTMLElement;
let addLineBtn: HTMLButtonElement;
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
    projectSelect = document.getElementById('vp-script-project-select') as HTMLSelectElement;
    dictionaryBtn = document.getElementById('vp-script-dictionary-btn') as HTMLButtonElement;
    importBtn = document.getElementById('vp-script-import-btn') as HTMLButtonElement;
    importInput = document.getElementById('vp-script-import-input') as HTMLInputElement;
    saveBtn = document.getElementById('vp-script-save-btn') as HTMLButtonElement;
    linesContainer = document.getElementById('vp-script-lines') as HTMLElement;
    addLineBtn = document.getElementById('vp-script-add-line-btn') as HTMLButtonElement;
    addTitleBtn = document.getElementById('vp-script-add-title-btn') as HTMLButtonElement;

    if (!nameInput) return;

    projectSelect.addEventListener('change', handleProjectChange);
    dictionaryBtn.addEventListener('click', openDictionary);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);
    addLineBtn.addEventListener('click', () => addLine('line'));
    addTitleBtn.addEventListener('click', () => addLine('title'));
    saveBtn.addEventListener('click', saveScript);

    refreshScriptView(projects, characters);
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

function handleProjectChange() {
    const projectId = projectSelect.value;
    if (projectId !== 'none') {
        dictionaryBtn.classList.remove('hidden');
    } else {
        dictionaryBtn.classList.add('hidden');
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
    
    const projectId = projectSelect.value;
    const availableCharacters = projectId === 'none' 
        ? characters 
        : characters.filter(c => c.projectId === parseInt(projectId));

    scriptLines.forEach((line, index) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'script-line-item';
        if (line.type === 'title') {
            lineEl.classList.add('script-title-card');
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
            });
            content.appendChild(titleInput);
            
            lineEl.appendChild(content);

        } else {
            const header = document.createElement('div');
            header.className = 'script-line-header';

            const charSelect = document.createElement('select');
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

            const textInput = document.createElement('textarea');
            textInput.value = line.text;
            textInput.rows = 1;
            textInput.style.resize = 'none';
            textInput.placeholder = line.characterId === 'scene' ? 'Describe the scene...' : 'Dialogue...';
            textInput.addEventListener('input', (e) => {
                line.text = (e.target as HTMLTextAreaElement).value;
            });
            
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
}

async function saveScript() {
    const name = nameInput.value.trim() || 'Untitled Script';
    
    const projectId = projectSelect.value;
    const availableCharacters = projectId === 'none' 
        ? characters 
        : characters.filter(c => c.projectId === parseInt(projectId));

    const zip = new JSZip();

    const metadata = {
        name: name,
        projectId: projectId === 'none' ? null : parseInt(projectId),
        lines: scriptLines
    };
    zip.file('script.json', JSON.stringify(metadata, null, 2));

    let txtContent = '';
    let mdContent = '';

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

        nameInput.value = data.name || '';
        
        if (data.projectId && projects.some(p => p.id === data.projectId)) {
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
