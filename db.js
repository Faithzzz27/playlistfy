const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'playlistfy',
  waitForConnections: true,
  connectionLimit: 10,
});

async function findUserRow(username) {
  const name = String(username || '').trim();
  if (!name) return null;
  const [rows] = await pool.query(
    'SELECT id, username, password FROM users WHERE username = ?',
    [name]
  );
  return rows[0] || null;
}

async function loadSongs(userId, listId) {
  const [rows] = await pool.query(
    'SELECT song_id AS id, song, artist, genre FROM songs WHERE user_id = ? AND list_id = ? ORDER BY song_id',
    [userId, listId]
  );
  return rows;
}

async function loadPlaylists(userId) {
  const [lists] = await pool.query(
    'SELECT list_id AS id, name FROM playlists WHERE user_id = ? ORDER BY list_id',
    [userId]
  );
  for (const list of lists) {
    list.songs = await loadSongs(userId, list.id);
  }
  return lists;
}

async function insertSongs(conn, userId, listId, songs) {
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i] || {};
    await conn.query(
      'INSERT INTO songs (user_id, list_id, song_id, song, artist, genre) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, listId, Number(s.id) || i + 1, s.song || '', s.artist || '', s.genre || '']
    );
  }
}

async function getUserByUsername(username) {
  const row = await findUserRow(username);
  if (!row) return null;
  return {
    username: row.username,
    password: row.password,
    playlist: await loadSongs(row.id, 0),
    playlists: await loadPlaylists(row.id),
  };
}

async function createUser(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();
  if (!cleanUsername || !cleanPassword) return null;
  if (await findUserRow(cleanUsername)) return null;

  await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [
    cleanUsername,
    cleanPassword,
  ]);
  return { username: cleanUsername, password: cleanPassword, playlist: [], playlists: [] };
}

async function authenticateUser(username, password) {
  const user = await getUserByUsername(username);
  if (!user || user.password !== String(password || '').trim()) return null;
  return user;
}

async function getUserPlaylist(username) {
  const row = await findUserRow(username);
  return row ? loadSongs(row.id, 0) : [];
}

async function getUserPlaylists(username) {
  const row = await findUserRow(username);
  return row ? loadPlaylists(row.id) : [];
}

async function saveUserPlaylist(username, playlist) {
  const row = await findUserRow(username);
  if (!row) return false;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM songs WHERE user_id = ? AND list_id = 0', [row.id]);
    await insertSongs(conn, row.id, 0, Array.isArray(playlist) ? playlist : []);
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    console.error('saveUserPlaylist error:', error.message);
    return false;
  } finally {
    conn.release();
  }
}

async function saveUserPlaylists(username, playlists) {
  const row = await findUserRow(username);
  if (!row) return false;

  const list = Array.isArray(playlists) ? playlists : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM songs WHERE user_id = ? AND list_id <> 0', [row.id]);
    await conn.query('DELETE FROM playlists WHERE user_id = ?', [row.id]);
    for (let i = 0; i < list.length; i++) {
      const p = list[i] || {};
      const listId = Number(p.id) || i + 1;
      await conn.query(
        'INSERT INTO playlists (user_id, list_id, name) VALUES (?, ?, ?)',
        [row.id, listId, p.name || 'Untitled']
      );
      await insertSongs(conn, row.id, listId, Array.isArray(p.songs) ? p.songs : []);
    }
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    console.error('saveUserPlaylists error:', error.message);
    return false;
  } finally {
    conn.release();
  }
}

async function createPlaylist(username, name) {
  const cleanName = String(name || '').trim();
  const row = await findUserRow(username);
  if (!row || !cleanName) return null;

  const [dupes] = await pool.query(
    'SELECT 1 FROM playlists WHERE user_id = ? AND name = ?',
    [row.id, cleanName]
  );
  if (dupes.length > 0) return null;

  const [[{ nextId }]] = await pool.query(
    'SELECT COALESCE(MAX(list_id), 0) + 1 AS nextId FROM playlists WHERE user_id = ?',
    [row.id]
  );
  await pool.query('INSERT INTO playlists (user_id, list_id, name) VALUES (?, ?, ?)', [
    row.id,
    nextId,
    cleanName,
  ]);
  return { id: nextId, name: cleanName, songs: [] };
}

function getNextId(records) {
  return records.reduce((maxId, record) => Math.max(maxId, Number(record.id) || 0), 0) + 1;
}

module.exports = {
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