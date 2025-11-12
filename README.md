# Gamelist-Manager

Gamelist Manager is a Node.js application designed to help retro gaming enthusiasts manage and merge EmulationStation gamelists (XML files) for systems like MAME, Megadrive, Game Gear, and others (compatible with setups like RetroPie or Recalbox). It allows you to import an initial gamelist, merge missing metadata (e.g., images, ratings, developers) from a larger "complete" gamelist, and export a merged XML. The app uses MongoDB for storage and provides a simple web interface for easy operation. It supports fuzzy matching for game names to handle variants/clones and can be deployed on Netlify for remote use.
Features

Import Initial Gamelist: Upload and parse your base XML file, storing games in MongoDB with customizable ignored fields (e.g., path, lastplayed).
Merge Metadata: Update existing games with data from a "complete" XML, filling missing fields while preserving your original data. Supports:
Fuzzy name matching for variants (e.g., "Mystic Defender (REV 00) (JUE)" matches "Mystic Defender (USA, Europe) (Rev A)").
Clone handling: Propagate metadata to all matching variants/clones.
BIOS skipping: Automatically skips BIOS entries or minimal-field games.
No new games added: Only updates existing entries; skips non-matches.
Image path fixing: Removes './' from image paths in the complete list.

Export Merged Gamelist: Generate and download a complete XML with all merged data, preserving original formats (e.g., dates as YYYYMMDDTHHMMSS).
System-Specific Constraints: Customizable ignores per system (e.g., pre-filled for MAME: path,lastplayed; for Megadrive: path,ratio,region).
Web Interface: User-friendly UI for uploading files, selecting systems, setting ignores, and downloading results. Works locally or on Netlify.
Deployment-Ready: Serverless backend via Netlify Functions; frontend is static HTML/JS.
Logging and Debugging: Console logs during merge (e.g., "Merged Mystic Defender: Added fields image,rating").

Installation
Prerequisites

Node.js v20.x.x or higher.
npm v10.x.x or higher.
MongoDB Atlas account (free tier works).
Netlify account (for deployment).

Local Setup

Clone the repo: clone https://github.com/your-username/gamelist-manager.git
cd gamelist-manager
Install dependencies: npm install
Set up .env in the root: MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gamelists?retryWrites=true&w=majority
Replace with your MongoDB Atlas URI (create a database named gamelists).

Run locally: netlify dev
Opens at http://localhost:8888.


Deployment to Netlify

Push to GitHub.
In Netlify Dashboard:
New site from Git → Select your repo.
Build settings: Base dir "/", Publish dir "public", Functions dir "functions".
Environment variables: Add MONGODB_URI (same as local .env).

Deploy: Netlify auto-builds. Access at your-site.netlify.app.

Usage
Local Usage

Start the server: netlify dev
Open http://localhost:8888 in your browser.
Use the form:
Select system (e.g., "mame" or "megadrive").
Enter ignores (comma-separated, e.g., "path,lastplayed").
Upload initial XML → Click "Import Initial".
Upload complete XML → Click "Merge Complete".
Click "Export & Download" to get the merged XML.

CLI Alternative (no UI): node src/index.js import -s megadrive -f ./roms/megadrive.xml -i path
node src/index.js merge -s megadrive -f ./roms/megadrive-complete.xml -i lastplayed playcount timeplayed
node src/index.js export -s megadrive -o ./roms/generated-megadrive.xml

Deployed Usage (Netlify)

Open your Netlify site (e.g., your-site.netlify.app).
Follow the same UI steps as local.
The backend runs on Netlify Functions; uploads are limited to 50MB.

How-To Guide
1. Import Initial Gamelist

Upload your base XML (e.g., megadrive.xml) with your current games.
Ignores: Specify fields to skip (e.g., "path,lastplayed" to preserve stats).
Result: Games stored in MongoDB (only your initial games; no adds).

2. Merge Complete Gamelist

Upload the larger XML (e.g., megadrive-complete.xml) with extra metadata.
The script:
Normalizes names (removes regions, revisions, e.g., "Mystic Defender (USA, Europe) (Rev A)" → "mystic defender").
Uses fuzzy matching (similarity ≥ 0.85) to find matches.
Updates missing fields (e.g., adds image, rating).
Propagates to clones (e.g., all "Mystic Defender" variants get the same metadata).
Skips BIOS/minimal entries and non-matches.

Result: Your initial games enhanced with complete data.

3. Export Merged

Downloads the merged XML (generated-megadrive.xml).
Copy to RetroPie: \\RETROPIE\roms\megadrive\gamelist.xml, restart EmulationStation.

4. System-Specific Tips

MAME: Ignores: "path,lastplayed,playcount,timeplayed" (protect stats).
Megadrive: Ignores: "path,ratio,region" (pre-filled in UI; customize in api.js).
Add new systems: Edit public/index.html dropdown and api.js for constraints.

Troubleshooting

No Matches: Adjust threshold in merge.js (e.g., 0.8). Check logs for similarity scores.
Large Files: If timeout on Netlify, use small XMLs or optimize (e.g., batch in import.js).
UI Errors: Check browser console (F12) for details.
MongoDB: Ensure MONGODB_URI is set and Atlas whitelists your IP (or 0.0.0.0/0 for testing).

Dependencies

Node.js: ^20.12.2
npm: ^10.0.0
Libraries: mongoose, fast-xml-parser, string-similarity, express, multer, body-parser, serverless-http, netlify-lambda

License
MIT License