const navCharacterLibrary = document.getElementById('nav-character-library');
const navVoiceActors = document.getElementById('nav-voice-actors');
const characterLibraryView = document.getElementById('character-library-view');
const voiceActorView = document.getElementById('voice-actor-view');

export function initializeNavigation() {
    navCharacterLibrary?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('character-library');
    });

    navVoiceActors?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('voice-actors');
    });
}

function showView(viewName: 'character-library' | 'voice-actors') {
    characterLibraryView?.classList.toggle('hidden', viewName !== 'character-library');
    voiceActorView?.classList.toggle('hidden', viewName !== 'voice-actors');

    navCharacterLibrary?.classList.toggle('active', viewName === 'character-library');
    navVoiceActors?.classList.toggle('active', viewName !== 'character-library');
}
