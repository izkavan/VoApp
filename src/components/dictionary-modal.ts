import { Project, DictionaryEntry } from '../types.js';
import { getDictionaryEntries, saveDictionaryEntries, deleteDictionaryEntry } from '../services/indexeddb.js';

let modalElement: HTMLElement;
let modalContentElement: HTMLElement;
let currentProject: Project | null = null;
let currentEntries: DictionaryEntry[] = [];
let ipaPopup: HTMLElement | null = null;
let activePhoneticInput: HTMLInputElement | null = null;
let ipaTooltip: HTMLElement | null = null;

const ipaSymbols = [
    // Plosives
    { s: 'p', e: '<b>p</b>en' }, { s: 'b', e: '<b>b</b>ad' }, { s: 't', e: '<b>t</b>ea' }, { s: 'd', e: '<b>d</b>id' },
    { s: 'k', e: '<b>c</b>at' }, { s: 'ɡ', e: '<b>g</b>et' }, { s: 'q', e: '<b>q</b>alb (Arabic)' }, { s: 'ʔ', e: 'uh<b>-</b>oh' },
    
    // Fricatives 1
    { s: 'f', e: '<b>f</b>all' }, { s: 'v', e: '<b>v</b>an' }, { s: 'θ', e: '<b>th</b>in' }, { s: 'ð', e: '<b>th</b>en' },
    { s: 's', e: '<b>s</b>o' }, { s: 'z', e: '<b>z</b>oo' }, { s: 'ʃ', e: '<b>sh</b>oe' }, { s: 'ʒ', e: 'vi<b>s</b>ion' },
    
    // Fricatives 2
    { s: 'x', e: 'Ba<b>ch</b> (German)' }, { s: 'ɣ', e: 'a<b>g</b>ua (Spanish)' }, { s: 'χ', e: 'a<b>ch</b>t (German)' }, { s: 'ʁ', e: 'pa<b>r</b>is (French)' },
    { s: 'ħ', e: '<b>h</b>ammām (Arabic)' }, { s: 'ʕ', e: '<b>‘</b>ayn (Arabic)' }, { s: 'h', e: '<b>h</b>at' }, { s: 'ç', e: 'i<b>ch</b> (German)' },
    
    // Nasals & Liquids
    { s: 'm', e: '<b>m</b>an' }, { s: 'n', e: '<b>n</b>o' }, { s: 'ɲ', e: 'a<b>gn</b>eau (French)' }, { s: 'ŋ', e: 'si<b>ng</b>' },
    { s: 'l', e: '<b>l</b>eg' }, { s: 'r', e: 'pe<b>rr</b>o (Spanish)' }, { s: 'ʀ', e: '<b>r</b>ouge (French)' }, { s: 'ɾ', e: 'be<b>tt</b>er' },
    
    // Approximants & Affricates
    { s: 'j', e: '<b>y</b>es' }, { s: 'w', e: '<b>w</b>e' }, { s: 'ɥ', e: 'n<b>u</b>it (French)' }, { s: '', e: '' },
    { s: 'tʃ', e: '<b>ch</b>ain' }, { s: 'dʒ', e: '<b>j</b>am' }, { s: '', e: '' }, { s: '', e: '' },
    
    // Front Vowels
    { s: 'i', e: 's<b>ee</b>' }, { s: 'ɪ', e: 'b<b>i</b>t' }, { s: 'y', e: 't<b>u</b> (French)' }, { s: 'ʏ', e: 'm<b>ü</b>ssen (German)' },
    { s: 'e', e: 'caf<b>é</b> (French)' }, { s: 'ø', e: 'p<b>eu</b> (French)' }, { s: 'ɛ', e: 'b<b>e</b>d' }, { s: 'œ', e: 's<b>œu</b>r (French)' },
    { s: 'æ', e: 'c<b>a</b>t' }, { s: 'a', e: 'p<b>a</b>tte (French)' }, { s: '', e: '' }, { s: '', e: '' },
    
    // Back Vowels
    { s: 'u', e: 'bl<b>ue</b>' }, { s: 'ʊ', e: 'p<b>u</b>t' }, { s: 'o', e: 'eau (French)' }, { s: 'ɔ', e: 'th<b>ou</b>ght' },
    { s: 'ɑ', e: 'f<b>a</b>ther' }, { s: 'ɒ', e: 'n<b>o</b>t (British)' }, { s: '', e: '' }, { s: '', e: '' },
    
    // Central & Nasal Vowels
    { s: 'ə', e: '<b>a</b>bout' }, { s: 'ʌ', e: 'c<b>u</b>p' }, { s: 'ɜ', e: 'b<b>ir</b>d' }, { s: 'ɐ', e: 'bess<b>er</b> (German)' },
    { s: 'ã', e: 's<b>an</b>s (French)' }, { s: 'ɛ̃', e: 'v<b>in</b> (French)' }, { s: 'œ̃', e: 'br<b>un</b> (French)' }, { s: 'ɔ̃', e: 'b<b>on</b> (French)' },
    
    // Suprasegmentals
    { s: 'ˈ', e: '<b>Pri</b>mary stress' }, { s: 'ˌ', e: '<b>Sec</b>ondary stress' }, { s: 'ː', e: 'Long (e.g. sh<b>oe</b>)' }, { s: 'ˑ', e: 'Half-long' },
    { s: '.', e: 'Syllable break' }, { s: '', e: '' }, { s: '', e: '' }, { s: '', e: '' }
];

export function initializeDictionaryModal(modalEl: HTMLElement, contentEl: HTMLElement) {
    modalElement = modalEl;
    modalContentElement = contentEl;
    
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) closeDictionaryModal();
    });

    const closeBtn = document.getElementById('dictionary-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDictionaryModal);
    
    // Create IPA Popup if it doesn't exist
    if (!document.getElementById('ipa-popup')) {
        ipaPopup = document.createElement('div');
        ipaPopup.id = 'ipa-popup';
        ipaPopup.style.position = 'absolute';
        ipaPopup.style.display = 'none';
        ipaPopup.style.background = 'var(--bg-color, #fff)';
        ipaPopup.style.border = '1px solid var(--border-color, #ccc)';
        ipaPopup.style.borderRadius = '4px';
        ipaPopup.style.padding = '8px';
        ipaPopup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        ipaPopup.style.zIndex = '10000';
        ipaPopup.style.width = '340px';
        ipaPopup.style.display = 'grid';
        ipaPopup.style.gridTemplateColumns = 'repeat(8, 1fr)';
        ipaPopup.style.gap = '5px';
        
        ipaTooltip = document.createElement('div');
        ipaTooltip.className = 'ipa-tooltip';
        ipaTooltip.style.position = 'absolute';
        ipaTooltip.style.display = 'none';
        ipaTooltip.style.background = 'var(--gray-900)';
        ipaTooltip.style.color = 'var(--gray-100)';
        ipaTooltip.style.padding = '4px 8px';
        ipaTooltip.style.borderRadius = '4px';
        ipaTooltip.style.fontSize = '0.9rem';
        ipaTooltip.style.zIndex = '10001';
        ipaTooltip.style.pointerEvents = 'none';
        ipaTooltip.style.whiteSpace = 'nowrap';
        document.body.appendChild(ipaTooltip);
        
        ipaSymbols.forEach(item => {
            const sym = item.s;
            const example = item.e;
            
            if (sym === '') {
                // Empty placeholder cell to maintain grid structure
                const div = document.createElement('div');
                ipaPopup?.appendChild(div);
                return;
            }
            
            const btn = document.createElement('button');
            btn.textContent = sym;
            btn.className = 'ipa-btn';
            btn.style.padding = '4px 0';
            btn.style.background = 'var(--bg-color-light, #f0f0f0)';
            btn.style.border = '1px solid var(--border-color, #ccc)';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '1.1em';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'center';
            btn.style.alignItems = 'center';
            
            btn.addEventListener('mouseenter', (e) => {
                if (ipaTooltip) {
                    ipaTooltip.innerHTML = example;
                    const rect = btn.getBoundingClientRect();
                    ipaTooltip.style.top = (rect.top + window.scrollY - 30) + 'px';
                    ipaTooltip.style.left = (rect.left + window.scrollX + (rect.width / 2)) + 'px';
                    ipaTooltip.style.transform = 'translateX(-50%)';
                    ipaTooltip.style.display = 'block';
                }
            });
            
            btn.addEventListener('mouseleave', () => {
                if (ipaTooltip) ipaTooltip.style.display = 'none';
            });
            
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent losing focus on the input
                if (activePhoneticInput) {
                    const start = activePhoneticInput.selectionStart || 0;
                    const end = activePhoneticInput.selectionEnd || 0;
                    const val = activePhoneticInput.value;
                    
                    activePhoneticInput.value = val.substring(0, start) + sym + val.substring(end);
                    activePhoneticInput.selectionStart = activePhoneticInput.selectionEnd = start + sym.length;
                    
                    // Dispatch input event to update model
                    activePhoneticInput.dispatchEvent(new Event('input'));
                }
            });
            ipaPopup?.appendChild(btn);
        });
        
        document.body.appendChild(ipaPopup);
        
        // Hide popup when clicking outside
        document.addEventListener('mousedown', (e) => {
            const target = e.target as Node;
            if (ipaPopup && !ipaPopup.contains(target) && activePhoneticInput !== target && !(target instanceof Element && target.closest('.dict-ipa-toggle-btn'))) {
                ipaPopup.style.display = 'none';
                if (ipaTooltip) ipaTooltip.style.display = 'none';
                activePhoneticInput = null;
            }
        });
    } else {
        ipaPopup = document.getElementById('ipa-popup');
        if (ipaPopup) ipaPopup.style.display = 'none';
        if (ipaTooltip) ipaTooltip.style.display = 'none';
    }
}

export async function openDictionaryModal(project: Project) {
    currentProject = project;
    currentEntries = await getDictionaryEntries(project.id);
    renderModal();
    modalElement.classList.remove('hidden');
}

export function closeDictionaryModal() {
    modalElement.classList.add('hidden');
    currentProject = null;
    if (ipaPopup) ipaPopup.style.display = 'none';
    if (ipaTooltip) ipaTooltip.style.display = 'none';
}

function renderModal() {
    if (!currentProject) return;

    modalContentElement.innerHTML = `
        <h2>Dictionary: ${currentProject.name}</h2>
        <div class="dictionary-grid dictionary-header">
            <div>Word</div>
            <div>Phonetic</div>
            <div>Meaning</div>
            <div>Audio</div>
            <div></div>
        </div>
        <div id="dictionary-entries"></div>
        <button id="add-dictionary-entry" class="dictionary-add-btn">+</button>
        <div class="modal-footer" style="margin-top: 15px; justify-content: flex-start;">
            <button id="save-dictionary-btn">Save</button>
        </div>
    `;

    const entriesContainer = document.getElementById('dictionary-entries');
    if (entriesContainer) {
        currentEntries.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = 'dictionary-grid dictionary-row';
            
            row.innerHTML = `
                <input type="text" class="dict-word" value="${entry.word.replace(/"/g, '&quot;')}" placeholder="Word" />
                <div style="position: relative; display: flex; align-items: center;">
                    <input type="text" class="dict-phonetic" value="${entry.phonetic.replace(/"/g, '&quot;')}" placeholder="Phonetic" style="width: 100%; padding-right: 36px;" />
                    <button class="dict-ipa-toggle-btn" title="IPA Keyboard">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                    </button>
                </div>
                <input type="text" class="dict-meaning" value="${entry.meaning.replace(/"/g, '&quot;')}" placeholder="Meaning" />
                <div class="dict-audio-container" style="display: flex; gap: 5px;">
                    ${entry.audioData 
                        ? `<audio controls controlsList="nodownload" src="${entry.audioData}" style="width: 150px; height: 30px;"></audio>
                           <button class="dict-rerecord-btn" data-index="${index}" title="Re-record" style="font-size: 1.2rem; background: none; border: none; cursor: pointer;">🔄</button>`
                        : `<button class="dict-record-btn" data-index="${index}">Record (3s)</button>`}
                </div>
                <button class="dict-delete-btn" data-index="${index}" style="color: var(--danger-color); background: none; border: none; cursor: pointer; font-size: 1.2rem;">🗑️</button>
            `;
            entriesContainer.appendChild(row);
        });
    }

    // Attach row events
    document.querySelectorAll('.dict-word').forEach((el, i) => el.addEventListener('input', (e) => currentEntries[i].word = (e.target as HTMLInputElement).value));
    
    document.querySelectorAll('.dict-phonetic').forEach((el, i) => {
        const input = el as HTMLInputElement;
        input.addEventListener('input', (e) => currentEntries[i].phonetic = (e.target as HTMLInputElement).value);
    });

    document.querySelectorAll('.dict-ipa-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!ipaPopup) return;
            
            const buttonElement = e.currentTarget as HTMLElement;
            const input = buttonElement.previousElementSibling as HTMLInputElement;
            if (activePhoneticInput === input && ipaPopup.style.display === 'grid') {
                ipaPopup.style.display = 'none';
                activePhoneticInput = null;
                return;
            }

            activePhoneticInput = input;
            const rect = buttonElement.getBoundingClientRect();
            ipaPopup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            ipaPopup.style.left = (rect.left + window.scrollX - 250) + 'px'; // Shift left so it doesn't clip
            ipaPopup.style.display = 'grid';
        });
    });

    document.querySelectorAll('.dict-meaning').forEach((el, i) => el.addEventListener('input', (e) => currentEntries[i].meaning = (e.target as HTMLInputElement).value));
    
    document.querySelectorAll('.dict-delete-btn').forEach(btn => btn.addEventListener('click', async (e) => {
        const index = Number((e.currentTarget as HTMLElement).dataset.index);
        const entry = currentEntries[index];
        if (entry.id && !entry.id.startsWith('new_')) {
            await deleteDictionaryEntry(entry.id);
        }
        currentEntries.splice(index, 1);
        renderModal();
    }));

    const handleRecord = async (index: number, btn: HTMLElement) => {
        btn.textContent = 'Recording...';
        btn.setAttribute('disabled', 'true');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    currentEntries[index].audioData = reader.result as string;
                    renderModal();
                };
                reader.readAsDataURL(blob);
            };
            recorder.start();
            setTimeout(() => {
                recorder.stop();
                stream.getTracks().forEach(t => t.stop());
            }, 3000);
        } catch (e) {
            console.error("Mic access denied", e);
            btn.textContent = 'Error';
            btn.removeAttribute('disabled');
        }
    };

    document.querySelectorAll('.dict-record-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const index = Number((e.currentTarget as HTMLElement).dataset.index);
        handleRecord(index, e.currentTarget as HTMLElement);
    }));

    document.querySelectorAll('.dict-rerecord-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const index = Number((e.currentTarget as HTMLElement).dataset.index);
        handleRecord(index, e.currentTarget as HTMLElement);
    }));

    document.getElementById('add-dictionary-entry')?.addEventListener('click', () => {
        currentEntries.push({
            id: 'new_' + Date.now() + '_' + Math.random(),
            projectId: currentProject!.id,
            word: '',
            phonetic: '',
            meaning: ''
        });
        renderModal();
    });

    document.getElementById('save-dictionary-btn')?.addEventListener('click', async () => {
        // Clear pseudo IDs and ensure project IDs
        const finalEntries = currentEntries.map(e => {
            if (e.id.startsWith('new_')) {
                return { ...e, id: crypto.randomUUID() };
            }
            return e;
        });
        await saveDictionaryEntries(finalEntries);
        if (currentProject) {
            window.dispatchEvent(new CustomEvent('dictionaryUpdated', { detail: { projectId: currentProject.id } }));
        }
        closeDictionaryModal();
    });
}
