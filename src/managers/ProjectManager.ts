import { Project, Character } from "../types.js";
import { DataStore } from "../services/DataStore.js";
import { closeProjectModal } from "../components/project-modal.js";
import JSZip from "jszip";

import {
  getDictionaryEntries,
  deleteDictionaryEntry,
  getVoiceMemos,
  deleteVoiceMemos,
} from "../services/indexeddb.js";
import { EventBus } from "../services/EventBus.js";

/**
 * Manager class responsible for handling complex project-level business logic.
 * Orchestrates project deletions (and associated character unassignments) and
 * handles parsing robust ZIP files for project imports.
 */
export class AppProjectManager {
  /**
   * Prompts for confirmation, deletes a project from the DataStore, and safely
   * moves all associated characters to an "Unassigned" status. Also deletes associated dictionary entries and voice memos.
   * @param id The ID of the project to delete.
   */
  async deleteProject(id: number) {
    if (
      confirm(
        'Are you sure you want to delete this project? All associated characters will be safely moved to "Unassigned", and its dictionary entries and voice memos will be permanently deleted.',
      )
    ) {
      try {
        DataStore.deleteProject(id);

        // Move characters to unassigned
        const characters = DataStore.getCharacters();
        characters.forEach((c) => {
          if (c.projectId === id) {
            c.projectId = undefined;
            DataStore.updateCharacter(c);
          }
        });

        // Cascade delete Dictionary Entries
        const dictEntries = await getDictionaryEntries(id);
        for (const entry of dictEntries) {
          await deleteDictionaryEntry(entry.id);
        }

        // Cascade delete Voice Memos
        const voiceMemos = await getVoiceMemos();
        const memosToDelete = voiceMemos
          .filter((m) => m.projectId === id)
          .map((m) => m.id);
        await deleteVoiceMemos(memosToDelete);

        closeProjectModal();
      } catch (error) {
        console.error("Failed to delete project dependencies:", error);
        EventBus.emit("notify", {
          message:
            "Failed to completely delete project dependencies. Storage error occurred.",
          type: "error",
        });
      }
    }
  }

  /**
   * Unpacks a provided ZIP file representing a project export.
   * Parses the `project.json` and associated `character.json` files,
   * extracts media (artwork/voice samples) into base64, and populates the DataStore.
   * @param zipFile The raw ZIP File object selected by the user.
   */
  async importProject(zipFile: File) {
    try {
      const zip = await new JSZip().loadAsync(zipFile);
      const projectJsonFile = zip.file("project.json");
      if (!projectJsonFile) {
        alert("Invalid project file: project.json not found in the zip.");
        return;
      }

      const projectData: Project = JSON.parse(
        await projectJsonFile.async("string"),
      );

      const projects = DataStore.getProjects();
      if (projects.some((p) => p.name === projectData.name)) {
        if (
          !confirm(
            `A project with the name "${projectData.name}" already exists. Proceed with importing?`,
          )
        ) {
          return;
        }
      }

      const newProject: Project = { ...projectData, id: Date.now() };
      DataStore.addProject(newProject);

      const charactersFolder = zip.folder("characters");
      if (charactersFolder) {
        const characterJsonFiles = charactersFolder.filter((relativePath) =>
          relativePath.endsWith("character.json"),
        );

        for (const charJsonFile of characterJsonFiles) {
          const charData: Character = JSON.parse(
            await charJsonFile.async("string"),
          );
          const newCharacter: Character = {
            ...charData,
            id: Date.now(),
            projectId: newProject.id,
          };

          const charFolderPath = charJsonFile.name.substring(
            0,
            charJsonFile.name.lastIndexOf("/") + 1,
          );

          if (newCharacter.artworkFilename) {
            const artworkZipFile = zip.file(
              `${charFolderPath}${newCharacter.artworkFilename}`,
            );
            if (artworkZipFile) {
              const artworkBase64 = await artworkZipFile.async("base64");
              newCharacter.artwork = `data:image/png;base64,${artworkBase64}`;
            }
          }

          const voiceSampleZipFile = zip.file(
            `${charFolderPath}voice_sample.webm`,
          );
          if (voiceSampleZipFile) {
            const voiceBase64 = await voiceSampleZipFile.async("base64");
            newCharacter.voice_sample = `data:audio/webm;base64,${voiceBase64}`;
          }

          DataStore.addCharacter(newCharacter);
        }
      }

      alert(
        `Project "${newProject.name}" and its characters imported successfully!`,
      );
    } catch (error) {
      console.error("Error importing project:", error);
      alert(
        "Failed to import project. Please ensure it is a valid project zip file.",
      );
    }
  }
}

export const ProjectManager = new AppProjectManager();
