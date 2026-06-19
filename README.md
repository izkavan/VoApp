# Vo-App: Your Personal Vocal Character Library

Welcome to Vo-App! This is a "simple", "lightweight" tool designed to help you keep track of all the unique vocal characters you use for storytelling, role-playing, or any other creative endeavor.

As the project progresses, I am likely going to drop that Simple tag, as well as lightweight; The intent of this is to be a one-stop shop for a number of features that Voice Actors, Podcasters, DMs, and others to find common ground on.

## What can you do right now?

Vo-App is designed to be your go-to place for voice-work related items. Here is a breakdown of the app by its main views and features:

### Project Management
* **Create & Edit Projects**: Manage your work with details like name, description, licensing, and dates. Projects can contain characters (both ones you portray and references from others).
* **Pronunciation Dictionary**: Build a project-level glossary to record the "canon" pronunciation for complex or fictional names. Add phonetics and record audio to ensure consistency across the project.
* **Import/Export**: Package a project and its characters into a zip file to share with friends or move between computers.

### Character Library
* **Vocal Recipe & Creation**: Define a voice beyond a simple description. Create reproducible blueprints using sliders for Pitch, Pace, Placement, and Timbre.
* **Artwork & Voice Samples**: Upload images and voice samples (or record a clip on the fly) to bring your characters to life.
* **Advanced Organization**: Use space-separated tags, advanced filtering (inclusive/OR, exclusive/AND), and drag-and-drop to categorize and assign characters to projects.
* **Persistent Storage**: All characters, projects, and samples are saved automatically in your browser's local storage.

### Line Reader
* **Script Upload & Take Management**: Upload a text script, split it into lines, and record multiple takes per line.
* **Dictionary Highlighting**: When a project is selected, words in your script that match the project's dictionary are automatically highlighted in purple. Hover over them to see the phonetic pronunciation, and hover or click to instantly play the dictionary audio.
* **Take Review**: Rate takes (with stars), add notes, and quickly A/B test recordings against each other.

### Teleprompter
* **Distraction-Free Recording**: A full-screen view of a script that scrolls automatically. Control the speed and font size for maximum readability while recording takes.
* **Project Integration**: Select a project directly within the teleprompter to enable the same powerful dictionary highlighting, phonetic tooltips, and audio playback features found in the Line Reader.

### Audition Tracker
* **Log Submissions**: Keep track of audition details including project name, casting director, due date, script sides, and status (e.g., Submitted, Callback, Booked, Rejected). 
* **Character Linking**: Link characters from your library to the auditions you used them for.

### Dungeon Master (Live Session) View
* **Game Day Dashboard**: A simplified view tailored for running a game. Select a project to instantly access its assigned characters, voice samples, and notes without searching the full library.
* **Improvised NPC Generator**: Instantly generate a new character with a random name, trait, and "Vocal Recipe" for on-the-fly encounters.

### Voice Memos & Utilities
* **Voice Memos**: Record and save ad-hoc voice memos to capture spontaneous ideas, tagging them to specific projects or marking them as high importance.
* **System Preferences**: Customize your workspace by setting export formats (WAV/WebM), choosing script export groupings, and defining your recording gear.

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