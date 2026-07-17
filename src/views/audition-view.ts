import {
  Audition,
  Character,
  AuditionStatus,
  AuditionFile,
  SystemSettings,
} from "../types.js";
import JSZip from "jszip";
import { DataStore } from "../services/DataStore.js";
import { openEditAudioModal } from "./edit-audio-modal.js";
import { generateCharacterOptionsHTML } from "../utils/dom-utils.js";

let auditions: Audition[] = [];
let characters: Character[] = [];
let systemSettings: SystemSettings;
let saveCallback: (auditions: Audition[]) => void;
let saveSettingsCallback: (settings: SystemSettings) => void;

const STATUS_OPTIONS: AuditionStatus[] = [
  "Submitted",
  "Callback",
  "Booked",
  "Rejected",
  "Ghosted",
];
const INACTIVE_STATUSES: AuditionStatus[] = ["Rejected", "Ghosted"];

export function refreshAuditionView(newCharacters: Character[]) {
  characters = newCharacters;
  const charSelect = document.getElementById(
    "aud-character-select",
  ) as HTMLSelectElement;
  if (charSelect) {
    const currentVal = charSelect.value;
    charSelect.innerHTML =
      `<option value="">--Select Character--</option>` +
      generateCharacterOptionsHTML(characters);
    charSelect.value = currentVal;
  }
}

export function initializeAuditionView(
  initialAuditions: Audition[],
  initialCharacters: Character[],
  settings: SystemSettings,
  onSave: (auditions: Audition[]) => void,
  onSettingsSave: (settings: SystemSettings) => void,
) {
  auditions = initialAuditions;
  characters = initialCharacters;
  systemSettings = settings;
  saveCallback = onSave;
  saveSettingsCallback = onSettingsSave;

  document
    .getElementById("new-audition-button")
    ?.addEventListener("click", () => openAuditionModal());

  const collapsible = document.querySelector(".collapsible-header");
  collapsible?.addEventListener("click", () => {
    collapsible.classList.toggle("active");
    const content = collapsible.nextElementSibling as HTMLElement;
    content.style.display =
      content.style.display === "block" ? "none" : "block";
  });

  renderAuditionList();
}

function renderAuditionList() {
  const activeContainer = document.getElementById("active-audition-list");
  const inactiveContainer = document.getElementById("inactive-audition-list");
  if (!activeContainer || !inactiveContainer) return;

  const activeAuditions = auditions.filter(
    (a) => !INACTIVE_STATUSES.includes(a.status),
  );
  const inactiveAuditions = auditions.filter((a) =>
    INACTIVE_STATUSES.includes(a.status),
  );

  const renderCard = (audition: Audition) => `
        <div class="audition-card" data-id="${audition.id}">
            <div class="audition-card-info">
                <strong>${audition.projectName}</strong>
                <p>${audition.castingDirector.name}</p>
                <p>Due: ${audition.dueDate}</p>
            </div>
            <div class="audition-card-status" style="display: flex; flex-direction: column; gap: 5px; align-items: flex-end;">
                <select class="audition-status-dropdown" data-id="${audition.id}">
                    ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${audition.status === s ? "selected" : ""}>${s}</option>`).join("")}
                </select>
                <button class="export-audition-btn primary" data-id="${audition.id}" style="padding: 4px 8px; font-size: 0.85em;">Export for Casting</button>
            </div>
        </div>
    `;

  activeContainer.innerHTML = activeAuditions.map(renderCard).join("");
  inactiveContainer.innerHTML = inactiveAuditions.map(renderCard).join("");

  // Add event listeners for status changes and card clicks
  document.querySelectorAll(".audition-status-dropdown").forEach((el) => {
    el.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      const auditionId = Number(target.dataset.id);
      const newStatus = target.value as AuditionStatus;
      const audition = auditions.find((a) => a.id === auditionId);
      if (audition) {
        audition.status = newStatus;
        saveCallback(auditions);
        renderAuditionList(); // Re-render to move card if status changed
      }
    });
  });

  document.querySelectorAll(".audition-card-info").forEach((el) => {
    el.addEventListener("click", (e) => {
      const auditionId = Number(
        (e.currentTarget as HTMLElement).parentElement?.dataset.id,
      );
      const audition = auditions.find((a) => a.id === auditionId);
      if (audition) {
        openAuditionModal(audition);
      }
    });
  });

  document.querySelectorAll(".export-audition-btn").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent opening the audition modal if it's nested
      const auditionId = Number((e.currentTarget as HTMLElement).dataset.id);
      const audition = auditions.find((a) => a.id === auditionId);
      if (audition) {
        openExportModal(audition);
      }
    });
  });
}

function openAuditionModal(audition?: Audition) {
  const modal = document.getElementById("audition-modal");
  const content = document.getElementById("audition-modal-content");
  if (!modal || !content) return;

  const isNew = !audition;
  const aud = audition || {
    id: Date.now(),
    projectName: "",
    castingDirector: { name: "", email: "", phone: "", company: "" },
    dueDate: "",
    notes: "",
    status: "Submitted",
    linkedCharacterIds: [],
    files: [],
  };

  content.innerHTML = `
        <h2>${isNew ? "New" : "Edit"} Audition</h2>
        <div class="audition-modal-grid">
            <input id="aud-project-name" placeholder="Project Name" value="${aud.projectName}">
            <div>
                <label for="aud-due-date">Due Date:</label>
                <input type="date" id="aud-due-date" value="${aud.dueDate}">
            </div>
            <input id="cd-name" placeholder="Casting Director Name" value="${aud.castingDirector.name}">
            <input id="cd-email" placeholder="Casting Director Email" value="${aud.castingDirector.email}">
            <input id="cd-phone" placeholder="Casting Director Phone" value="${aud.castingDirector.phone}">
            <input id="cd-company" placeholder="Casting Company" value="${aud.castingDirector.company}">
        </div>
        <div class="audition-modal-full-width">
            <textarea id="aud-notes" placeholder="Notes, Sides...">${aud.notes}</textarea>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label for="aud-character-select">Linked Character (Required for Recording)</label>
                <select id="aud-character-select">
                    <option value="">--Select Character--</option>
                    ${generateCharacterOptionsHTML(characters, undefined, aud.linkedCharacterIds[0])}
                </select>
            </div>

            <label>Audition Audio:</label>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <input type="file" id="audition-audio-upload" accept="audio/*" style="display: none;">
                <button id="audition-audio-upload-btn" class="secondary" style="margin: 0; flex-shrink: 0;">Upload File</button>
                <button id="audition-audio-record-btn" class="record-button" style="margin: 0; padding: 5px 10px; font-size: 1.2em; flex-shrink: 0;">●</button>
                <span id="audition-audio-status" style="font-size: 0.9em; color: var(--gray-600); flex-shrink: 0;">${aud.audioFileName || "No audio loaded"}</span>
                <audio id="audition-audio-player" controls style="display: ${aud.audioData ? "block" : "none"}; height: 30px; flex-shrink: 0;" src="${aud.audioData || ""}"></audio>
                <button id="audition-audio-edit-btn" class="secondary" style="display: ${aud.audioData ? "block" : "none"}; margin: 0; flex-shrink: 0;">✏️</button>
                <button id="audition-audio-download-btn" class="secondary" style="display: ${aud.audioData ? "block" : "none"}; margin: 0; flex-shrink: 0;">💾</button>
                <button id="audition-audio-remove-btn" class="danger-btn" style="display: ${aud.audioData ? "block" : "none"}; margin: 0; flex-shrink: 0;">Remove</button>
            </div>

            <label for="aud-status">Status:</label>
            <select id="aud-status">${STATUS_OPTIONS.map((s) => `<option value="${s}" ${aud.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>

            <p><strong>Attached Files:</strong></p>
            <label for="aud-file-upload" class="custom-file-input">Upload Files</label>
            <input type="file" id="aud-file-upload" multiple>
            <div id="aud-file-list"></div>
        </div>
        <div class="modal-footer">
            <button id="save-audition-button">Save</button>
        </div>
    `;

  function updateAudioUI() {
    const hasAudio = !!aud.audioData;
    const player = document.getElementById(
      "audition-audio-player",
    ) as HTMLAudioElement;
    const uploadBtn = document.getElementById(
      "audition-audio-upload-btn",
    ) as HTMLButtonElement;
    const recordBtn = document.getElementById(
      "audition-audio-record-btn",
    ) as HTMLButtonElement;
    const status = document.getElementById(
      "audition-audio-status",
    ) as HTMLSpanElement;
    const downloadBtn = document.getElementById(
      "audition-audio-download-btn",
    ) as HTMLButtonElement;
    const editBtn = document.getElementById(
      "audition-audio-edit-btn",
    ) as HTMLButtonElement;
    const removeBtn = document.getElementById(
      "audition-audio-remove-btn",
    ) as HTMLButtonElement;

    if (player) {
      player.style.display = hasAudio ? "block" : "none";
      player.src = aud.audioData || "";
    }
    if (downloadBtn) downloadBtn.style.display = hasAudio ? "block" : "none";
    if (editBtn) editBtn.style.display = hasAudio ? "block" : "none";
    if (removeBtn) removeBtn.style.display = hasAudio ? "block" : "none";

    // Don't hide upload/record, let them replace
    if (status) status.textContent = aud.audioFileName || "No audio loaded";
  }

  const charSelect = content.querySelector(
    "#aud-character-select",
  ) as HTMLSelectElement;
  charSelect.addEventListener("change", () => {
    const audioRecordBtn = content.querySelector(
      "#audition-audio-record-btn",
    ) as HTMLButtonElement;
    if (audioRecordBtn) audioRecordBtn.disabled = !charSelect.value;
  });

  const fileListContainer = content.querySelector("#aud-file-list");

  const renderFiles = () => {
    if (!fileListContainer) return;
    fileListContainer.innerHTML = aud.files
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (file, index) => `
            <div class="uploaded-file-item" style="display: flex; align-items: center; justify-content: space-between; padding: 5px; margin-bottom: 5px; border-radius: 4px;">
                <span class="download-file-btn" data-index="${index}" style="cursor: pointer; font-weight: bold; flex: 1;">💾 ${file.name}</span>
                <button class="remove-item-btn" data-index="${index}" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">🗑️</button>
            </div>
        `,
      )
      .join("");
  };

  renderFiles();

  // --- Event Listeners ---
  document
    .getElementById("audition-modal-close")
    ?.addEventListener("click", () => modal.classList.add("hidden"));

  content.addEventListener("click", (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.matches(".remove-item-btn")) {
      const item = target.closest(".uploaded-file-item");
      if (item?.parentElement?.id === "aud-file-list") {
        const index = Number(target.dataset.index);
        aud.files.splice(index, 1);
        renderFiles();
      }
    }
    if (target.matches(".download-file-btn")) {
      const index = Number(target.dataset.index);
      const file = aud.files[index];
      if (file && file.data) {
        const a = document.createElement("a");
        a.href = file.data;
        a.download = file.name;
        a.click();
      }
    }
  });

  document
    .getElementById("aud-file-upload")
    ?.addEventListener("change", async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          aud.files.push({
            name: file.name,
            data: ev.target?.result as string,
          });
          renderFiles();
        };
        reader.readAsDataURL(file);
      }
    });

  document
    .getElementById("save-audition-button")
    ?.addEventListener("click", () => {
      aud.projectName = (
        document.getElementById("aud-project-name") as HTMLInputElement
      ).value;
      aud.dueDate = (
        document.getElementById("aud-due-date") as HTMLInputElement
      ).value;
      aud.castingDirector.name = (
        document.getElementById("cd-name") as HTMLInputElement
      ).value;
      aud.castingDirector.email = (
        document.getElementById("cd-email") as HTMLInputElement
      ).value;
      aud.castingDirector.phone = (
        document.getElementById("cd-phone") as HTMLInputElement
      ).value;
      aud.castingDirector.company = (
        document.getElementById("cd-company") as HTMLInputElement
      ).value;
      const charVal = (
        document.getElementById("aud-character-select") as HTMLSelectElement
      ).value;
      aud.linkedCharacterIds = charVal ? [Number(charVal)] : [];
      aud.notes = (
        document.getElementById("aud-notes") as HTMLTextAreaElement
      ).value;
      aud.status = (document.getElementById("aud-status") as HTMLSelectElement)
        .value as AuditionStatus;

      if (isNew) {
        auditions.push(aud);
      } else {
        const index = auditions.findIndex((a) => a.id === aud.id);
        if (index > -1) auditions[index] = aud;
      }

      saveCallback(auditions);
      renderAuditionList();
      modal.classList.add("hidden");
    });

  // Audio Logic
  const audioUpload = content.querySelector(
    "#audition-audio-upload",
  ) as HTMLInputElement;
  const audioUploadBtn = content.querySelector(
    "#audition-audio-upload-btn",
  ) as HTMLButtonElement;
  const audioRecordBtn = content.querySelector(
    "#audition-audio-record-btn",
  ) as HTMLButtonElement;
  const audioStatus = content.querySelector(
    "#audition-audio-status",
  ) as HTMLSpanElement;

  if (audioRecordBtn) audioRecordBtn.disabled = !charSelect.value;

  document
    .getElementById("audition-audio-download-btn")
    ?.addEventListener("click", () => {
      if (!aud.audioData || !aud.audioFileName) return;
      const a = document.createElement("a");
      a.href = aud.audioData;
      a.download = aud.audioFileName;
      a.click();
    });

  audioUploadBtn?.addEventListener("click", () => audioUpload.click());

  audioUpload?.addEventListener("change", () => {
    const file = audioUpload.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        aud.audioData = e.target?.result as string;
        aud.audioFileName = file.name;
        updateAudioUI();
      };
      reader.readAsDataURL(file);
    }
  });

  document
    .getElementById("audition-audio-remove-btn")
    ?.addEventListener("click", () => {
      aud.audioData = undefined;
      aud.audioFileName = undefined;
      updateAudioUI();
    });

  document
    .getElementById("audition-audio-edit-btn")
    ?.addEventListener("click", async () => {
      if (!aud.audioData) return;

      // Convert data URL to Blob
      const res = await fetch(aud.audioData);
      const blob = await res.blob();

      openEditAudioModal(blob, (newBlob: Blob) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          aud.audioData = e.target?.result as string;
          updateAudioUI();
        };
        reader.readAsDataURL(newBlob);
      });
    });

  // Basic MediaRecorder logic
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  audioRecordBtn?.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      audioRecordBtn.textContent = "●";
      audioRecordBtn.classList.remove("recording");
      audioStatus.textContent = "Processing...";
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onload = (e) => {
            const audTitle = aud.projectName || "Audition";
            const actorName =
              systemSettings?.actorProfile?.firstName || "Actor";
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];
            const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");

            aud.audioData = e.target?.result as string;
            aud.audioFileName =
              `${audTitle}_${actorName}_${dateStr}_${timeStr}.webm`.replace(
                /[^a-zA-Z0-9_.\-]/g,
                "_",
              );
            updateAudioUI();
          };
          reader.readAsDataURL(blob);

          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        audioRecordBtn.textContent = "■";
        audioRecordBtn.classList.add("recording");
        audioStatus.textContent = "Recording...";
      } catch (err) {
        console.error("Error accessing mic", err);
        alert("Microphone access denied or error occurred.");
      }
    }
  });

  modal.classList.remove("hidden");
}

function openExportModal(aud: Audition) {
  const userProfile = DataStore.getUserProfile();
  if (!userProfile || !userProfile.firstName) {
    alert(
      "Please fill out your 'Me' profile first so casting directors know who you are!",
    );
    return;
  }
  if (!aud.audioData) {
    alert("Please record or upload audio for this audition before exporting.");
    return;
  }

  const modal = document.getElementById("audition-export-modal");
  if (!modal) return;

  const rateInput = document.getElementById(
    "audition-export-rate",
  ) as HTMLInputElement;
  const startInput = document.getElementById(
    "audition-export-start-date",
  ) as HTMLInputElement;
  const endInput = document.getElementById(
    "audition-export-end-date",
  ) as HTMLInputElement;
  const openTimeCheck = document.getElementById(
    "audition-export-open-time",
  ) as HTMLInputElement;

  // Prefill if we saved it previously on this audition
  rateInput.value = aud.actorRate || "";

  const closeBtn = document.getElementById("audition-export-modal-close");
  const confirmBtn = document.getElementById("audition-export-confirm-btn");

  closeBtn!.onclick = () => (modal.style.display = "none");

  confirmBtn!.onclick = async () => {
    aud.actorRate = rateInput.value;
    let availability = "";
    if (startInput.value && endInput.value) {
      availability = `${startInput.value} to ${endInput.value}`;
    }
    if (openTimeCheck.checked) {
      availability += availability
        ? ", Open to more"
        : "Open to additional time";
    }
    aud.actorAvailability = availability;

    saveCallback(auditions);
    modal.style.display = "none";

    await exportAuditionZip(aud);
  };

  modal.style.display = "flex";
}

async function exportAuditionZip(aud: Audition) {
  try {
    const fullProfile = DataStore.getUserProfile()!;
    // Omit roleHistory
    const { roleHistory, ...actorProfile } = fullProfile;

    const charName =
      aud.linkedCharacterIds.length > 0
        ? characters.find((c) => c.id === aud.linkedCharacterIds[0])?.name ||
          "Unknown_Character"
        : "Unknown_Character";

    const zip = new JSZip();
    const folderName =
      `${actorProfile.firstName} ${actorProfile.lastName}`.trim() ||
      "Voice_Actor";
    const folder = zip.folder(folderName);

    if (!folder) return;

    const auditionData = {
      actorFirstName: actorProfile.firstName,
      actorLastName: actorProfile.lastName,
      actorEmail: actorProfile.email,
      actorRate: aud.actorRate || "",
      actorPhone: actorProfile.phone,
      actorAddress: actorProfile.address,
      actorAvailability: aud.actorAvailability || "",
      character: charName,
      project: aud.projectName || "",
      dateSubmitted: new Date().toISOString().split("T")[0],
      fileName: aud.audioFileName || "audition.wav",
      audioData: aud.audioData || "",
      actorProfile: actorProfile, // Attach full actor profile data for VP side
    };

    folder.file("Audition.json", JSON.stringify(auditionData, null, 2));

    if (aud.audioData) {
      const base64Data = aud.audioData.split(",")[1];
      if (base64Data) {
        folder.file(auditionData.fileName, base64Data, { base64: true });
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}_Audition_${charName}.zip`.replace(/\s+/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export failed:", e);
    alert("Export failed: " + e);
  }
}
