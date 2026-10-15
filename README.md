# Playlistfy - Music Playlist Web Application

**Course Requirement:** CCINPRGL - Term 1 - S.Y. 2026-2027  
**Topic:** Music Playlist  
**Three Required Fields:** `song`, `artist`, `genre`  
**Online Service Integration:** iTunes Search API (no API key required)

---

## 🎵 Features Overview

1. **Full CRUD Operations (Persistent JSON Storage)**
   - **Create:** Add new songs via form or directly from iTunes search results.
   - **Read:** Display all playlist songs with track numbers, artwork, title, artist, genre, and duration.
   - **Update:** Dedicated edit page (`edit.html`) to modify song title, artist, or genre.
   - **Delete:** Remove tracks with confirmation prompts and real-time UI refresh.
   - **File-based Persistence:** Saved in `data/musicPlaylist.json` so data remains even when the server restarts.

2. **Real Audio Streaming from iTunes API**
   - Direct integration with iTunes Search API:
     `https://itunes.apple.com/search?term=<term>&media=music&entity=song&limit=12`
   - Plays **real 30-second audio previews** (`previewUrl`) via HTML5 Audio.
   - Full player controls: **Play/Pause, Next Track, Previous Track, Shuffle, Repeat, Interactive Seek/Progress Bar, Volume/Favorites**.
   - Now Playing display on bottom sticky player, right rail, and full-screen expanded player overlay.

3. **Extras & Polish**
   - User account system (demo login: `demo` / `demo123`).
   - Multiple playlist library management (create, rename, delete custom playlists).
   - Spotify-inspired UI with 100% functional buttons, toasts, and context menus.

---

## 🚀 How to Run the Application

### Option 1: Direct Node.js (Recommended)
1. Open PowerShell or Terminal in the project directory:
   ```bash
   cd e:\playlistfy
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
5. Log in with:
   - **Username:** `demo`
   - **Password:** `demo123`
   *(Or click "Create account" to register a new user)*

### Option 2: Docker (with Live Auto-Updates / Hot-Reload)
```bash
docker compose up
```
*Any changes made to HTML, CSS, JavaScript, or `data/musicPlaylist.json` on your host machine will automatically sync and reload inside the Docker container without needing to rebuild!*

---

## 📡 API Endpoints Reference

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/login` | Authenticate user |
| `POST` | `/api/register` | Register new account |
| `GET` | `/api/playlists` | Get all playlists for current user |
| `POST` | `/api/playlists` | Create a new playlist |
| `PUT` | `/api/playlists/:id` | Rename a playlist |
| `DELETE` | `/api/playlists/:id` | Delete a playlist |
| `GET` | `/api/music` | **Read** all songs (`?list=main` or `?list=<id>`) |
| `GET` | `/api/music/:id` | **Read One** song for the edit form |
| `POST` | `/api/music` | **Create** new song record (`song`, `artist`, `genre`) |
| `PUT` | `/api/music/:id` | **Update** song record (`song`, `artist`, `genre`) |
| `DELETE` | `/api/music/:id` | **Delete** song from playlist |
| `GET` | `/api/lookup` | **Online Lookup** query to iTunes Search API (`?term=<query>`) |

---

## 🎓 Oral Defense & Demo Guide for Group Members

During the live exam/demo, instructors may ask any member to explain code sections. Here is the breakdown:

### Member 1: Database & Persistence Layer (`db.js` & `data/musicPlaylist.json`)
- **Key point:** Explains that data is read from and written to a JSON file using Node.js `fs` (`fs.readFileSync` and `fs.writeFileSync`).
- **Where to show:** `db.js` functions `readData()`, `writeData()`, `getSongs()`, and `saveSongs()`.
- **Proof:** Show that adding or deleting a song updates `data/musicPlaylist.json` in real time and persists after restarting the server.

### Member 2: CRUD Routes in Express (`server.js`)
- **Key point:** Explains the 4 RESTful endpoints (`GET`, `POST`, `PUT`, `DELETE` on `/api/music`).
- **Where to show:** `server.js` lines 124–205.
- **Validation:** Shows that empty fields return HTTP 400 Bad Request, missing IDs return HTTP 404, and successful creation returns HTTP 201.

### Member 3: Online iTunes Integration (`server.js` `/api/lookup`)
- **Key point:** Explains how the backend calls `https://itunes.apple.com/search?term=...` using `fetch()`.
- **Fields read:** Maps `trackName` ➔ `song`, `artistName` ➔ `artist`, `primaryGenreName` ➔ `genre`, and reads `previewUrl` for music playback.
- **Where to show:** `server.js` route `/api/lookup`.

### Member 4: Frontend & Audio Playback (`app.js`, `index.html`, `edit.html`)
- **Key point:** Explains how `fetch()` calls the backend API and how the HTML5 `Audio` object streams the iTunes `previewUrl`.
- **Where to show:** `public/app.js` audio event listeners, `playTrack()`, `loadPlaylist()`, and `performSearch()`.
