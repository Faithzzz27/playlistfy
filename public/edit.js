// edit.js - Handles editing a song record
const editForm = document.getElementById('editForm');
const editError = document.getElementById('editError');
const songInput = document.getElementById('song');
const artistInput = document.getElementById('artist');
const genreInput = document.getElementById('genre');

const params = new URLSearchParams(window.location.search);
const songId = Number(params.get('id'));
const listId = params.get('list') || 'main';

if (!songId || Number.isNaN(songId)) {
  window.location.href = '/index.html';
}

function showError(msg) {
  if (editError) {
    editError.textContent = msg;
    editError.classList.toggle('hidden', !msg);
  } else {
    alert(msg);
  }
}

// Load song data into form
async function loadSong() {
  try {
    const song = await api(`/api/music/${songId}?list=${encodeURIComponent(listId)}`);
    songInput.value = song.song || '';
    artistInput.value = song.artist || '';
    genreInput.value = song.genre || '';
  } catch (err) {
    showError(err.message || 'Could not load song details.');
  }
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const song = songInput.value.trim();
  const artist = artistInput.value.trim();
  const genre = genreInput.value.trim();

  if (!song || !artist || !genre) {
    showError('All fields (Song, Artist, Genre) are required.');
    return;
  }

  try {
    await api(`/api/music/${songId}?list=${encodeURIComponent(listId)}`, {
      method: 'PUT',
      body: JSON.stringify({ song, artist, genre }),
    });

    // Return to that particular playlist
    window.location.href = `/index.html?list=${encodeURIComponent(listId)}`;
  } catch (err) {
    showError(err.message || 'Failed to update song.');
  }
});

loadSong();
