export function handleArtworkPreview(event: Event) {
    const input = event.target as HTMLInputElement;
    const previewContainer = document.getElementById('artwork-preview-container');
    const fileNameElement = document.getElementById('file-name');
    if (!input.files || !previewContainer || !fileNameElement) return;

    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `<img src="${e.target?.result}" class="modal-artwork-preview">`;
            fileNameElement.textContent = file.name;
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.innerHTML = '';
        fileNameElement.textContent = '';
    }
}

export function createButton(id: string, text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
}
