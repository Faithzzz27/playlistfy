const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  MAIN_LIST,
  createUser,
  authenticateUser,
  userExists,
  getSongs,
  saveSongs,
  getPlaylists,
  createPlaylist,
  renamePlaylist,
  updatePlaylistCover,
  deletePlaylist,
  getNextId,
} = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Serve the main application directly at root /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Accounts / login page (extra feature)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// ---------- Helpers ----------

// The logged-in username (from X-User header, query, or defaults to demo)
function getUsername(req) {
  const name = req.headers['x-user'] || req.query.user;
  return (name && String(name).trim()) || 'demo';
}

// Seamless authentication: defaults to 'demo' if no user session is provided
function requireLogin(req, res, next) {
  let username = getUsername(req);
  if (!userExists(username)) {
    username = 'demo';
  }
  req.username = username;
  next();
}

// Which playlist to work on: ?list=main (default) or ?list=<playlist id>
function getListId(req) {
  return req.query.list ? String(req.query.list) : MAIN_LIST;
}

// Extra iTunes details we keep with a song (optional, used for artwork and playing music)
const EXTRA_FIELDS = ['album', 'artwork', 'previewUrl', 'durationMs', 'trackViewUrl', 'releaseDate', 'trackId'];

function pickExtras(body) {
  const extras = {};
  EXTRA_FIELDS.forEach((field) => {
    if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
      extras[field] = body[field];
    }
  });
  return extras;
}

// ---------- Accounts (extra feature) ----------

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = authenticateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  res.json({ username: user.username, message: 'Login successful.' });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const newUser = createUser(username, password);
  if (!newUser) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  res.status(201).json({ username: newUser.username, message: 'Account created successfully.' });
});

// ---------- Playlists (extra feature) ----------

app.get('/api/playlists', requireLogin, (req, res) => {
  res.json(getPlaylists(req.username));
});

app.post('/api/playlists', requireLogin, (req, res) => {
  const { name, cover } = req.body || {};
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ error: 'Playlist name is required.' });
  }

  const newList = createPlaylist(req.username, name, cover);
  if (!newList) {
    return res.status(409).json({ error: 'Playlist name already exists.' });
  }

  res.status(201).json(newList);
});

app.put('/api/playlists/:id', requireLogin, (req, res) => {
  const { name, cover } = req.body || {};
  let result = null;

  if (name !== undefined && String(name).trim() !== '') {
    result = renamePlaylist(req.username, req.params.id, name);
    if (result === 'duplicate') {
      return res.status(409).json({ error: 'Playlist name already exists.' });
    }
    if (!result) {
      return res.status(404).json({ error: 'Playlist not found.' });
    }
  }

  if (cover !== undefined) {
    result = updatePlaylistCover(req.username, req.params.id, cover);
    if (!result) {
      return res.status(404).json({ error: 'Playlist not found.' });
    }
  }

  if (!result) {
    return res.status(400).json({ error: 'Playlist name or cover is required.' });
  }

  res.json(result);
});

app.put('/api/playlists/:id/cover', requireLogin, (req, res) => {
  const { cover } = req.body || {};
  if (cover === undefined) {
    return res.status(400).json({ error: 'Cover image is required.' });
  }

  const result = updatePlaylistCover(req.username, req.params.id, cover);
  if (!result) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }

  res.json(result);
});

app.delete('/api/playlists/:id', requireLogin, (req, res) => {
  if (!deletePlaylist(req.username, req.params.id)) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }
  res.json({ message: 'Playlist deleted.' });
});

// ---------- Songs: the 4 main CRUD routes ----------

// READ - show the whole list
app.get('/api/music', requireLogin, (req, res) => {
  const records = getSongs(req.username, getListId(req));
  if (!records) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }
  res.json(records);
});

// READ ONE - used by the edit page
app.get('/api/music/:id', requireLogin, (req, res) => {
  const records = getSongs(req.username, getListId(req)) || [];
  const record = records.find((item) => item.id === Number(req.params.id));

  if (!record) {
    return res.status(404).json({ error: 'Record not found.' });
  }
  res.json(record);
});

// CREATE - add a song
app.post('/api/music', requireLogin, (req, res) => {
  const body = req.body || {};
  const { song, artist, genre } = body;
  const listId = getListId(req);

  if (!song || !artist || !genre) {
    return res.status(400).json({ error: 'Song, artist, and genre are required.' });
  }

  const records = getSongs(req.username, listId);
  if (!records) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }

  const newRecord = {
    id: getNextId(records),
    song: String(song).trim(),
    artist: String(artist).trim(),
    genre: String(genre).trim(),
    ...pickExtras(body),
  };

  records.push(newRecord);
  saveSongs(req.username, listId, records);
  res.status(201).json(newRecord);
});

// UPDATE - edit a song
app.put('/api/music/:id', requireLogin, (req, res) => {
  const { song, artist, genre } = req.body || {};
  const listId = getListId(req);

  if (!song || !artist || !genre) {
    return res.status(400).json({ error: 'Song, artist, and genre are required.' });
  }

  const records = getSongs(req.username, listId) || [];
  const index = records.findIndex((item) => item.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  const old = records[index];
  const updated = {
    ...old,
    song: String(song).trim(),
    artist: String(artist).trim(),
    genre: String(genre).trim(),
  };

  // If the song or artist changed, the old iTunes preview no longer matches, so drop it.
  // The player will look it up again the next time the song is played.
  if (updated.song !== old.song || updated.artist !== old.artist) {
    EXTRA_FIELDS.forEach((field) => delete updated[field]);
  }

  records[index] = updated;
  saveSongs(req.username, listId, records);
  res.json(updated);
});

// DELETE - remove a song
app.delete('/api/music/:id', requireLogin, (req, res) => {
  const listId = getListId(req);
  const records = getSongs(req.username, listId) || [];
  const filtered = records.filter((item) => item.id !== Number(req.params.id));

  if (filtered.length === records.length) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  saveSongs(req.username, listId, filtered);
  res.json({ message: 'Record deleted.' });
});

// ---------- Online lookup: iTunes Search API ----------
// Example: https://itunes.apple.com/search?term=coldplay&media=music&entity=song&limit=12

app.get('/api/lookup', async (req, res) => {
  const term = String(req.query.term || '').trim();
  const limit = Math.min(Number(req.query.limit) || 12, 50);

  if (!term) {
    return res.status(400).json({ error: 'Please enter a song or artist name.' });
  }

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: 'iTunes is not responding. Please try again.' });
    }

    const data = await response.json();
    const items = Array.isArray(data.results) ? data.results : [];

    // Read every useful field that iTunes gives back for a song
    const results = items.map((item) => ({
      // The 3 fields of our record
      song: item.trackName || 'Unknown track',
      artist: item.artistName || 'Unknown artist',
      genre: item.primaryGenreName || 'Unknown genre',
      // Extra details from iTunes
      album: item.collectionName || '',
      artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '',
      artworkSmall: item.artworkUrl60 || item.artworkUrl30 || '',
      previewUrl: item.previewUrl || '', // 30-second song preview we can actually play
      durationMs: item.trackTimeMillis || 0,
      releaseDate: item.releaseDate || '',
      trackNumber: item.trackNumber || null,
      trackCount: item.trackCount || null,
      discNumber: item.discNumber || null,
      discCount: item.discCount || null,
      explicit: item.trackExplicitness === 'explicit',
      trackPrice: item.trackPrice ?? null,
      collectionPrice: item.collectionPrice ?? null,
      currency: item.currency || '',
      country: item.country || '',
      isStreamable: Boolean(item.isStreamable),
      trackId: item.trackId || null,
      artistId: item.artistId || null,
      collectionId: item.collectionId || null,
      trackViewUrl: item.trackViewUrl || '',
      artistViewUrl: item.artistViewUrl || '',
      collectionViewUrl: item.collectionViewUrl || '',
    }));

    res.json(results);
  } catch (error) {
    console.error('iTunes lookup failed:', error.message);
    res.status(502).json({ error: 'Could not reach iTunes. Check your internet connection.' });
  }
});

// ---------- Recommended Curated Playlists ----------

app.get('/api/recommended-playlists', (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'recommendedPlaylists.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load recommended playlists.' });
  }
});

app.post('/api/recommended-playlists/:id/import', requireLogin, (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'recommendedPlaylists.json'), 'utf8');
    const list = JSON.parse(raw);
    const rec = list.find((p) => p.id === req.params.id);
    if (!rec) {
      return res.status(404).json({ error: 'Recommended playlist not found.' });
    }

    let targetPl = createPlaylist(req.username, rec.name, rec.cover || '');
    if (!targetPl) {
      targetPl = createPlaylist(req.username, `${rec.name} (Curated)`, rec.cover || '');
    }

    if (targetPl && Array.isArray(rec.songs)) {
      saveSongs(req.username, targetPl.id, rec.songs);
    }

    res.status(201).json({ message: `Imported "${rec.name}" to your library!`, playlist: targetPl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import recommended playlist.' });
  }
});

app.listen(port, () => {
  console.log(`Music Playlist app is running at http://localhost:${port}`);
});