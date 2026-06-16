# Vo-App: Your Personal Vocal Character Library

Welcome to Vo-App! This is a simple, lightweight tool designed to help you keep track of all the unique vocal characters you use for storytelling, role-playing, or any other creative endeavor.

## What can you do right now?

Vo-App is designed to be your go-to place for organizing your character voices. Here’s what you can do with the app in its current form:

*   **Project Management**: Create and edit projects with details like name, description, licensing, and start/end dates.
*   **Character Creation**: Easily create new characters with a name, description, and voice details.
*   **Character Artwork**: Upload an image for each character to give them a face to go with the voice.
*   **Voice Samples**: Upload an existing audio file or record a 10-second clip on the fly using your microphone.
*   **Tagging System**: Add space-separated tags to your characters for easy categorization.
*   **Advanced Search**: Filter your characters by one or more tags with both inclusive (OR) and exclusive (AND) search options.
*   **Drag-and-Drop Organization**: Easily assign characters to projects by dragging and dropping them into the correct project section.
*   **Duplicate & Delete**: Quickly duplicate or delete characters from the character detail view.
*   **Persistent Storage**: All your characters, projects, and voice samples are saved right in your browser's local storage, so they'll be there the next time you open the app.
*   **Character Packager**: Package a set of your characters into a single zip file to share with friends or move between computers.
* 
## What's Coming Next?

This is just the beginning! Here are some of the features planned for the future to make Vo-App even more useful:

*   **Multi-Device Support**: Sync your character library across all your devices. This is going to require some sort of cloud subscription solution though, so I don't know how I'm going to handle all that. Until then, take a look at the character packager, coupled with the import/export of projects!
* **Line Reader**: Upload a script, select a portion of text, split it, and make a recording (or multiple takes) of those lines. Can be assigned a character. When you export the lines, you can choose how the file paths are structured, so it can be character_name/line1, or character_name/LineOverview, or whatever else is needed. May need to look into industry workflows.


Thanks for checking out Vo-App. I hope it helps you bring your characters to life!



Dependencies:
Typescript
npm install --save-dev @types/jszip
npm install --save-dev @types/node

install/run via tsc