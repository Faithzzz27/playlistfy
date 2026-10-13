CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  list_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  UNIQUE (user_id, list_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- list_id = 0 is the user's main playlist; list_id > 0 belongs to a named playlist
CREATE TABLE songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  list_id INT NOT NULL DEFAULT 0,
  song_id INT NOT NULL,
  song VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (username, password) VALUES
  ('demo', 'demo123'),
  ('spotifyfan', 'music123'),
  ('demouser', 'demo123'),
  ('faith', 'sy'),
  ('apple', 'secret123');

INSERT INTO songs (user_id, list_id, song_id, song, artist, genre)
SELECT id, 0, 1, 'Starlight', 'Muse', 'Rock' FROM users WHERE username = 'demo';
INSERT INTO songs (user_id, list_id, song_id, song, artist, genre)
SELECT id, 0, 2, 'Starlight', 'Muse', 'Rock' FROM users WHERE username = 'demo';
INSERT INTO songs (user_id, list_id, song_id, song, artist, genre)
SELECT id, 0, 3, 'Starlight', 'Muse', 'Rock' FROM users WHERE username = 'demo';
INSERT INTO songs (user_id, list_id, song_id, song, artist, genre)
SELECT id, 0, 1, 'Midnight City', 'M83', 'Synthpop' FROM users WHERE username = 'spotifyfan';
INSERT INTO songs (user_id, list_id, song_id, song, artist, genre)
SELECT id, 0, 1, 'hhj', 'hggh', 'tyry' FROM users WHERE username = 'faith';
INSERT INTO songs (user_id, list_id, song_id, song, artist, genre)
SELECT id, 0, 2, 'Saturn', 'SZA', 'R&B/Soul' FROM users WHERE username = 'faith';