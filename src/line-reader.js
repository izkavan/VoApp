import JSZip from 'jszip';
export function initializeLineReader(characters, projects, openCharacterModal) {
    const fileInput = document.getElementById('script-file-input');
    const scriptNameInput = document.getElementById('script-name-input');
    const projectSelect = document.getElementById('script-project-select');
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
                    ${characters.map(c => `<option value="${c.id}" ${c.id === details.characterId ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                ${artworkImage}
            </div>
            <button id="record-take-button" class="record-button">●</button>
            <ul id="takes-list" class="takes-list">${details.takes.map((take, index) => `<li class="take-item" data-index="${index}"><audio controls src="${take}"></audio><span class="delete-take">🗑️</span></li>`).join('')}</ul>
            <textarea id="line-notes" class="notes-area" placeholder="Notes...">${details.notes}</textarea>
        `;
        document.getElementById('line-name-input')?.addEventListener('input', (e) => { details.lineName = e.target.value; });
        document.getElementById('record-take-button')?.addEventListener('click', toggleRecording);
        document.getElementById('line-character-select')?.addEventListener('change', (e) => {
            details.characterId = Number(e.target.value);
            renderDetails(lineText);
        });
        document.getElementById('line-character-art')?.addEventListener('click', () => { if (associatedCharacter)
            openCharacterModal(associatedCharacter); });
        document.getElementById('line-notes')?.addEventListener('input', (e) => { details.notes = e.target.value; });
        document.querySelectorAll('.delete-take').forEach(btn => btn.addEventListener('click', (e) => {
            const index = Number(e.currentTarget.parentElement?.dataset.index);
            details.takes.splice(index, 1);
            renderDetails(lineText);
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
                        details.takes.unshift(base64Audio);
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
                const takesAsBase64 = [];
                for (const path of savedDetail.takePaths) {
                    const takeFile = zip.file(path);
                    if (takeFile) {
                        const blob = await takeFile.async('blob');
                        takesAsBase64.push(await blobToBase64(blob));
                    }
                }
                lineDetails.set(savedDetail.text, { ...savedDetail, takes: takesAsBase64 });
            }
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
        }
    });
    saveButton?.addEventListener('click', async () => {
        const zip = new JSZip();
        const audioFolder = zip.folder('audio');
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
        for (const detail of readLinesDetails) {
            const lineFolder = audioFolder.folder(detail.lineName);
            if (!lineFolder)
                continue;
            const takePaths = [];
            for (let i = 0; i < detail.takes.length; i++) {
                const takeBase64 = detail.takes[i];
                const path = `audio/${detail.lineName}/${i + 1}.webm`;
                takePaths.push(path);
                const response = await fetch(takeBase64);
                const blob = await response.blob();
                lineFolder.file(`${i + 1}.webm`, blob);
            }
            jsonLineDetails.push({ text: detail.text, lineName: detail.lineName, characterId: detail.characterId, notes: detail.notes, takePaths: takePaths });
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
    } });
    remitButton?.addEventListener('click', () => { if (selectedLine) {
        selectedLine.classList.remove('read', 'omitted');
    } });
    resetButton?.addEventListener('click', resetUI);
}
