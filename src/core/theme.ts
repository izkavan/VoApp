export function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        console.log("inside if dark mode:", !!sunIcon, !!moonIcon, !!themeToggle);
        document.body.classList.add('dark-mode');
        sunIcon?.classList.add('hidden');
        moonIcon?.classList.remove('hidden');
    } else {
        document.body.classList.remove('dark-mode');
        sunIcon?.classList.remove('hidden');
        moonIcon?.classList.add('hidden');
    }

    themeToggle?.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        sunIcon?.classList.toggle('hidden', isDarkMode);
        moonIcon?.classList.toggle('hidden', !isDarkMode);
    });
}
