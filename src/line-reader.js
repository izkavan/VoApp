import { convertWebMToWav } from './audio-utils.js';
import JSZip from 'jszip';
export function initializeLineReader(characters, projects, settings, openCharacterModal) {
    const fileInput = document.getElementById('script-file-input');
    const scriptNameInput = document.getElementById('script-name-input');
    const projectSelect = document.getElementById('script-project-select');
    const filterSelect = document.getElementById('line-filter-select');
    const lineContainer = document.getElementById('line-container');
    const readContainer = document.getElementById('read-container');
    const readDetailsContainer = document.getElementById('read-details');
    const readButton = document.getElementById('read-button');
    const omitButton = document.getElementById('omit-button');
    const remitButton = document.getElementById('remit-button');
    const resetButton = document.getElementById('reset-button');
    const saveButton = document.getElementById('save-button');
    let selectedLine = null;
    let selectedReadLine = null;
    let lineDetails = new Map();
    let mediaRecorder = null;
    let audioChunks = [];
    // Populate Project Dropdown
    projectSelect.innerHTML = `<option value="">--Select Project--</option>${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}`;
    const getAvailableCharacters = () => {
        const selectedProjectId = projectSelect?.value ? Number(projectSelect.value) : undefined;
        if (selectedProjectId !== undefined && !isNaN(selectedProjectId)) {
            return characters.filter(c => c.projectId === selectedProjectId);
        }
        return characters;
    };
    const updateCharacterDropdowns = () => {
        const availableCharacters = getAvailableCharacters();
        if (filterSelect) {
            const currentFilter = filterSelect.value;
            filterSelect.innerHTML = `<option value="all">No Filter</option><option value="unassigned">Unassigned</option>${availableCharacters.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}`;
            if (Array.from(filterSelect.options).some(o => o.value === currentFilter)) {
                filterSelect.value = currentFilter;
            }
            else {
                filterSelect.value = 'all';
            }
        }
    };
    updateCharacterDropdowns();
    projectSelect?.addEventListener('change', () => {
        updateCharacterDropdowns();
        const availableCharacters = getAvailableCharacters();
        const availableIds = new Set(availableCharacters.map(c => c.id));
        lineDetails.forEach(detail => {
            if (detail.characterId !== undefined && !availableIds.has(detail.characterId)) {
                detail.characterId = undefined;
            }
        });
        if (selectedReadLine && selectedReadLine.textContent) {
            renderDetails(selectedReadLine.textContent);
        }
        updateLineContainerUI();
    });
    const updateLineContainerUI = () => {
        const filterValue = filterSelect?.value || 'all';
        [lineContainer, readContainer].forEach(container => {
            if (!container)
                return;
            Array.from(container.children).forEach(child => {
                const lineDiv = child;
                const lineText = lineDiv.getAttribute('data-line-text') || lineDiv.textContent || '';
                if (!lineDiv.hasAttribute('data-line-text')) {
                    lineDiv.setAttribute('data-line-text', lineText);
                }
                const detail = lineDetails.get(lineText);
                const charId = detail?.characterId;
                let visible = true;
                if (filterValue !== 'all') {
                    if (filterValue === 'unassigned') {
                        visible = (charId === undefined || isNaN(charId));
                    }
                    else {
                        visible = (charId === Number(filterValue));
                    }
                }
                lineDiv.style.display = visible ? 'flex' : 'none';
                if (lineDiv.classList.contains('read') && charId !== undefined && !isNaN(charId)) {
                    const char = characters.find(c => c.id === charId);
                    if (char && char.artwork) {
                        let img = lineDiv.querySelector('.line-character-icon');
                        if (!img) {
                            lineDiv.innerHTML = `<span class="line-entry-text">${lineText}</span><img class="line-character-icon" src="${char.artwork}">`;
                        }
                        else {
                            img.src = char.artwork;
                        }
                    }
                    else {
                        lineDiv.innerHTML = `<span class="line-entry-text">${lineText}</span>`;
                    }
                }
                else {
                    if (lineDiv.querySelector('.line-character-icon') || lineDiv.querySelector('.line-entry-text')) {
                        lineDiv.textContent = lineText;
                    }
                }
            });
        });
    };
    filterSelect?.addEventListener('change', updateLineContainerUI);
    const renderDetails = (lineText) => {
        if (!readDetailsContainer)
            return;
        const details = lineDetails.get(lineText);
        if (!details)
            return;
        const associatedCharacter = characters.find(c => c.id === details.characterId);
        const artworkImage = associatedCharacter?.artwork
            ? `<img id="line-character-art" class="character-art-preview" src="${associatedCharacter.artwork}" />`
            : `<div id="line-character-art" class="character-art-preview"></div>`;
        readDetailsContainer.innerHTML = `
            <label for="line-name-input">Line Name:</label>
            <input type="text" id="line-name-input" value="${details.lineName}" />
            <div class="character-selector">
                <select id="line-character-select">
                    <option value="">--Select Character--</option>
                    ${getAvailableCharacters().map(c => `<option value="${c.id}" ${c.id === details.characterId ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                ${artworkImage}
            </div>
            <button id="record-take-button" class="record-button">●</button>
            <ul id="takes-list" class="takes-list">
                ${details.takes.map((take, index) => `
                <li class="take-item" data-index="${index}">
                    <input type="text" class="take-title-input" placeholder="Take title..." value="${(take.title || '').replace(/"/g, '&quot;')}" />
                    <div class="take-audio-controls">
                        <audio controls controlsList="nodownload" src="${take.audioData}"></audio>
                        <span class="download-take" title="Download Take">⬇️</span>
                        <span class="delete-take">🗑️</span>
                    </div>
                    <div class="take-metadata">
                        <div class="star-rating">
                            ${[1, 2, 3, 4, 5].map(star => `<span class="star ${star <= take.rating ? 'active' : ''}" data-value="${star}">★</span>`).join('')}
                        </div>
                        <input type="text" class="take-note-input" placeholder="Take notes..." value="${take.notes.replace(/"/g, '&quot;')}" />
                    </div>
                </li>
                `).join('')}
            </ul>
            <textarea id="line-notes" class="notes-area" placeholder="Notes...">${details.notes}</textarea>
        `;
        document.getElementById('line-name-input')?.addEventListener('input', (e) => { details.lineName = e.target.value; });
        document.getElementById('record-take-button')?.addEventListener('click', toggleRecording);
        document.getElementById('line-character-select')?.addEventListener('change', (e) => {
            details.characterId = Number(e.target.value);
            renderDetails(lineText);
            updateLineContainerUI();
        });
        document.getElementById('line-character-art')?.addEventListener('click', () => { if (associatedCharacter)
            openCharacterModal(associatedCharacter); });
        document.getElementById('line-notes')?.addEventListener('input', (e) => { details.notes = e.target.value; });
        document.querySelectorAll('.delete-take').forEach(btn => btn.addEventListener('click', (e) => {
            const index = Number(e.currentTarget.closest('.take-item')?.getAttribute('data-index'));
            details.takes.splice(index, 1);
            renderDetails(lineText);
        }));
        document.querySelectorAll('.download-take').forEach(btn => btn.addEventListener('click', async (e) => {
            const index = Number(e.currentTarget.closest('.take-item')?.getAttribute('data-index'));
            const take = details.takes[index];
            const a = document.createElement('a');
            const safeTitle = (take.title || `take_${index + 1}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            if (settings.exportFormat === 'wav') {
                const wavBlob = await convertWebMToWav(take.audioData);
                a.href = URL.createObjectURL(wavBlob);
                a.download = `${safeTitle}.wav`;
            }
            else {
                a.href = take.audioData;
                a.download = `${safeTitle}.webm`;
            }
            a.click();
        }));
        document.querySelectorAll('.take-note-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number(e.currentTarget.closest('.take-item')?.getAttribute('data-index'));
            details.takes[index].notes = e.target.value;
        }));
        document.querySelectorAll('.star').forEach(star => star.addEventListener('click', (e) => {
            const index = Number(e.currentTarget.closest('.take-item')?.getAttribute('data-index'));
            const rating = Number(e.currentTarget.getAttribute('data-value'));
            details.takes[index].rating = rating;
            renderDetails(lineText);
        }));
        document.querySelectorAll('.take-title-input').forEach(input => input.addEventListener('input', (e) => {
            const index = Number(e.currentTarget.closest('.take-item')?.getAttribute('data-index'));
            details.takes[index].title = e.target.value;
        }));
    };
    const selectLine = (lineDiv, isReadLine) => {
        const container = isReadLine ? selectedReadLine : selectedLine;
        const setter = (val) => isReadLine ? (selectedReadLine = val) : (selectedLine = val);
        if (container === lineDiv) {
            container.classList.remove('selected');
            setter(null);
            if (isReadLine && readDetailsContainer)
                readDetailsContainer.innerHTML = '';
        }
        else {
            if (container)
                container.classList.remove('selected');
            setter(lineDiv);
            lineDiv.classList.add('selected');
            if (isReadLine)
                renderDetails(lineDiv.textContent || '');
        }
    };
    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    const toggleRecording = async () => {
        const recordButton = document.getElementById('record-take-button');
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordButton?.classList.remove('recording');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.start();
            recordButton?.classList.add('recording');
            mediaRecorder.addEventListener("dataavailable", event => audioChunks.push(event.data));
            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const base64Audio = await blobToBase64(audioBlob);
                const lineText = selectedReadLine?.textContent;
                if (lineText) {
                    const details = lineDetails.get(lineText);
                    if (details) {
                        details.takes.unshift({ audioData: base64Audio, rating: 0, notes: '', title: '' });
                        renderDetails(lineText);
                    }
                }
                stream.getTracks().forEach(track => track.stop());
            });
        }
        catch (err) {
            console.error("Error during recording:", err);
            alert("Could not start recording. Please ensure you have granted microphone permissions.");
        }
    };
    const resetUI = () => {
        [lineContainer, readContainer, readDetailsContainer].forEach(c => c && (c.innerHTML = ''));
        if (scriptNameInput)
            scriptNameInput.value = '';
        if (projectSelect)
            projectSelect.value = '';
        selectedLine = null;
        selectedReadLine = null;
        lineDetails.clear();
    };
    const loadScriptFromTxt = (file) => {
        resetUI();
        if (scriptNameInput)
            scriptNameInput.value = file.name.replace(/\.[^/.]+$/, "");
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!lineContainer)
                return;
            const lines = (e.target?.result).split(/\r?\n/);
            lines.forEach(lineText => {
                if (lineText.trim() !== '') {
                    const lineDiv = document.createElement('div');
                    lineDiv.textContent = lineText;
                    lineDiv.className = 'line-entry';
                    lineDiv.addEventListener('click', () => selectLine(lineDiv, false));
                    lineContainer.appendChild(lineDiv);
                }
            });
            updateLineContainerUI();
        };
        reader.readAsText(file);
    };
    const loadScriptFromZip = async (file) => {
        resetUI();
        if (scriptNameInput)
            scriptNameInput.value = file.name.replace(/\.zip$/, "");
        try {
            const zip = await JSZip.loadAsync(file);
            const scriptFile = zip.file('script.json');
            if (!scriptFile) {
                alert('Invalid script file: script.json not found.');
                return;
            }
            const scriptData = JSON.parse(await scriptFile.async('string'));
            if (projectSelect && scriptData.projectId) {
                projectSelect.value = String(scriptData.projectId);
            }
            scriptData.lines.forEach(lineInfo => {
                const lineDiv = document.createElement('div');
                lineDiv.textContent = lineInfo.text;
                lineDiv.className = 'line-entry';
                if (lineInfo.status !== 'normal')
                    lineDiv.classList.add(lineInfo.status);
                lineDiv.addEventListener('click', () => selectLine(lineDiv, false));
                lineContainer?.appendChild(lineDiv);
                if (lineInfo.status === 'read') {
                    const readLineDiv = document.createElement('div');
                    readLineDiv.textContent = lineInfo.text;
                    readLineDiv.className = 'line-entry';
                    readLineDiv.addEventListener('click', () => selectLine(readLineDiv, true));
                    readContainer?.appendChild(readLineDiv);
                }
            });
            for (const savedDetail of scriptData.lineDetails) {
                const loadedTakes = [];
                for (const savedTake of (savedDetail.takes || [])) {
                    const takeFile = zip.file(savedTake.path);
                    if (takeFile) {
                        const blob = await takeFile.async('blob');
                        loadedTakes.push({
                            audioData: await blobToBase64(blob),
                            rating: savedTake.rating,
                            notes: savedTake.notes,
                            title: savedTake.title || ''
                        });
                    }
                }
                lineDetails.set(savedDetail.text, { ...savedDetail, takes: loadedTakes });
            }
            if (projectSelect)
                projectSelect.dispatchEvent(new Event('change'));
            updateLineContainerUI();
        }
        catch (error) {
            console.error("Error loading script from zip:", error);
            alert("Failed to load script. The file may be corrupted or in the wrong format.");
        }
    };
    fileInput.addEventListener('change', (event) => {
        const target = event.target;
        if (!target.files)
            return;
        const file = target.files[0];
        if (file.name.endsWith('.zip')) {
            loadScriptFromZip(file);
        }
        else {
            loadScriptFromTxt(file);
        }
    });
    readButton?.addEventListener('click', () => {
        if (selectedLine) {
            selectedLine.classList.remove('omitted');
            selectedLine.classList.add('read');
            if (readContainer) {
                const lineText = selectedLine.textContent || '';
                if (!Array.from(readContainer.children).some(child => child.textContent === lineText)) {
                    const readLineDiv = document.createElement('div');
                    readLineDiv.textContent = lineText;
                    readLineDiv.className = 'line-entry';
                    readLineDiv.addEventListener('click', () => selectLine(readLineDiv, true));
                    readContainer.appendChild(readLineDiv);
                    if (!lineDetails.has(lineText)) {
                        const defaultLineName = lineText.split(' ').slice(0, 3).join('_');
                        lineDetails.set(lineText, { text: lineText, lineName: defaultLineName, notes: '', takes: [] });
                    }
                }
            }
            updateLineContainerUI();
        }
    });
    saveButton?.addEventListener('click', async () => {
        const zip = new JSZip();
        // Use custom root path from settings, defaulting to 'audio'
        const rootPath = settings.audioExportPath || 'audio';
        const audioFolder = zip.folder(rootPath);
        if (!audioFolder)
            return;
        const readLinesDetails = Array.from(lineDetails.values());
        const nameCounts = new Map();
        readLinesDetails.forEach(d => nameCounts.set(d.lineName, (nameCounts.get(d.lineName) || 0) + 1));
        const duplicates = [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
        if (duplicates.length > 0) {
            alert(`Save failed. Duplicate line names found:\n- ${duplicates.join('\n- ')}`);
            return;
        }
        const jsonLineDetails = [];
        let hasAudio = false;
        for (const detail of readLinesDetails) {
            let targetFolder = audioFolder;
            if (settings.scriptExportGrouping === 'character') {
                const char = characters.find(c => c.id === detail.characterId);
                const folderName = char ? char.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unassigned';
                targetFolder = audioFolder.folder(folderName) || audioFolder;
            }
            else {
                targetFolder = audioFolder.folder(detail.lineName) || audioFolder;
            }
            const jsonTakes = [];
            for (let i = 0; i < detail.takes.length; i++) {
                hasAudio = true;
                const take = detail.takes[i];
                const format = settings.exportFormat === 'wav' ? 'wav' : 'webm';
                let fileName = `${i + 1}.${format}`;
                if (settings.scriptExportGrouping === 'character') {
                    fileName = `${detail.lineName}_${i + 1}.${format}`;
                }
                // Path for JSON
                let path = `${rootPath}/${detail.lineName}/${fileName}`;
                if (settings.scriptExportGrouping === 'character') {
                    const char = characters.find(c => c.id === detail.characterId);
                    const folderName = char ? char.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Unassigned';
                    path = `${rootPath}/${folderName}/${fileName}`;
                }
                jsonTakes.push({ path, rating: take.rating, notes: take.notes, title: take.title });
                if (format === 'wav') {
                    const wavBlob = await convertWebMToWav(take.audioData);
                    targetFolder.file(fileName, wavBlob);
                }
                else {
                    const response = await fetch(take.audioData);
                    const blob = await response.blob();
                    targetFolder.file(fileName, blob);
                }
            }
            jsonLineDetails.push({ text: detail.text, lineName: detail.lineName, characterId: detail.characterId, notes: detail.notes, takes: jsonTakes });
        }
        const linesToSave = Array.from(lineContainer?.querySelectorAll('.line-entry') || []).map(line => {
            const status = line.classList.contains('read') ? 'read' : line.classList.contains('omitted') ? 'omitted' : 'normal';
            return { text: line.textContent || '', status: status };
        });
        const saveData = {
            projectId: parseInt(projectSelect.value) || undefined,
            lines: linesToSave,
            lineDetails: jsonLineDetails
        };
        if (hasAudio && settings.recordingGear) {
            saveData.recordingGear = settings.recordingGear;
        }
        zip.file('script.json', JSON.stringify(saveData, null, 2));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scriptNameInput.value.trim() || 'script_save'}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    omitButton?.addEventListener('click', () => { if (selectedLine) {
        selectedLine.classList.remove('read');
        selectedLine.classList.add('omitted');
        updateLineContainerUI();
    } });
    remitButton?.addEventListener('click', () => { if (selectedLine) {
        selectedLine.classList.remove('read', 'omitted');
        updateLineContainerUI();
    } });
    resetButton?.addEventListener('click', () => {
        const confirmed = confirm("Are you sure you want to reset? All line statuses, notes, and recorded audio takes for this script will be lost.");
        if (confirmed) {
            resetUI();
            updateLineContainerUI();
        }
    });
}
