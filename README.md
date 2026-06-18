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
* **Mood Board**: Some character voices are less "this is the character" and more "this is the mood they fit". They might not have character art. It would be useful to have a section that is just, "Visual inspiration for the audio". This could also include a text area for additional notes, or links to music or videos that help make a good reference. 
* **Vocal Warmup/Practice**: Record and play back various vocal warmups, flag them as your favorites, or tag them with specific voices that you prefer to work with or that need more practice. 
* **Vocal Actor Specific Features/mode**: 
* A new section to log audition submissions. An entry could include the project name, casting director, due date, script sides, and a status (e.g., Submitted, Callback, Booked, Rejected). Users could link characters from their library to auditions they used them for, or even a whole export zip to keep track of what files were sent.
* A simple tool that lets an actor type their name and the character's name, then generates an audio "slate" (e.g., "Izzy Kav for the role of The Captain") in a clean, pre-recorded voice (or using text-to-speech?). This slate could then be automatically prepended to an audition file on export.
* Script/Line Management; This comes in two subpoints, so it's a list in a list (Pointy Hat would be proud)
1. Take Management - When a user records multiple takes for a single line, allow them to rate each take (e.g., with stars), add notes ("a bit faster," "more energy"), and quickly A/B test two takes against each other.
2. Teleprompter mode - A full-screen, distraction-free view of a script that scrolls automatically at a user-defined pace. The user could control speed, font size, and color for maximum readability while recording. Spacebar to pause/resume, arrow key to skip a line. 

* **Live Performance & Worldbuilding Tools (for DMs & Podcasters):**
1. **Live Session Dashboard:** A simplified, high-contrast "game day" view. Drag the characters you need for a session into a panel for instant access to their voice samples and notes, without searching the full library.
2. **Vocal Recipe:** A structured way to define a voice beyond a simple description. Use sliders or tags for Pitch (Low/High), Pace (Slow/Fast), Placement (Chest/Nasal), and Timbre (Gravelly/Smooth) to create a quick, reproducible blueprint for any voice.
3. **Quick-Key Support:** In the Live Session view, assign hotkeys (e.g., `Ctrl+1`, `Ctrl+2`) to characters to instantly pull up their info or play their anchor phrase. Perfect for rapid switching between NPCs.
4. **Improvised NPC Generator:** A tool to instantly generate a new character with a random name, a simple trait, and a "Vocal Recipe" for on-the-fly character creation when players go off the beaten path.

Thanks for checking out Vo-App. I hope it helps you bring your characters to life!



Dependencies:
Typescript
npm install --save-dev @types/jszip
npm install --save-dev @types/node

install/run via tsc