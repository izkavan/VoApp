# Vo-App: Your Personal Vocal Character Library

Welcome to Vo-App! This is a "simple", "lightweight" tool designed to help you keep track of all the unique vocal characters you use for storytelling, role-playing, or any other creative endeavor.

As the project progresses, I am likely going to drop that Simple tag, as well as lightweight; The intent of this is to be a one-stop shop for a number of features that Voice Actors, Podcasters, DMs, and others to find common ground on.

## What can you do right now?

Vo-App is designed to be your go-to place for a number of voice-work related items. Here’s what you can do with the app in its current form:

*   **Project Management**: Create and edit projects with details like name, description, licensing, and start/end dates. 
  * A Project can contain characters-- both ones that you portray, or ones that other people work with for your reference!
  * A project can also have a dictionary-- sometimes fantasy words are weird, and you need a way to reference them!

*   **Character Creation**: Easily create new characters with a name, description, and voice details.
1. **Vocal Recipe:** A structured way to define a voice beyond a simple description. Use sliders or tags for Pitch (Low/High), Pace (Slow/Fast), Placement (Chest/Nasal), and Timbre (Gravelly/Smooth) to create a quick, reproducible blueprint for any voice.
2. **Character Artwork**: Upload an image for each character to give them a face to go with the voice.
3. **Voice Samples**: Upload an existing audio file or record a 10-second clip on the fly using your microphone.
4. **Tagging System**: Add space-separated tags to your characters for easy categorization.
5. **Descriptions**: Describing the character and the voice lets you have easy access to stylistic decisions when you want to reproduce the voice!

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

1. **Live Session Dashboard:** A simplified, high-contrast "game day" view. Drag the characters you need for a session into a panel for instant access to their voice samples and notes, without searching the full library.
2. **Improvised NPC Generator:** A tool to instantly generate a new character with a random name, a simple trait, and a "Vocal Recipe" for on-the-fly character creation when players go off the beaten path.

* **System Preferences**:
1. **Filetypes**: Select how you want your files downloaded/stored. Webm, wav, mp3, flac, etc.
2. **Line Reader Updates**:  When you export the lines, you can choose how the file paths are structured, so it can be character_name/line1, or character_name/LineOverview, or whatever else is needed. May need to look into industry workflows.
3. A spot to define microhpone, headset, mixer, preamp, etc. so that editors can be aware of what the devices are and what profiles might be needed
4. Full Backup - If you need to move to another machine, or want to perform routine backup.

## I'm a voice actor. What is this and how do I use it?
//TODO, I'm working on it. There's a lot of moving pieces here.
## I'm a dungeon master. What is this and how do I use it?
//TODO, I'm working on it. There's a lot of moving pieces here.
## I'm a director or producer, is this useful for me?
//TODO, I'm working on it. There's a lot of moving pieces here.

## What's Coming Next?

Here are some of the features that I thought up for the app that could be coming in the future-- Feel free to leave comments or message me about getting something moved up in priority, or if there are ideas that you'd like to see, I can add them to the backlog and attribute you!

### Changes to the core System
* Get a Docker Image put together that can pull this repo and get it running. 
* Organize this readme so that groups of functionality are explained, rather than my ramblings of a madman and copy/pasted when I finish a specific section. Would be nice to have a section for "I am a dungeon master, how do I use this?", "I am a voice actor, how do I use this?", "I am a director/producer, how do I use this?"
* **Multi-Device Support**: Sync your character library across all your devices. This is going to require some sort of cloud subscription solution though, so I don't know how I'm going to handle all that. Until then, take a look at the character packager, coupled with the import/export of projects!
* **Voice Memos** Would pair really well with that sync, so you could voice memo a project while on your phone at a coffee shop, and then get home and flesh it out more.
* Tie ins to common note taking apps (Obsidian, Notion, World Anvil?)
* Extend the current recording plugin to have a Waveform viewer with all audio (optional button/setting to expand and see?)
* A configuration system in the settings to turn off specific views if they aren't of use to the person running the application.

### Changes to the Character and Project Management
* **Mood Board**: Some character voices are less "this is the character" and more "this is the mood they fit". They might not have character art. It would be useful to have a section that is just, "Visual inspiration for the audio". This could also include a text area for additional notes, or links to music or videos that help make a good reference. Not trying to replace Pinterest.
* **Project Pronunciation Guide:** A project-level glossary where you can record and save the "canon" pronunciation for complex or fictional names to ensure consistency. Should have a way to do IPA annotation alongside written word, alongside a recording of the word/name/etc.
* **Pronunciation Update**: If a script is uploaded for the line-reader or the teleprompter, we should detect words that match words in the dictionary for that project. If we find one, highlight it. When the user mouses over the word, it shows the phonetic, and the audio file plays. 
* **Character Arc Tracker:** A timeline view for a character to log key development moments and attach new voice samples that reflect their evolution over a story. I thought of this while watching clips of Avatar the Last Airbender, and tracking the changes in Zuko's voice by Dante Basco-- The brash and arrogance from his earlier arc fading into a more even tempered and even resigned tone in the mid-late arc, and picking back up into a self-confident and more level headed tone of the ending.

### Changes for Voice Actors
* A simple tool that lets an actor type their name and the character's name, then generates an audio "slate" (e.g., "Izzy Kav for the role of The Captain") in a clean, pre-recorded voice (or using text-to-speech?). This slate could then be automatically prepended to an audition file on export.
* An extension for the Audition that lets a user compose a set of takes or reads for the characters being linked, with the clean slate read either interjected or whatnot. Would need to interview some Voice Actors to see how they typically work and what they would want out of that.
* Script/Line Management; Would be great to possibly split existing audio takes?

### Changes for Dungeon Masters
* **Quick-Key Support:** In the Live Session view, assign hotkeys (e.g., `Ctrl+1`, `Ctrl+2`) to characters to instantly pull up their info or play their anchor phrase. Perfect for rapid switching between NPCs. 

### Utilities to add
* Have a viewer for active memory management. Should allow a single view of all the data the application stores in local memory, with options to delete that data if the user wants.
* **Vocal Warmup/Practice updates**: Record and play back multiple different vocal warmups, flag them as your favorites, or tag them with specific voices that you prefer to work with or that need more practice. Probably a dropdown of the "common" ones, or a list selector that lets you store your ratings like elsewhere in the system
* **Demo Reel Builder:** A dedicated workspace to assemble, your best recordings into a professional demo reel, ready for export. I don't want to add editing tools to this application, but getting them consolidated into a file could be useful.
* **Export Annotations**: to go along with the above, there should be a good way to link/annotate the recordings, and export that data alongside the audio. I'm imagining a single markdown sheet that references each file by name and displays artist remarks for the editor to follow through on-- Even if it's all the same person, it comes in handy when changing mental workspaces.
**Effort & Grunt Library:** A special category for recording and tagging non-dialogue vocalizations (grunts, yells, laughs, etc.) to build a reusable library for action-heavy roles. I don't know if this needs to be per character, or if a different tagging system should be put in place. Tag back to vocal recipes, and let there be a search system so you can cross reference "how did I do that before?"

### Community Platform

* **Community & Platform Features:** I don't know how this would work without being hosted centrally, so this is a very very low priority. 
1. **Community Sharing:** An opt-in platform to share and download "Vocal Recipes" or character templates to get a head start on new projects. 
2. **Community Assistance**: Be able to post a voice to get feedback and review on the work-- Tag it with assistance tags or requests on specific features (Breath control, recovery, etc)
3. **Gamified Practice Tracking:** A personal dashboard to track your practice habits and earn badges for milestones, encouraging consistent vocal work. Could have a leaderboard?
4. **Recruiter Browser**: Oh man, it would be sick if an extension of the sharing and assistance allowed headhunters a centralized location to be able to browse through people's samples or profiles and send messages. We'd need a way to vet who is a recruiter, that isn't prohibitive. 


# THANKS!
Thanks for checking out Vo-App. I hope it helps you bring your characters to life!

If you feel like this project is fun enough to kick a few bucks to, check me out on https://ko-fi.com/izkavan!


# Technical callouts
Dependencies:
Typescript
npm install --save-dev @types/jszip
npm install --save-dev @types/node

install/run via npm

`npm run build && npx serve src`