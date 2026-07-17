import { EventBus } from "../services/EventBus.js";

export function initializeToastSystem() {
  // Create toast container
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  EventBus.on("notify", (event: any) => {
    const { message, type = "info" } = event.detail || event;
    showToast(message, type, container!);
  });
}

export function showToast(
  message: string,
  type: "success" | "error" | "info",
  container: HTMLElement,
) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "";
  if (type === "error") icon = "⚠️";
  else if (type === "success") icon = "✅";
  else icon = "ℹ️";

  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;

  container.appendChild(toast);

  // Trigger reflow for animation
  void toast.offsetWidth;
  toast.classList.add("show");

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300); // Wait for transition to finish
  }, 4000);
}
