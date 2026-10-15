// db.js - saves and loads everything from a JSON file so data stays after the server closes.
const fs = require('fs');
const path = require('path');

// Our own data file for the Music Playlist topic
const DATA_FILE = path.join(__dirname, 'data', 'musicPlaylist.json');

// The main playlist every user has. Custom playlists get number ids (1, 2, 3...).
const MAIN_LIST = 'main';

const DEFAULT_SONGS = [
  {
    id: 1,
    song: "Yellow",
    artist: "Coldplay",
    genre: "Alternative",
    album: "Parachutes",
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/66/f3/1a/66f31a76-a6ed-cb4c-f353-23310a7ae9a8/mzaf_10593596652344378873.plus.aac.p.m4a",
    durationMs: 269208
  },
  {
    id: 2,
    song: "Blank Space",
    artist: "Taylor Swift",
    genre: "Pop",
    album: "1989 (Deluxe Edition)",
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a7/98/d8/a798d867-344d-2bf2-fbfe-d2d1412dcef8/14UMDIM03793.rgb.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/79/55/b1/7955b10c-6cb6-462a-861c-8e5cbcacfb76/mzaf_3395570742482345989.plus.aac.p.m4a",
    durationMs: 231827
  },
  {
    id: 3,
    song: "Rolling in the Deep",
    artist: "Adele",
    genre: "Pop",
    album: "21",
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/eb/ca/25/ebca2596-cd1e-b295-91a3-771c868d0a79/191404113868.png/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4c/4f/03/4c4f032a-3d2b-853d-da81-996602355b42/mzaf_11625850023134180491.plus.aac.p.m4a",
    durationMs: 228093
  },
  {
    id: 4,
    song: "Blinding Lights",
    artist: "The Weeknd",
    genre: "R&B/Soul",
    album: "After Hours",
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/12/73/ca/1273ca46-233a-5331-189b-25ac1d656533/mzaf_976341070785891411.plus.aac.p.m4a",
    durationMs: 200040
  }
];

// Read the whole file and return the array of users. Ensures demo user is always present.
function readData() {
  let users = [];
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    users = JSON.parse(raw);
    if (!Array.isArray(users)) users = [];
  } catch (error) {
    users = [];
  }

  // Ensure demo user is always present
  if (!users.some((u) => u.username === 'demo')) {
    users.unshift({
      username: 'demo',
      password: 'demo123',
      playlist: [...DEFAULT_SONGS],
      playlists: [
        {
          id: 1,
          name: 'Chill Vibes',
          songs: [DEFAULT_SONGS[0]],
        },
      ],
    });
    writeData(users);
  }

  return users;
}

// Write the array of users back to the file (pretty printed so it is easy to read).
function writeData(users) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function findUser(users, username) {
  const name = String(username || '').trim();
  return users.find((user) => user.username === name) || null;
}

// Makes sure older records in the file have the arrays we expect.
function normalizeUser(user) {
  if (!Array.isArray(user.playlist)) user.playlist = [];
  if (!Array.isArray(user.playlists)) user.playlists = [];
  user.playlists.forEach((list) => {
    if (!Array.isArray(list.songs)) list.songs = [];
  });
  return user;
}

// Returns the songs array for a list id ('main' or a custom playlist id), or null if not found.
function findSongsArray(user, listId) {
  if (!listId || listId === MAIN_LIST) return user.playlist;
  const list = user.playlists.find((item) => String(item.id) === String(listId));
  return list ? list.songs : null;
}

function getNextId(records) {
  return records.reduce((maxId, record) => Math.max(maxId, Number(record.id) || 0), 0) + 1;
}

// ---------- Accounts (extra feature) ----------

function createUser(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();
  if (!cleanUsername || !cleanPassword) return null;

  const users = readData();
  if (findUser(users, cleanUsername)) return null;

  const newUser = { username: cleanUsername, password: cleanPassword, playlist: [], playlists: [] };
  users.push(newUser);
  writeData(users);
  return newUser;
}

function authenticateUser(username, password) {
  const user = findUser(readData(), username);
  if (!user || user.password !== String(password || '').trim()) return null;
  return user;
}

function userExists(username) {
  return Boolean(findUser(readData(), username));
}

// ---------- Songs (the records of our CRUD app) ----------

// Get all songs in one playlist. Returns null if the user or playlist does not exist.
function getSongs(username, listId = MAIN_LIST) {
  const user = findUser(readData(), username);
  if (!user) return null;
  return findSongsArray(normalizeUser(user), listId);
}

// Replace all songs in one playlist and save the file. Returns false if the playlist does not exist.
function saveSongs(username, listId, songs) {
  const users = readData();
  const user = findUser(users, username);
  if (!user) return false;

  normalizeUser(user);
  if (!listId || listId === MAIN_LIST) {
    user.playlist = songs;
  } else {
    const list = user.playlists.find((item) => String(item.id) === String(listId));
    if (!list) return false;
    list.songs = songs;
  }

  writeData(users);
  return true;
}

// ---------- Playlists (extra feature) ----------

function getPlaylists(username) {
  const user = findUser(readData(), username);
  if (!user) return [];
  normalizeUser(user);

  return [
    { id: MAIN_LIST, name: 'My Playlist', count: user.playlist.length },
    ...user.playlists.map((list) => ({ id: list.id, name: list.name, count: list.songs.length })),
  ];
}

function createPlaylist(username, name) {
  const cleanName = String(name || '').trim();
  const users = readData();
  const user = findUser(users, username);
  if (!user || !cleanName) return null;
  normalizeUser(user);

  const taken = cleanName.toLowerCase() === 'my playlist'
    || user.playlists.some((list) => list.name.toLowerCase() === cleanName.toLowerCase());
  if (taken) return null;

  const newList = { id: getNextId(user.playlists), name: cleanName, songs: [] };
  user.playlists.push(newList);
  writeData(users);
  return { id: newList.id, name: newList.name, count: 0 };
}

// Returns the renamed playlist, 'duplicate' if the name is taken, or null if not found.
function renamePlaylist(username, listId, name) {
  const cleanName = String(name || '').trim();
  const users = readData();
  const user = findUser(users, username);
  if (!user || !cleanName) return null;
  normalizeUser(user);

  const list = user.playlists.find((item) => String(item.id) === String(listId));
  if (!list) return null;

  const taken = cleanName.toLowerCase() === 'my playlist'
    || user.playlists.some((item) => item !== list && item.name.toLowerCase() === cleanName.toLowerCase());
  if (taken) return 'duplicate';

  list.name = cleanName;
  writeData(users);
  return { id: list.id, name: list.name, count: list.songs.length };
}

function deletePlaylist(username, listId) {
  const users = readData();
  const user = findUser(users, username);
  if (!user) return false;
  normalizeUser(user);

  const before = user.playlists.length;
  user.playlists = user.playlists.filter((item) => String(item.id) !== String(listId));
  if (user.playlists.length === before) return false;

  writeData(users);
  return true;
}

module.exports = {
  MAIN_LIST,
  createUser,
  authenticateUser,
  userExists,
  getSongs,
  saveSongs,
  getPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  getNextId,
};