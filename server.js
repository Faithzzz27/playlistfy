const express = require('express');
const path = require('path');
const {
  createUser,
  authenticateUser,
  getUserPlaylist,
  getUserPlaylists,
  saveUserPlaylist,
  createPlaylist,
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

// Catches errors from async routes (e.g. database problems)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error(error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  });

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

app.post('/api/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = await authenticateUser(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  res.json({ username: user.username, message: 'Login successful.' });
}));

app.post('/api/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const newUser = await createUser(username, password);

  if (!newUser) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  res.status(201).json({ username: newUser.username, message: 'Account created successfully.' });
}));

app.get('/api/music', requireLogin, asyncHandler(async (req, res) => {
  const username = getUsernameFromRequest(req);
  res.json(await getUserPlaylist(username));
}));

app.get('/api/playlists', requireLogin, asyncHandler(async (req, res) => {
  const username = getUsernameFromRequest(req);
  const playlists = await getUserPlaylists(username);
  res.json(playlists);
}));

app.post('/api/playlists', requireLogin, asyncHandler(async (req, res) => {
  const { name } = req.body || {};
  const username = getUsernameFromRequest(req);

  if (!name || String(name).trim() === '') {
    return res.status(400).json({ error: 'Playlist name is required.' });
  }

  const newPlaylist = await createPlaylist(username, name);

  if (!newPlaylist) {
    return res.status(409).json({ error: 'Playlist name already exists.' });
  }

  res.status(201).json(newPlaylist);
}));

app.post('/api/music', requireLogin, asyncHandler(async (req, res) => {
  const { song, artist, genre } = req.body || {};
  const username = getUsernameFromRequest(req);

  if (!song || !artist || !genre) {
    return res.status(400).json({ error: 'Song, artist, and genre are required.' });
  }

  const records = await getUserPlaylist(username);
  const newRecord = {
    id: getNextId(records),
    song: String(song).trim(),
    artist: String(artist).trim(),
    genre: String(genre).trim(),
  };

  records.push(newRecord);
  await saveUserPlaylist(username, records);
  res.status(201).json(newRecord);
}));

app.get('/api/music/:id', requireLogin, asyncHandler(async (req, res) => {
  const username = getUsernameFromRequest(req);
  const records = await getUserPlaylist(username);
  const record = records.find((item) => item.id === Number(req.params.id));

  if (!record) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  res.json(record);
}));

app.put('/api/music/:id', requireLogin, asyncHandler(async (req, res) => {
  const { song, artist, genre } = req.body || {};
  const username = getUsernameFromRequest(req);

  if (!song || !artist || !genre) {
    return res.status(400).json({ error: 'Song, artist, and genre are required.' });
  }

  const records = await getUserPlaylist(username);
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

  await saveUserPlaylist(username, records);
  res.json(records[index]);
}));

app.delete('/api/music/:id', requireLogin, asyncHandler(async (req, res) => {
  const username = getUsernameFromRequest(req);
  const records = await getUserPlaylist(username);
  const filtered = records.filter((item) => item.id !== Number(req.params.id));

  if (filtered.length === records.length) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  await saveUserPlaylist(username, filtered);
  res.json({ message: 'Record deleted.' });
}));

app.get('/api/lookup', async (req, res) => {
  const term = req.query.term;

  if (!term || String(term).trim() === '') {
    return res.status(400).json({ error: 'Please enter a song or artist name.' });
  }

  const sources = [
    {
      name: 'AudioDB',
      url: `https://www.theaudiodb.com/api/v1/json/2/searchtrack.php?t=${encodeURIComponent(term)}`,
      parse: (data) => {
        const tracks = Array.isArray(data?.track) ? data.track : [];
        return tracks.slice(0, 10).map((item) => ({
          song: item.strTrack || 'Unknown track',
          artist: item.strArtist || 'Unknown artist',
          genre: item.strGenre || 'Unknown genre',
        }));
      },
    },
    {
      name: 'iTunes',
      url: `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=10`,
      parse: (data) => {
        const tracks = Array.isArray(data?.results) ? data.results : [];
        return tracks.slice(0, 10).map((item) => ({
          song: item.trackName || 'Unknown track',
          artist: item.artistName || 'Unknown artist',
          genre: item.primaryGenreName || 'Unknown genre',
        }));
      },
    },
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source.url);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const results = source.parse(data);

      if (results.length) {
        return res.json(results);
      }
    } catch (error) {
      console.error(`${source.name} lookup failed:`, error.message);
    }
  }

  return res.status(502).json({ error: 'Could not fetch music results from the available free APIs.' });
});

app.listen(port, () => {
  console.log(`Music Playlist app is running at http://localhost:${port}`);
});