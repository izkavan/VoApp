import { DataStore } from "../services/DataStore.js";
import { EventBus } from "../services/EventBus.js";
import { UserProfile, Character } from "../types.js";
import {
  saveImageBlob,
  getImageBlob,
  saveAudioBlob,
  getAudioBlob,
} from "../services/indexeddb.js";
import { createCharacterCard } from "../components/character-renderer.js";

let pendingHeadshotFile: File | null = null;
let pendingDemoReelFile: File | null = null;
let currentHeadshotId: string | undefined;
let currentDemoReelId: string | undefined;
let currentDemoReelFilename: string | undefined;
let currentRoleHistory: number[] = [];
let customLinksData: { name: string; url: string }[] = [];

export function initializeMeView() {
  const container = document.getElementById("me-view-container");
  if (!container) return;

  container.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>My Profile</h2>
                <div style="display: flex; gap: 10px;">
                    <button id="me-export-btn" class="secondary-button" style="padding: 10px 20px; font-size: 1.1em;">Export Profile</button>
                    <button id="me-save-btn" style="background: var(--primary-color); color: white; padding: 10px 20px; font-size: 1.1em;">Save Profile</button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 30px;">
                <!-- Headshot Column -->
                <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
                    <div id="me-headshot-preview" style="width: 200px; height: 200px; border-radius: 16px; background: var(--surface-color); overflow: hidden; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-color);">
                        <span style="color: var(--gray-500);">No Image</span>
                    </div>
                    <label for="me-headshot-upload" class="custom-file-input" style="cursor: pointer; padding: 8px 15px; background: var(--secondary-color); color: white; border-radius: 4px; text-align: center; width: 100%; box-sizing: border-box;">Upload Headshot</label>
                    <input type="file" id="me-headshot-upload" accept="image/*" style="display: none;">
                </div>

                <!-- Basic Info Column -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>First Name</label>
                        <input type="text" id="me-first-name" style="width: 100%;">
                    </div>
                    <div>
                        <label>Last Name</label>
                        <input type="text" id="me-last-name" style="width: 100%;">
                    </div>
                    <div>
                        <label>Email</label>
                        <input type="email" id="me-email" style="width: 100%;">
                    </div>
                    <div>
                        <label>Phone</label>
                        <input type="text" id="me-phone" style="width: 100%;">
                    </div>
                    <div style="grid-column: span 2;">
                        <label>Address</label>
                        <input type="text" id="me-address" style="width: 100%;">
                    </div>
                    <div>
                        <label>Years of Experience</label>
                        <input type="text" id="me-experience" style="width: 100%;">
                    </div>
                </div>
            </div>

            <div>
                <h3>Preferred Job Types</h3>
                <div id="me-job-types" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; background: var(--surface-color); padding: 15px; border-radius: 8px;">
                    ${[
                      "Commercials",
                      "Animation",
                      "Video Games",
                      "Dubbing/ADR",
                      "Audiobooks",
                      "E-Learning",
                      "Promos",
                      "Corporate/Explainer",
                      "IVR/Telephony",
                      "Other",
                    ]
                      .map(
                        (job) =>
                          `<label><input type="checkbox" value="${job}" class="me-job-type-cb"> ${job}</label>`,
                      )
                      .join("")}
                </div>
                <div id="me-job-type-other-container" style="display: none; margin-top: 10px;">
                    <label>Specify Other Job Types:</label>
                    <input type="text" id="me-job-type-other-input" placeholder="e.g. Podcast Host, Announcer" style="width: 100%; margin-top: 5px;">
                </div>
            </div>

            <div style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                <h3>Demo Reel</h3>
                <p style="font-size: 0.9em; color: var(--gray-500); margin-bottom: 10px;">Upload your audio or video demo reel. (File will be stored locally)</p>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label for="me-demoreel-upload" class="custom-file-input" style="display: inline-block; cursor: pointer; padding: 8px 15px; background: var(--secondary-color); color: white; border-radius: 4px; text-align: center;">Upload Demo Reel</label>
                    <button id="craft-demo-reel-btn" style="padding: 8px 15px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">Craft Demo Reel</button>
                    <input type="file" id="me-demoreel-upload" accept="audio/*,video/*" style="display: none;">
                </div>
                <div id="me-demoreel-preview" style="margin-top: 15px;"></div>
            </div>

            <div>
                <h3>Social Links</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: var(--surface-color); padding: 15px; border-radius: 8px;">
                    <div><label>Twitter</label><input type="text" id="me-twitter" style="width: 100%;"></div>
                    <div><label>Mastodon</label><input type="text" id="me-mastodon" style="width: 100%;"></div>
                    <div><label>Bluesky</label><input type="text" id="me-bluesky" style="width: 100%;"></div>
                    <div><label>LinkedIn</label><input type="text" id="me-linkedin" style="width: 100%;"></div>
                    <div style="grid-column: span 2;"><label>Personal Site</label><input type="text" id="me-site" style="width: 100%;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <h4>Custom Links</h4>
                    <button id="me-add-custom-link-btn" style="padding: 4px 8px; font-size: 0.9em;">+ Add Link</button>
                </div>
                <div id="me-custom-links-container" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;"></div>
            </div>

            <div>
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3>Role History</h3>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <select id="me-role-lookup" style="min-width: 250px; padding: 5px;"></select>
                        <button id="me-add-role-btn">Add Role</button>
                    </div>
                </div>
                <div id="me-role-history-grid" class="character-cards-grid" style="margin-top: 15px; min-height: 100px; padding: 10px; border: 1px dashed var(--border-color); border-radius: 4px;"></div>
            </div>

            <div style="text-align: right; margin-top: 20px;">
                <button id="me-save-btn-bottom" style="background: var(--primary-color); color: white; padding: 10px 20px; font-size: 1.1em;">Save Profile</button>
            </div>
        </div>
    `;

  bindMeViewEvents();
}

function renderCustomLinks() {
  const container = document.getElementById("me-custom-links-container");
  if (!container) return;

  container.innerHTML = customLinksData
    .map(
      (link, i) => `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" placeholder="Platform Name" value="${link.name}" data-index="${i}" class="me-cl-name" style="flex: 1;">
            <input type="text" placeholder="URL" value="${link.url}" data-index="${i}" class="me-cl-url" style="flex: 2;">
            <button data-index="${i}" class="me-cl-remove danger-btn">X</button>
        </div>
    `,
    )
    .join("");

  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const index = parseInt(target.dataset.index || "0", 10);
    if (target.classList.contains("me-cl-name")) {
      customLinksData[index].name = target.value;
    } else {
      customLinksData[index].url = target.value;
    }
  };

  container.querySelectorAll(".me-cl-name, .me-cl-url").forEach((input) => {
    input.addEventListener("input", onInput);
  });

  container.querySelectorAll(".me-cl-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(
        (e.target as HTMLElement).dataset.index || "0",
        10,
      );
      customLinksData.splice(index, 1);
      renderCustomLinks();
    });
  });
}

function renderRoleHistory() {
  const grid = document.getElementById("me-role-history-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const characters = DataStore.getCharacters();
  currentRoleHistory.forEach((charId) => {
    const char = characters.find((c) => c.id === charId);
    if (char) {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";

      const card = document.createElement("character-card") as any;
      card.data = char;
      card.style.flex = "1";
      card.style.cursor = "default";

      const removeBtn = document.createElement("button");
      removeBtn.innerHTML = "X";
      removeBtn.style.position = "absolute";
      removeBtn.style.top = "-10px";
      removeBtn.style.right = "-10px";
      removeBtn.style.background = "rgba(255,0,0,0.9)";
      removeBtn.style.color = "white";
      removeBtn.style.border = "none";
      removeBtn.style.borderRadius = "50%";
      removeBtn.style.width = "28px";
      removeBtn.style.height = "28px";
      removeBtn.style.display = "flex";
      removeBtn.style.alignItems = "center";
      removeBtn.style.justifyContent = "center";
      removeBtn.style.padding = "0";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.zIndex = "10";
      removeBtn.style.fontWeight = "bold";
      removeBtn.title = "Remove from Role History";

      removeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentRoleHistory = currentRoleHistory.filter((id) => id !== charId);
        renderRoleHistory();
        populateRoleLookup();
      };

      wrapper.appendChild(card);
      wrapper.appendChild(removeBtn);
      grid.appendChild(wrapper);
    }
  });
}

function populateRoleLookup() {
  const lookup = document.getElementById("me-role-lookup") as HTMLSelectElement;
  if (!lookup) return;

  const characters = [...DataStore.getCharacters()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  lookup.innerHTML =
    '<option value="" disabled selected>Select character</option>';
  characters.forEach((c) => {
    // Only show characters not already in history
    if (!currentRoleHistory.includes(c.id)) {
      const opt = document.createElement("option");
      opt.value = c.id.toString();
      opt.textContent = c.name;
      lookup.appendChild(opt);
    }
  });
}

export async function loadMeViewData() {
  const profile = DataStore.getUserProfile();

  currentRoleHistory = profile?.roleHistory || [];
  renderRoleHistory();
  populateRoleLookup();

  if (!profile) {
    customLinksData = [];
    renderCustomLinks();
    return;
  }

  (document.getElementById("me-first-name") as HTMLInputElement).value =
    profile.firstName || "";
  (document.getElementById("me-last-name") as HTMLInputElement).value =
    profile.lastName || "";
  (document.getElementById("me-email") as HTMLInputElement).value =
    profile.email || "";
  (document.getElementById("me-phone") as HTMLInputElement).value =
    profile.phone || "";
  (document.getElementById("me-address") as HTMLInputElement).value =
    profile.address || "";
  (document.getElementById("me-experience") as HTMLInputElement).value =
    profile.yearsOfExperience || "";

  const checkboxes = document.querySelectorAll(
    ".me-job-type-cb",
  ) as NodeListOf<HTMLInputElement>;
  let hasOther = false;
  checkboxes.forEach((cb) => {
    if (cb.value === "Other") {
      const standardJobs = [
        "Commercials",
        "Animation",
        "Video Games",
        "Dubbing/ADR",
        "Audiobooks",
        "E-Learning",
        "Promos",
        "Corporate/Explainer",
        "IVR/Telephony",
        "Other",
      ];
      const customJobs =
        profile.preferredJobTypes?.filter((j) => !standardJobs.includes(j)) ||
        [];
      if (
        customJobs.length > 0 ||
        profile.preferredJobTypes?.includes("Other")
      ) {
        cb.checked = true;
        hasOther = true;
        (
          document.getElementById("me-job-type-other-input") as HTMLInputElement
        ).value = customJobs.join(", ");
      }
    } else {
      cb.checked = profile.preferredJobTypes?.includes(cb.value) || false;
    }
  });

  const otherContainer = document.getElementById("me-job-type-other-container");
  if (otherContainer) {
    otherContainer.style.display = hasOther ? "block" : "none";
  }

  if (profile.socialLinks) {
    (document.getElementById("me-twitter") as HTMLInputElement).value =
      profile.socialLinks.twitter || "";
    (document.getElementById("me-mastodon") as HTMLInputElement).value =
      profile.socialLinks.mastodon || "";
    (document.getElementById("me-bluesky") as HTMLInputElement).value =
      profile.socialLinks.bluesky || "";
    (document.getElementById("me-linkedin") as HTMLInputElement).value =
      profile.socialLinks.linkedin || "";
    (document.getElementById("me-site") as HTMLInputElement).value =
      profile.socialLinks.personalSite || "";

    customLinksData = Array.isArray(profile.socialLinks.custom)
      ? JSON.parse(JSON.stringify(profile.socialLinks.custom))
      : [];
  } else {
    customLinksData = [];
  }
  renderCustomLinks();

  currentHeadshotId = profile.headshotId;
  currentDemoReelId = profile.demoReelId;
  currentDemoReelFilename = profile.demoReelFilename;

  if (currentHeadshotId) {
    const hsBlob = await getImageBlob(currentHeadshotId);
    if (hsBlob) {
      const url = URL.createObjectURL(hsBlob);
      const preview = document.getElementById("me-headshot-preview");
      if (preview)
        preview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
  }

  if (currentDemoReelId) {
    const drBlob = await getAudioBlob(currentDemoReelId);
    if (drBlob) {
      const url = URL.createObjectURL(drBlob);
      const preview = document.getElementById("me-demoreel-preview");
      if (preview) {
        preview.innerHTML = "";
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "15px";
        container.style.marginTop = "10px";

        let mediaEl: HTMLMediaElement;
        if (drBlob.type.startsWith("video")) {
          mediaEl = document.createElement("video");
          mediaEl.style.maxHeight = "300px";
        } else {
          mediaEl = document.createElement("audio");
        }
        mediaEl.controls = true;
        mediaEl.src = url;
        mediaEl.style.flex = "1";
        mediaEl.setAttribute("controlsList", "nodownload");

        const dlBtn = document.createElement("button");
        dlBtn.className = "secondary-btn";
        dlBtn.textContent = "Download Reel";
        dlBtn.style.padding = "8px 15px";
        dlBtn.style.whiteSpace = "nowrap";

        dlBtn.onclick = async (e) => {
          e.preventDefault();
          dlBtn.disabled = true;
          dlBtn.textContent = "Downloading...";

          try {
            const settings = DataStore.getSettings();
            const format = settings.exportFormat || "webm";
            let finalBlob = drBlob;
            let filename = currentDemoReelFilename || "demo_reel";
            filename = filename.replace(/\.[^/.]+$/, ""); // strip ext

            if (
              format === "wav" &&
              !drBlob.type.includes("wav") &&
              !drBlob.type.startsWith("video")
            ) {
              const { convertWebMToWav } =
                await import("../utils/audio-utils.js");
              finalBlob = await convertWebMToWav(drBlob);
            }

            const dlUrl = URL.createObjectURL(finalBlob);
            const a = document.createElement("a");
            a.href = dlUrl;
            a.download = drBlob.type.startsWith("video")
              ? currentDemoReelFilename || "demo_reel.webm"
              : `${filename}.${format}`;
            a.click();
          } catch (err) {
            console.error(err);
            alert("Failed to download demo reel.");
          } finally {
            dlBtn.disabled = false;
            dlBtn.textContent = "Download Reel";
          }
        };

        container.appendChild(mediaEl);
        container.appendChild(dlBtn);
        preview.appendChild(container);
      }
    }
  }
}

function bindMeViewEvents() {
  document
    .getElementById("me-headshot-upload")
    ?.addEventListener("change", (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        pendingHeadshotFile = file;
        const url = URL.createObjectURL(file);
        const preview = document.getElementById("me-headshot-preview");
        if (preview)
          preview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
      }
    });

  document
    .getElementById("me-demoreel-upload")
    ?.addEventListener("change", (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        pendingDemoReelFile = file;
        const url = URL.createObjectURL(file);
        const preview = document.getElementById("me-demoreel-preview");
        if (preview) {
          if (file.type.startsWith("video")) {
            preview.innerHTML = `<video controls controlsList="nodownload" src="${url}" style="width: 100%; max-height: 300px;"></video>`;
          } else {
            preview.innerHTML = `<audio controls controlsList="nodownload" src="${url}" style="width: 100%;"></audio>`;
          }
        }
      }
    });

  // Handle "Other" checkbox toggle
  document.querySelectorAll(".me-job-type-cb").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value === "Other") {
        const otherContainer = document.getElementById(
          "me-job-type-other-container",
        );
        if (otherContainer) {
          otherContainer.style.display = target.checked ? "block" : "none";
        }
      }
    });
  });

  // Add Role History
  document.getElementById("me-add-role-btn")?.addEventListener("click", () => {
    const lookup = document.getElementById(
      "me-role-lookup",
    ) as HTMLSelectElement;
    const charIdStr = lookup.value;
    if (!charIdStr) return;

    const charId = parseInt(charIdStr, 10);
    if (!currentRoleHistory.includes(charId)) {
      currentRoleHistory.push(charId);
      renderRoleHistory();
      populateRoleLookup();
    }
  });

  const saveHandler = async () => {
    try {
      const firstName = (
        document.getElementById("me-first-name") as HTMLInputElement
      ).value;
      const lastName = (
        document.getElementById("me-last-name") as HTMLInputElement
      ).value;
      const email = (document.getElementById("me-email") as HTMLInputElement)
        .value;
      const phone = (document.getElementById("me-phone") as HTMLInputElement)
        .value;
      const address = (document.getElementById("me-address") as HTMLInputElement)
        .value;
      const yearsOfExperience = (
        document.getElementById("me-experience") as HTMLInputElement
      ).value;

      const preferredJobTypes: string[] = [];
      document.querySelectorAll(".me-job-type-cb:checked").forEach((cb) => {
        const val = (cb as HTMLInputElement).value;
        if (val === "Other") {
          const otherInput = (
            document.getElementById("me-job-type-other-input") as HTMLInputElement
          ).value;
          if (otherInput.trim()) {
            preferredJobTypes.push(
              ...otherInput
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s),
            );
          } else {
            preferredJobTypes.push("Other");
          }
        } else {
          preferredJobTypes.push(val);
        }
      });

      // Filter out empty custom links before saving
      customLinksData = customLinksData.filter(
        (l) => l.name.trim() !== "" || l.url.trim() !== "",
      );

      const socialLinks = {
        twitter: (document.getElementById("me-twitter") as HTMLInputElement)
          .value,
        mastodon: (document.getElementById("me-mastodon") as HTMLInputElement)
          .value,
        bluesky: (document.getElementById("me-bluesky") as HTMLInputElement)
          .value,
        linkedin: (document.getElementById("me-linkedin") as HTMLInputElement)
          .value,
        personalSite: (document.getElementById("me-site") as HTMLInputElement)
          .value,
        custom: customLinksData,
      };

      if (pendingHeadshotFile) {
        currentHeadshotId = await saveImageBlob(pendingHeadshotFile);
        pendingHeadshotFile = null;
      }

      if (pendingDemoReelFile) {
        currentDemoReelId = await saveAudioBlob(pendingDemoReelFile);
        currentDemoReelFilename = pendingDemoReelFile.name;
        pendingDemoReelFile = null;
      }

      const profile: UserProfile = {
        firstName,
        lastName,
        email,
        phone,
        address,
        yearsOfExperience,
        preferredJobTypes,
        socialLinks,
        roleHistory: currentRoleHistory,
        headshotId: currentHeadshotId,
        demoReelId: currentDemoReelId,
        demoReelFilename: currentDemoReelFilename,
      };

      DataStore.setUserProfile(profile);
      EventBus.emit("notify", { message: "Profile saved successfully!", type: "success" });

      renderCustomLinks(); // Re-render to clear out removed blanks from UI
    } catch (error: any) {
      console.error("Profile save error:", error);
      console.error("Error name:", error?.name);
      if (error?.name === 'QuotaExceededError') {
        EventBus.emit("notify", { message: "Failed to upload image. Storage limit may be reached.", type: "error" });
      } else {
        EventBus.emit("notify", { message: "Failed to save profile.", type: "error" });
      }
    }
  };

  document
    .getElementById("me-save-btn")
    ?.addEventListener("click", saveHandler);
  document
    .getElementById("me-save-btn-bottom")
    ?.addEventListener("click", saveHandler);
  document
    .getElementById("me-export-btn")
    ?.addEventListener("click", exportProfileData);

  document
    .getElementById("me-add-custom-link-btn")
    ?.addEventListener("click", () => {
      customLinksData.push({ name: "", url: "" });
      renderCustomLinks();
    });
}

function exportProfileData() {
  const profile = DataStore.getUserProfile();
  if (!profile) {
    alert("No profile data saved yet. Please save your profile first.");
    return;
  }

  const exportData = {
    version: 1,
    type: "UserProfile",
    profile: profile,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filenameName =
    profile.firstName || profile.lastName
      ? `${profile.firstName}_${profile.lastName}`.trim()
      : "Profile";
  a.download = `${filenameName.replace(/\s+/g, "_")}_Export.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
