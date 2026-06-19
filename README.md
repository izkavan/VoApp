# Vo-App: Your Personal Vocal Character Library

Welcome to Vo-App! This is a "simple", lightweight tool designed to help you keep track of all the unique vocal characters you use for storytelling, role-playing, or any other creative endeavor.

As the project progresses, I am likely going to drop that Simple tag, as well as lightweight; The intent of this is to be a one-stop shop for a number of features that Voice Actors, Podcasters, DMs, and others to find common ground on.

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
* **Line Reader**: Upload a script, select a portion of text, split it, and make a recording (or multiple takes) of those lines. Can be assigned a character.
1. Take Management - When a user records multiple takes for a single line, allow them to rate each take (e.g., with stars), add notes ("a bit faster," "more energy"), and quickly A/B test two takes against each other.
2. Teleprompter mode - A full-screen, distraction-free view of a script that scrolls automatically at a user-defined pace. The user could control speed, font size, and color for maximum readability while recording. Spacebar to pause/resume, user scrolling auto stops.
* **Vocal Warm-Ups**: Enjoy a vocal warmup area, which lets you record a sample and play it back of a block of text that should get your voice nice and ready for work.
* **Audition tracker**: A section to log audition submissions. An entry could include the project name, casting director, due date, script sides, and a status (e.g., Submitted, Callback, Booked, Rejected). Users could link characters from their library to auditions they used them for, or even a whole export zip to keep track of what files were sent.
* * **Voice Memos** Sometimes there's too many ideas, save a voice memo to a project!


## What's Coming Next?

This is just the beginning! Here are some of the features planned for the future to make Vo-App even more useful:

* **System Preferences**:
1. **Filetypes**: Select how you want your files downloaded/stored. Webm, wav, mp3, flac, etc.
2. **Line Reader Updates**:  When you export the lines, you can choose how the file paths are structured, so it can be character_name/line1, or character_name/LineOverview, or whatever else is needed. May need to look into industry workflows.
3. A spot to define microhpone, headset, mixer, preamp, etc. so that editors can be aware of what the devices are and what profiles might be needed
4. Docker Deployable
5. "active memory management", see all the things this app has locally stored, and curate/trim things that you don't want.
6. Full Backup - If you need to move to another machine, or want to perform routine backup.

*   **Multi-Device Support**: Sync your character library across all your devices. This is going to require some sort of cloud subscription solution though, so I don't know how I'm going to handle all that. Until then, take a look at the character packager, coupled with the import/export of projects!
* **Voice Memos** Would pair really well with the sync, so you could voice memo a project while on your phone at a coffee shop, and then get home and flesh it out more.
* **Mood Board**: Some character voices are less "this is the character" and more "this is the mood they fit". They might not have character art. It would be useful to have a section that is just, "Visual inspiration for the audio". This could also include a text area for additional notes, or links to music or videos that help make a good reference. 
* **Vocal Warmup/Practice updates**: Record and play back different vocal warmups, flag them as your favorites, or tag them with specific voices that you prefer to work with or that need more practice. Probably a dropdown of the "common" ones, or a list selector that lets you store your ratings.

* Waveform viewer with all audio (optional expand to see)

* **Vocal Actor Specific Features/mode**: 
* A simple tool that lets an actor type their name and the character's name, then generates an audio "slate" (e.g., "Izzy Kav for the role of The Captain") in a clean, pre-recorded voice (or using text-to-speech?). This slate could then be automatically prepended to an audition file on export.
* Script/Line Management; Would be great to possibly split existing audio takes?

* **Live Performance & Worldbuilding Tools (for DMs & Podcasters):**
1. **Live Session Dashboard:** A simplified, high-contrast "game day" view. Drag the characters you need for a session into a panel for instant access to their voice samples and notes, without searching the full library.
2. **Vocal Recipe:** A structured way to define a voice beyond a simple description. Use sliders or tags for Pitch (Low/High), Pace (Slow/Fast), Placement (Chest/Nasal), and Timbre (Gravelly/Smooth) to create a quick, reproducible blueprint for any voice.
3. **Quick-Key Support:** In the Live Session view, assign hotkeys (e.g., `Ctrl+1`, `Ctrl+2`) to characters to instantly pull up their info or play their anchor phrase. Perfect for rapid switching between NPCs.
4. **Improvised NPC Generator:** A tool to instantly generate a new character with a random name, a simple trait, and a "Vocal Recipe" for on-the-fly character creation when players go off the beaten path.

* **Advanced Craft & Professional Tools:**
1. **Demo Reel Builder:** A dedicated workspace to assemble, your best recordings into a professional demo reel, ready for export. I don't want to add editing tools to this application, but getting them consolidated into a file could be useful.
2. **Export Annotations**: to go along with the above, there should be a good way to link/annotate the recordings, and export that data alongside the audio. I'm imagining a single markdown sheet that references each file by name and displays artist remarks for the editor to follow through on-- Even if it's all the same person, it comes in handy when changing mental workspaces.
3. **Project Pronunciation Guide:** A project-level glossary where you can record and save the "canon" pronunciation for complex or fictional names to ensure consistency. Should have a way to do IPA annotation alongside written word, alongside a recording of the word/name/etc.
4.**Effort & Grunt Library:** A special category for recording and tagging non-dialogue vocalizations (grunts, yells, laughs, etc.) to build a reusable library for action-heavy roles. I don't know if this needs to be per character, or if a different tagging system should be put in place. Tag back to vocal recipes, and let there be a search system so you can cross reference "how did I do that before?"

* **Immersion & Storytelling Tools:**
1. **Character Arc Tracker:** A timeline view for a character to log key development moments and attach new voice samples that reflect their evolution over a story. I thought of this while watching clips of Avatar the Last Airbender, and tracking the changes in Zuko's voice by Dante Basco-- The brash and arrogance from his earlier arc fading into a more even tempered and even resigned tone in the mid-late arc, and picking back up into a self-confident and more level headed tone of the ending.

* **Community & Platform Features:** I don't know how this would work without being hosted centrally, so this is a very very low priority. 
1. **Community Sharing:** An opt-in platform to share and download "Vocal Recipes" or character templates to get a head start on new projects. 
2. **Community Assistance**: Be able to post a voice to get feedback and review on the work-- Tag it with assistance tags or requests on specific features (Breath control, recovery, etc)
3. **Gamified Practice Tracking:** A personal dashboard to track your practice habits and earn badges for milestones, encouraging consistent vocal work. Could have a leaderboard?
4. **Recruiter Browser**: Oh man, it would be sick if an extension of the sharing and assistance allowed headhunters a centralized location to be able to browse through people's samples or profiles and send messages. We'd need a way to vet who is a recruiter, that isn't prohibitive. 


Thanks for checking out Vo-App. I hope it helps you bring your characters to life!

If you feel like this project is fun enough to kick a few bucks to, check me out on https://ko-fi.com/izkavan!


Dependencies:
Typescript
npm install --save-dev @types/jszip
npm install --save-dev @types/node

install/run via npm

npm run build && npx serve src