import { Character, Project } from './types.js';

export function saveToLocalStorage(characters: Character[], projects: Project[]) {
    localStorage.setItem('vocalCharacters', JSON.stringify(characters));
    localStorage.setItem('vocalProjects', JSON.stringify(projects));
}

export function loadFromLocalStorage(): { characters: Character[], projects: Project[] } {
    const storedCharacters = localStorage.getItem('vocalCharacters');
    const storedProjects = localStorage.getItem('vocalProjects');

    let characters: Character[] = [];
    let projects: Project[] = [];

    if (storedCharacters) {
        characters = JSON.parse(storedCharacters);
    } else {
        characters = [
            { id: 1, name: 'Old Man Hemlock', description: 'A wise, ancient tree spirit.', voice_description: 'Slow, deep, and creaky.', tags: ['fantasy', 'old', 'male'], projectId: 1 },
            { id: 2, name: 'Sparky', description: 'A mischievous fire sprite.', voice_description: 'High-pitched and crackling.', tags: ['elemental', 'mischievous'] },
            { id: 3, name: 'Seraphina', description: 'A serene celestial being.', voice_description: 'Melodic and resonant.', tags: ['celestial', 'calm', 'female'], projectId: 1 }
        ];
    }

    if (storedProjects) {
        projects = JSON.parse(storedProjects);
    } else {
        projects = [
            { id: 1, name: 'Project Phoenix', description: 'A fantasy epic.', licensing: 'Creative Commons', startDate: '2023-01-01' }
        ];
    }

    return { characters, projects };
}
