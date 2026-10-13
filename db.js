const fs = require('fs');
const path = require('path');

const dbFilePath = path.join(__dirname, 'data', 'musicPlaylist.json');

function ensureDatabase() {
  const directory = path.dirname(dbFilePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(
      dbFilePath,
      JSON.stringify(
        [
          {
            username: 'demo',
            password: 'demo123',
            playlist: [],
          },
        ],
        null,
        2
      ),
      'utf8'
    );
  }
}

function readUsers() {
  ensureDatabase();

  try {
    const fileData = fs.readFileSync(dbFilePath, 'utf8');
    const parsedData = JSON.parse(fileData);

    if (!Array.isArray(parsedData)) {
      return [];
    }

    if (!parsedData.some((item) => item && typeof item.username === 'string')) {
      const migratedUsers = [
        {
          username: 'demo',
          password: 'demo123',
          playlist: parsedData.map((item) => ({
            id: Number(item.id) || 1,
            song: item.song || '',
            artist: item.artist || '',
            genre: item.genre || '',
          })),
        },
      ];

      writeUsers(migratedUsers);
      return migratedUsers;
    }

    return parsedData;
  } catch (error) {
    console.error('Error reading database:', error.message);
    return [];
  }
}

function writeUsers(users) {
  ensureDatabase();
  fs.writeFileSync(dbFilePath, JSON.stringify(users, null, 2), 'utf8');
}

function getUserByUsername(username) {
  const searchName = String(username || '').trim();
  if (!searchName) {
    return null;
  }

  return readUsers().find((user) => user.username.toLowerCase() === searchName.toLowerCase()) || null;
}

function createUser(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return null;
  }

  const users = readUsers();

  if (getUserByUsername(cleanUsername)) {
    return null;
  }

  const newUser = {
    username: cleanUsername,
    password: cleanPassword,
    playlist: [],
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
}

function authenticateUser(username, password) {
  const user = getUserByUsername(username);
  if (!user || user.password !== String(password || '').trim()) {
    return null;
  }

  return user;
}

function getUserPlaylist(username) {
  const user = getUserByUsername(username);
  return user ? user.playlist : [];
}

function getUserPlaylists(username) {
  const user = getUserByUsername(username);

  if (!user) {
    return [];
  }

  if (!Array.isArray(user.playlists)) {
    user.playlists = [];
  }

  return user.playlists;
}

function saveUserPlaylist(username, playlist) {
  const users = readUsers();
  const index = users.findIndex((user) => user.username.toLowerCase() === String(username || '').trim().toLowerCase());

  if (index === -1) {
    return false;
  }

  users[index].playlist = Array.isArray(playlist) ? playlist : [];
  writeUsers(users);
  return true;
}

function saveUserPlaylists(username, playlists) {
  const users = readUsers();
  const index = users.findIndex((user) => user.username.toLowerCase() === String(username || '').trim().toLowerCase());

  if (index === -1) {
    return false;
  }

  users[index].playlists = Array.isArray(playlists) ? playlists : [];
  writeUsers(users);
  return true;
}

function createPlaylist(username, name) {
  const cleanUsername = String(username || '').trim();
  const cleanName = String(name || '').trim();

  if (!cleanUsername || !cleanName) {
    return null;
  }

  const users = readUsers();
  const index = users.findIndex((user) => user.username.toLowerCase() === cleanUsername.toLowerCase());

  if (index === -1) {
    return null;
  }

  const user = users[index];
  if (!Array.isArray(user.playlists)) {
    user.playlists = [];
  }

  const duplicate = user.playlists.some((playlist) => playlist.name.toLowerCase() === cleanName.toLowerCase());
  if (duplicate) {
    return null;
  }

  const newPlaylist = {
    id: user.playlists.reduce((maxId, playlist) => Math.max(maxId, Number(playlist.id) || 0), 0) + 1,
    name: cleanName,
    songs: [],
  };

  user.playlists.push(newPlaylist);
  writeUsers(users);
  return newPlaylist;
}

function getNextId(records) {
  return records.reduce((maxId, record) => Math.max(maxId, Number(record.id) || 0), 0) + 1;
}

module.exports = {
  readUsers,
  writeUsers,
  createUser,
  authenticateUser,
  getUserByUsername,
  getUserPlaylist,
  getUserPlaylists,
  saveUserPlaylist,
  saveUserPlaylists,
  createPlaylist,
  getNextId,
};
