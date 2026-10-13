const express = require('express');
const path = require('path');
const {
  createUser,
  authenticateUser,
  getUserPlaylist,
  saveUserPlaylist,
  getNextId,
} = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

function getUsernameFromRequest(req) {
  const headerUser = req.headers['x-user'];
  const queryUser = req.query.user;
  const bodyUser = req.body && req.body.username;
  const candidate = headerUser || queryUser || bodyUser;
  return candidate ? String(candidate).trim() : null;
}

function requireLogin(req, res, next) {
  const username = getUsernameFromRequest(req);

  if (!username) {
    return res.status(401).json({ error: 'Login required.' });
  }

  next();
}

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

app.get('/api/music', requireLogin, (req, res) => {
  const username = getUsernameFromRequest(req);
  res.json(getUserPlaylist(username));
});

app.post('/api/music', requireLogin, (req, res) => {
  const { song, artist, genre } = req.body || {};
  const username = getUsernameFromRequest(req);

  if (!song || !artist || !genre) {
    return res.status(400).json({ error: 'Song, artist, and genre are required.' });
  }

  const records = getUserPlaylist(username);
  const newRecord = {
    id: getNextId(records),
    song: String(song).trim(),
    artist: String(artist).trim(),
    genre: String(genre).trim(),
  };

  records.push(newRecord);
  saveUserPlaylist(username, records);
  res.status(201).json(newRecord);
});

app.get('/api/music/:id', requireLogin, (req, res) => {
  const username = getUsernameFromRequest(req);
  const records = getUserPlaylist(username);
  const record = records.find((item) => item.id === Number(req.params.id));

  if (!record) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  res.json(record);
});

app.put('/api/music/:id', requireLogin, (req, res) => {
  const { song, artist, genre } = req.body || {};
  const username = getUsernameFromRequest(req);

  if (!song || !artist || !genre) {
    return res.status(400).json({ error: 'Song, artist, and genre are required.' });
  }

  const records = getUserPlaylist(username);
  const index = records.findIndex((item) => item.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  records[index] = {
    ...records[index],
    song: String(song).trim(),
    artist: String(artist).trim(),
    genre: String(genre).trim(),
  };

  saveUserPlaylist(username, records);
  res.json(records[index]);
});

app.delete('/api/music/:id', requireLogin, (req, res) => {
  const username = getUsernameFromRequest(req);
  const records = getUserPlaylist(username);
  const filtered = records.filter((item) => item.id !== Number(req.params.id));

  if (filtered.length === records.length) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  saveUserPlaylist(username, filtered);
  res.json({ message: 'Record deleted.' });
});

app.get('/api/lookup', async (req, res) => {
  const term = req.query.term;

  if (!term || String(term).trim() === '') {
    return res.status(400).json({ error: 'Please enter a song or artist name.' });
  }

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=10`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`iTunes request failed with status ${response.status}`);
    }

    const data = await response.json();
    const results = (data.results || []).slice(0, 10).map((item) => ({
      song: item.trackName || 'Unknown track',
      artist: item.artistName || 'Unknown artist',
      genre: item.primaryGenreName || 'Unknown genre',
    }));

    res.json(results);
  } catch (error) {
    console.error('iTunes lookup failed:', error);
    res.status(502).json({ error: 'Could not fetch results from iTunes.' });
  }
});

app.listen(port, () => {
  console.log(`Music Playlist app is running at http://localhost:${port}`);
});
