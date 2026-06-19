import { Character } from './types.js';

const firstNames = [
    "Garrick", "Elara", "Thorgar", "Sylas", "Kael", "Lyra", "Jax", "Nova", 
    "Roland", "Isolde", "Orion", "Seraphina", "Darius", "Vesper", "Finn", 
    "Aria", "Cyrus", "Elowen", "Zane", "Luna", "Bram", "Calliope", "Rocco", 
    "Maeve", "Silas"
];

const lastNames = [
    "Featherfellow", "Ironhide", "Moonwhisper", "Starfall", "Shadowbrook", 
    "Stormrider", "Nightshade", "Lightbringer", "Frostbane", "Fireforge", 
    "Swiftfoot", "Heavyhand", "Silverleaf", "Blackwood", "Whitewater", 
    "Stonefist", "Windrunner", "Bloodgood", "Copperfield", "Goldwyn", 
    "Oakenbrand", "Ashdown", "Ironclad", "Winterbourne", "Summerset"
];

const archetypes = [
    "Boisterous", "Cunning", "Elderly", "Nervous", "Stoic", "Eccentric", 
    "Grumpy", "Optimistic", "Pessimistic", "Charming", "Awkward", "Fierce", 
    "Timid", "Arrogant", "Humble"
];

const jobs = [
    // Medieval
    "Blacksmith", "Wizard", "Tavern Keeper", "Town Guard", "Mercenary", 
    "Court Jester", "Alchemist", "Squire", "Thief", "Cleric",
    // Modern
    "Barista", "Software Engineer", "Uber Driver", "Police Officer", "CEO", 
    "Journalist", "Fitness Instructor", "Plumber", "Accountant", "Chef",
    // Futuristic
    "Space Smuggler", "Cyber-Doctor", "Hover-Taxi Driver", "AI Core Technician", 
    "Bounty Hunter", "Neon-Sign Mechanic", "Hacker", "Galactic Diplomat", 
    "Terraformer", "Asteroid Miner"
];

const vocalDescriptors = [
    "Deep", "Booming", "High", "Squeaky", "Raspy", "Slow", "Fast", 
    "Monotone", "Melodic", "Gruff", "Whispery", "Breathless", "Nasal", 
    "Guttural", "Smooth", "Silky", "Harsh", "Gravelly", "Sing-song", 
    "Stuttering", "Lisping", "Muffled", "Piercing", "Whiny", "Commanding", 
    "Hesitant", "Drawling", "Staccato", "Resonant", "Tinny"
];

function getRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

export function generateRandomCharacter(projectId: number | undefined): Character {
    const firstName = getRandom(firstNames);
    const lastName = getRandom(lastNames);
    const archetype = getRandom(archetypes);
    const job = getRandom(jobs);
    
    // Mix two vocal descriptors
    let voiceDesc1 = getRandom(vocalDescriptors);
    let voiceDesc2 = getRandom(vocalDescriptors);
    while (voiceDesc1 === voiceDesc2) {
        voiceDesc2 = getRandom(vocalDescriptors);
    }

    return {
        id: Date.now(),
        name: `${firstName} ${lastName}`,
        description: `${archetype} ${job}`,
        voice_description: `${voiceDesc1} and ${voiceDesc2.toLowerCase()}`,
        tags: [],
        projectId: projectId,
        pitch: Math.floor(Math.random() * 100) + 1,
        pace: Math.floor(Math.random() * 100) + 1,
        placement: Math.floor(Math.random() * 100) + 1,
        timbre: Math.floor(Math.random() * 100) + 1,
    };
}
