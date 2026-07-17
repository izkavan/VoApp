export function initializeVoiceActorView() {
  const tabContainers = document.querySelectorAll(".tab-container");
  tabContainers.forEach((container) => {
    const tabLinks = container.querySelectorAll(".tab-link");
    const tabContents = container.querySelectorAll(".tab-content");

    tabLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const tab = (link as HTMLElement).dataset.tab;

        tabLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        tabContents.forEach((content) => {
          content.classList.remove("active");
          if (content.id === tab) {
            content.classList.add("active");
          }
        });
      });
    });
  });
}
