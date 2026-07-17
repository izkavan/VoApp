import { AudioService } from "../../services/AudioService.js";
import { html } from "../../services/HtmlSanitizer.js";

export function initializeWarmUps() {
  const warmUpTextContainer = document.getElementById("warm-up-text");
  const recordButton = document.getElementById("warm-up-record-button");
  const audioPlayerContainer = document.getElementById("warm-up-audio-player");

  if (!warmUpTextContainer || !recordButton || !audioPlayerContainer) {
    return;
  }

  const warmUpText = html`
    <p>
      <strong>Lip Trills:</strong> Start with a few gentle lip trills (like a
      motorboat sound) to relax your lips and breath support.
    </p>
    <p>
      <strong>Jaw Relaxation:</strong> Gently massage your jaw muscles and say
      "yah-yah-yah" and "wow-wow-wow" with an exaggerated motion.
    </p>
    <p><strong>Tongue Twisters (Fricatives & Plosives):</strong></p>
    <ul>
      <li>"She sells seashells by the seashore."</li>
      <li>"Peter Piper picked a peck of pickled peppers."</li>
      <li>"Red leather, yellow leather." (Repeat quickly)</li>
      <li>"Unique New York, New York unique."</li>
    </ul>
    <p><strong>Vowel Sounds (Resonance):</strong></p>
    <ul>
      <li>"Mee, may, mah, moh, moo." (Focus on forward resonance)</li>
      <li>"Nee, nay, nah, noh, noo."</li>
    </ul>
    <p>
      <strong>Pitch Glides:</strong> Glide your voice from your lowest
      comfortable note to your highest and back down, like a siren.
    </p>
  `;
  warmUpTextContainer.innerHTML = warmUpText;

  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  const toggleRecording = async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      recordButton.classList.remove("recording");
      recordButton.textContent = "●";
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorder = AudioService.createRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", (event) => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          const audioUrl = URL.createObjectURL(audioBlob);
          audioPlayerContainer.innerHTML = html`<audio
            controls
            src="${audioUrl}"
          ></audio>`;
          stream.getTracks().forEach((track) => track.stop());
        });

        mediaRecorder.start();
        recordButton.classList.add("recording");
        recordButton.textContent = "■";
      } catch (err) {
        console.error("Error recording warm-up:", err);
        alert("Could not start recording.");
        recordButton.classList.remove("recording");
        recordButton.textContent = "●";
      }
    }
  };

  recordButton.addEventListener("click", toggleRecording);
}
