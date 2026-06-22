import { Character } from '../types.js';
import { saveImageBlob, getImageBlob } from '../services/indexeddb.js';

export async function migrateLegacyArtwork(characters: Character[]): Promise<boolean> {
    let migrated = false;
    
    for (const char of characters) {
        if (char.artwork && char.artwork.startsWith('data:')) {
            try {
                const res = await fetch(char.artwork);
                const blob = await res.blob();
                const id = await saveImageBlob(blob);
                char.artworkId = id;
                char.artwork = undefined; // Will be set to object URL below
                migrated = true;
            } catch (e) {
                console.warn("Failed to migrate artwork for", char.name, e);
            }
        }
        
        if (char.artworkId && (!char.artwork || char.artwork.startsWith('blob:'))) {
            try {
                const blob = await getImageBlob(char.artworkId);
                if (blob) {
                    char.artwork = URL.createObjectURL(blob);
                    migrated = true;
                }
            } catch (e) {
                console.warn("Failed to load artwork blob for", char.name, e);
            }
        }

        if (char.moodboardMedia) {
            for (const media of char.moodboardMedia) {
                if (media.type === 'image' && media.urlOrId && (!media.objectUrl || media.objectUrl.startsWith('blob:'))) {
                    try {
                        const blob = await getImageBlob(media.urlOrId);
                        if (blob) {
                            media.objectUrl = URL.createObjectURL(blob);
                            migrated = true;
                        }
                    } catch (e) {
                        console.warn("Failed to load moodboard blob", e);
                    }
                }
            }
        }
    }
    
    return migrated;
}
