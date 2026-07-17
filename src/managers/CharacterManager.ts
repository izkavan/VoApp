import { Character } from "../types.js";
import {
  saveImageBlob,
  deleteImageBlob,
  getJournalEntries,
  deleteJournalEntry,
  getEffects,
  updateEffect,
} from "../services/indexeddb.js";
import { DataStore } from "../services/DataStore.js";
import { closeModal } from "../components/character-modal.js";
import { EventBus } from "../services/EventBus.js";

/**
 * Manager class responsible for handling complex character business logic.
 * Orchestrates file processing (image/audio base64 encoding), IndexedDB interactions,
 * and updates the central DataStore.
 */
export class AppCharacterManager {
  /**
   * Saves a character. Handles converting the artwork and voice samples into base64 strings
   * or saving them to IndexedDB depending on their size/type before updating the DataStore.
   * @param character The character object to save or update.
   * @param artworkFile Optional File object for the character's artwork.
   * @param sampleFile Optional File object for a pre-recorded audio sample.
   * @param recordedSample Optional base64 string for an on-the-fly recorded sample.
   */
  async saveCharacter(
    character: Character,
    artworkFile?: File,
    sampleFile?: File,
    recordedSample?: string,
  ) {
    const readFileAsDataURL = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    if (recordedSample) {
      character.voice_sample = recordedSample;
    } else if (sampleFile) {
      character.voice_sample = await readFileAsDataURL(sampleFile);
    }

    try {
      if (artworkFile) {
        if (character.artworkId) {
          await deleteImageBlob(character.artworkId).catch((e) =>
            console.warn(e),
          );
        }
        const id = await saveImageBlob(artworkFile);
        character.artworkId = id;
        character.artworkFilename = artworkFile.name;
        character.artwork = URL.createObjectURL(artworkFile);
      }

      const characters = DataStore.getCharacters();
      const existingIndex = characters.findIndex((c) => c.id === character.id);

      if (existingIndex > -1) {
        DataStore.updateCharacter(character);
      } else {
        DataStore.addCharacter(character);
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save character media:", error);
      EventBus.emit("notify", {
        message: "Failed to save character artwork. Your storage may be full.",
        type: "error",
      });
    }
  }

  /**
   * Duplicates an existing character, generating a new ID and appending "(Copy)" to the name.
   * @param characterToDuplicate The character to clone.
   */
  duplicateCharacter(characterToDuplicate: Character) {
    const newCharacter: Character = {
      ...characterToDuplicate,
      id: Date.now(),
      name: `${characterToDuplicate.name} (Copy)`,
    };
    DataStore.addCharacter(newCharacter);
    closeModal();
  }

  /**
   * Prompts the user for confirmation, then deletes a character and purges any
   * associated heavy media (like artwork) from IndexedDB. Also cascade deletes JournalEntries and references.
   * @param characterId The ID of the character to delete.
   */
  async deleteCharacter(characterId: number) {
    if (
      confirm(
        "Are you sure you want to delete this character? All associated journal entries will be permanently deleted.",
      )
    ) {
      try {
        const characters = DataStore.getCharacters();
        const charToDelete = characters.find((c) => c.id === characterId);
        if (charToDelete?.artworkId) {
          await deleteImageBlob(charToDelete.artworkId).catch((e) =>
            console.warn(e),
          );
        }
        if (charToDelete?.moodboardMedia) {
          for (const media of charToDelete.moodboardMedia) {
            if (media.type === "image" && media.urlOrId) {
              await deleteImageBlob(media.urlOrId).catch((e) =>
                console.warn(e),
              );
            }
          }
        }

        // Cascade delete Journal Entries
        const journalEntries = await getJournalEntries(characterId);
        for (const entry of journalEntries) {
          await deleteJournalEntry(entry.id);
        }

        // Cleanup references in Warmups
        const warmups = DataStore.getWarmups();
        for (const warmup of warmups) {
          if (warmup.characterIds.includes(characterId)) {
            warmup.characterIds = warmup.characterIds.filter(
              (id) => id !== characterId,
            );
            DataStore.updateWarmup(warmup.id, warmup);
          }
        }

        // Cleanup references in Effects
        const effects = await getEffects();
        for (const effect of effects) {
          if (effect.characterIds.includes(characterId)) {
            effect.characterIds = effect.characterIds.filter(
              (id) => id !== characterId,
            );
            await updateEffect(effect);
          }
        }

        DataStore.deleteCharacter(characterId);
        closeModal();
      } catch (error) {
        console.error("Failed to delete character dependencies:", error);
        EventBus.emit("notify", {
          message:
            "Failed to completely delete character. Storage error occurred.",
          type: "error",
        });
      }
    }
  }

  /**
   * Handles updating a character's project assignment when dragged and dropped in the UI.
   * @param characterId The ID of the dropped character.
   * @param projectId The ID of the project it was dropped into (undefined for "Unassigned").
   */
  onCharacterDrop(characterId: number, projectId?: number) {
    const characters = DataStore.getCharacters();
    const char = characters.find((c) => c.id === characterId);
    if (char) {
      char.projectId = projectId;
      DataStore.updateCharacter(char);
    }
  }
}

export const CharacterManager = new AppCharacterManager();
