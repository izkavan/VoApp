export function initializeNavigation() {
    const navLinks = document.querySelectorAll('#main-nav a');
    const views = document.querySelectorAll('.view');

    const navCharacterLibrary = document.getElementById('nav-character-library');
    const navVoiceActors = document.getElementById('nav-voice-actors');
    const navDungeonMaster = document.getElementById('nav-dungeon-master');
    const navUtilities = document.getElementById('nav-utilities');
    const navSettings = document.getElementById('nav-settings');

    const characterLibraryView = document.getElementById('character-library-view');
    const voiceActorView = document.getElementById('voice-actor-view');
    const dungeonMasterView = document.getElementById('dungeon-master-view');
    const utilityView = document.getElementById('utility-view');
    const settingsView = document.getElementById('settings-view');

    const showView = (viewToShow: HTMLElement) => {
        views.forEach(view => (view as HTMLElement).classList.add('hidden'));
        viewToShow.classList.remove('hidden');
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const id = link.id;
            if (id === 'nav-character-library' && characterLibraryView) {
                showView(characterLibraryView);
            } else if (id === 'nav-voice-actors' && voiceActorView) {
                showView(voiceActorView);
            } else if (id === 'nav-dungeon-master' && dungeonMasterView) {
                showView(dungeonMasterView);
            } else if (id === 'nav-utilities' && utilityView) {
                showView(utilityView);
            } else if (id === 'nav-settings' && settingsView) {
                showView(settingsView);
            }
        });
    });
}
