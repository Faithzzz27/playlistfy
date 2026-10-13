// Front-end logic for login flow, personalized playlists, and Spotify-style dashboard interactions.
const playlistList = document.getElementById('playlistList');
const musicForm = document.getElementById('musicForm');
const searchBtn = document.getElementById('searchBtn');
const searchTermInput = document.getElementById('searchTerm');
const searchResults = document.getElementById('searchResults');
const editForm = document.getElementById('editForm');
const loginForm = document.getElementById('loginForm');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const avatarButton = document.getElementById('avatarButton');
const accountMenu = document.getElementById('accountMenu'); 
const authStatus = document.getElementById('authStatus');
const moreOptionsBtn = document.getElementById('moreOptionsBtn');
const moreOptionsMenu = document.getElementById('moreOptionsMenu');
const playerBar = document.getElementById('playerBar');
const playerExpandBtn = document.getElementById('playerExpandBtn');
const playerCollapseBtn = document.getElementById('playerCollapseBtn');
const expandedPlayer = document.getElementById('expandedPlayer');
let menuInteractionLock = false;

function toggleMoreOptionsMenu(show, anchorElement = moreOptionsBtn) {
  if (!moreOptionsMenu) {
    return;
  }

  if (show) {
    menuInteractionLock = true;
    window.setTimeout(() => {
      menuInteractionLock = false;
    }, 0);
  }

  moreOptionsMenu.classList.toggle('hidden', !show);

  if (show && anchorElement) {
    const rect = anchorElement.getBoundingClientRect();
    moreOptionsMenu.style.left = `${Math.min(rect.left, window.innerWidth - 270)}px`;
    moreOptionsMenu.style.top = `${Math.max(14, rect.bottom + 12)}px`;
  }
}

function updateNowPlaying(song, artist, playlistLabel = 'Playlist') {
  const titleNode = document.querySelector('.track-details strong');
  const artistNode = document.querySelector('.track-details span');
  const playButton = document.querySelector('.play-btn');

  if (titleNode) {
    titleNode.textContent = song || 'Daily Mix';
  }

  if (artistNode) {
    artistNode.textContent = artist ? `${playlistLabel} • ${artist}` : playlistLabel;
  }

  if (playButton) {
    playButton.textContent = '❚❚';
    playButton.classList.add('is-playing');
  }
}

function setupPlayerControls() {
  const playButton = document.querySelector('.play-btn');
  const prevButton = document.querySelector('.ctrl-btn:nth-of-type(2)');
  const nextButton = document.querySelector('.ctrl-btn:nth-of-type(4)');
  const shuffleButton = document.querySelectorAll('.ctrl-btn').length ? Array.from(document.querySelectorAll('.ctrl-btn')).find((btn) => btn.textContent.includes('↺')) : null;
  const repeatButton = document.querySelectorAll('.ctrl-btn').length ? Array.from(document.querySelectorAll('.ctrl-btn')).find((btn) => btn.textContent.includes('↻')) : null;

  if (playButton) {
    playButton.addEventListener('click', () => {
      const isPlaying = playButton.classList.toggle('is-playing');
      playButton.textContent = isPlaying ? '❚❚' : '▶';
    });
  }

  if (shuffleButton) {
    shuffleButton.addEventListener('click', () => {
      shuffleButton.classList.toggle('active');
    });
  }

  if (repeatButton) {
    repeatButton.addEventListener('click', () => {
      repeatButton.classList.toggle('active');
    });
  }

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      const trackRows = document.querySelectorAll('.playlist-track-row');
      const activeRow = document.querySelector('.playlist-track-row.active-track');
      const index = activeRow ? Array.from(trackRows).indexOf(activeRow) : 0;
      const target = trackRows[index > 0 ? index - 1 : trackRows.length - 1];
      if (target) {
        target.click();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const trackRows = document.querySelectorAll('.playlist-track-row');
      const activeRow = document.querySelector('.playlist-track-row.active-track');
      const index = activeRow ? Array.from(trackRows).indexOf(activeRow) : 0;
      const target = trackRows[(index + 1) % trackRows.length];
      if (target) {
        target.click();
      }
    });
  }
}

function currentUsername() {
  return localStorage.getItem('musicUsername') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-User': currentUsername(),
  };
}

function updateAuthUI() {
  const username = currentUsername();

  if (authStatus) {
    authStatus.textContent = username ? `Signed in as: ${username}` : 'Not signed in';
  }

  if (logoutBtn) {
    logoutBtn.classList.toggle('hidden', !username);
  }

  if (avatarButton) {
    avatarButton.textContent = username ? username.charAt(0).toUpperCase() : 'M';
  }
}

function showStatusToast(message) {
  let toast = document.getElementById('statusToast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'statusToast';
    toast.className = 'status-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('visible');
  void toast.offsetWidth;
  toast.classList.add('visible');

  window.clearTimeout(showStatusToast.timeoutId);
  showStatusToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 1800);
}

function getSelectedPlaylistElement() {
  return document.querySelector('.library-item.selected-playlist') || document.querySelector('.library-item');
}

function syncSelectedPlaylistMeta(title, meta) {
  const selectedTitle = document.getElementById('selectedPlaylistTitle');
  const selectedMeta = document.getElementById('selectedPlaylistMeta');

  if (selectedTitle) {
    selectedTitle.textContent = title || 'My Playlist';
  }

  if (selectedMeta) {
    selectedMeta.textContent = meta || 'Your personalized mix';
  }
}

async function loadPlaylistLibrary() {
  const libraryList = document.querySelector('.library-list');

  if (!libraryList || !currentUsername()) {
    return;
  }

  try {
    const response = await fetch('/api/playlists', {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem('musicUsername');
      window.location.href = '/';
      return;
    }

    const playlists = await response.json();
    const defaultPlaylist = {
      id: 'default',
      name: 'My Playlist',
      songs: [],
    };
    const allPlaylists = [defaultPlaylist, ...(Array.isArray(playlists) ? playlists : [])];

    libraryList.innerHTML = allPlaylists
      .map(
        (playlist) => `
          <div class="library-item" draggable="true" data-draggable="library-item" data-playlist-id="${escapeHtml(String(playlist.id))}" data-playlist-name="${escapeHtml(playlist.name)}" data-playlist-meta="Playlist • ${playlist.songs?.length || 0} tracks">
            <span class="mini-icon purple">♪</span>
            <div>
              <strong>${escapeHtml(playlist.name)}</strong>
              <small>Playlist • ${playlist.songs?.length || 0} tracks</small>
            </div>
            <button class="playlist-menu-btn" aria-label="More options for ${escapeHtml(playlist.name)}">•••</button>
          </div>
        `
      )
      .join('');

    const selected = getSelectedPlaylistElement() || libraryList.querySelector('.library-item');
    if (selected) {
      selected.classList.add('selected-playlist');
      syncSelectedPlaylistMeta(selected.dataset.playlistName || 'My Playlist', selected.dataset.playlistMeta || 'Playlist • Your music');
    }

    initializeCustomDraggableLayout();
  } catch (error) {
    console.error('Load playlist library error:', error);
  }
}

function refreshPlaylistLibrary() {
  loadPlaylistLibrary();
}

function bindUtilityIcons() {
  const backButton = document.querySelector('.nav-cluster .icon-btn[aria-label="Go back"]');
  const forwardButton = document.querySelector('.nav-cluster .icon-btn[aria-label="Go forward"]');
  const addButton = document.querySelector('.header-actions .icon-btn[aria-label="Add"]');
  const browseButton = document.querySelector('.header-actions .icon-btn[aria-label="Browse"]');
  const savedSongsButton = document.querySelector('.header-icons .icon-btn[aria-label="Saved songs"]');
  const notificationButton = document.querySelector('.header-icons .icon-btn[aria-label="Notifications"]');
  const minimizeButton = document.querySelector('.header-icons .icon-btn[aria-label="Minimize"]');
  const closeButton = document.querySelector('.header-icons .icon-btn[aria-label="Close"]');
  const exitButton = document.querySelector('.header-icons .icon-btn[aria-label="Exit"]');
  const playlistItems = Array.from(document.querySelectorAll('.library-item'));

  function selectPlaylistAt(offset) {
    const selection = document.querySelector('.library-item.selected-playlist') || playlistItems[0];
    const currentIndex = playlistItems.indexOf(selection);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + offset + playlistItems.length) % playlistItems.length;
    const target = playlistItems[nextIndex];
    if (target) {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  }

  if (backButton) {
    backButton.addEventListener('click', () => selectPlaylistAt(-1));
  }

  if (forwardButton) {
    forwardButton.addEventListener('click', () => selectPlaylistAt(1));
  }

  if (addButton) {
    addButton.addEventListener('click', () => {
      showStatusToast('New playlist created');
    });
  }

  if (browseButton) {
    browseButton.addEventListener('click', () => {
      const searchInput = document.getElementById('searchTerm');
      if (searchInput) {
        searchInput.focus();
      }
      showStatusToast('Browsing your library');
    });
  }

  if (savedSongsButton) {
    savedSongsButton.addEventListener('click', () => {
      savedSongsButton.classList.toggle('is-active');
      showStatusToast(savedSongsButton.classList.contains('is-active') ? 'Saved songs enabled' : 'Saved songs disabled');
    });
  }

  if (notificationButton) {
    notificationButton.addEventListener('click', () => {
      notificationButton.classList.toggle('is-active');
      showStatusToast(notificationButton.classList.contains('is-active') ? 'Notifications on' : 'Notifications off');
    });
  }

  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      document.querySelector('.spotify-desktop')?.classList.toggle('app-minimized');
      showStatusToast('Player minimized');
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      document.querySelector('.spotify-desktop')?.classList.toggle('window-closed');
      showStatusToast('Window closed');
    });
  }

  if (exitButton) {
    exitButton.addEventListener('click', () => {
      showStatusToast('Leaving app');
      setTimeout(() => {
        window.location.href = '/';
      }, 250);
    });
  }
}

function requireLogin() {
  if (!currentUsername()) {
    alert('Please login to access your playlist.');
    return false;
  }

  return true;
}

async function handleAuthRequest(endpoint, payload, mode) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `${mode} failed.`);
  }

  return result;
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
      alert('Please enter a username and password.');
      return;
    }

    try {
      const result = await handleAuthRequest('/api/login', { username, password }, 'Login');
      localStorage.setItem('musicUsername', result.username);
      loginForm.reset();
      window.location.href = '/index.html';
    } catch (error) {
      alert(error.message);
    }
  });

  if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      if (!username || !password) {
        alert('Please enter a username and password to create an account.');
        return;
      }

      try {
        const result = await handleAuthRequest('/api/register', { username, password }, 'Registration');
        localStorage.setItem('musicUsername', result.username);
        loginForm.reset();
        window.location.href = '/index.html';
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

if (avatarButton) {
  avatarButton.addEventListener('click', () => {
    if (accountMenu) {
      accountMenu.classList.toggle('hidden');
    }
  });
}

if (moreOptionsBtn) {
  moreOptionsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const isHidden = moreOptionsMenu && moreOptionsMenu.classList.contains('hidden');
    toggleMoreOptionsMenu(Boolean(isHidden), moreOptionsBtn);
  });
}

function bindPlaylistMenuButtons() {
  document.querySelectorAll('.playlist-menu-btn').forEach((button) => {
    if (button.dataset.menuBound === 'true') {
      return;
    }

    button.dataset.menuBound = 'true';

    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const row = button.closest('.playlist-track-row');
      if (row) {
        document.querySelectorAll('.playlist-track-row').forEach((trackRow) => trackRow.classList.remove('active-track'));
        row.classList.add('active-track');
      }

      const isHidden = moreOptionsMenu && moreOptionsMenu.classList.contains('hidden');
      toggleMoreOptionsMenu(Boolean(isHidden), button);
    };

    button.oncontextmenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const row = button.closest('.playlist-track-row');
      if (row) {
        document.querySelectorAll('.playlist-track-row').forEach((trackRow) => trackRow.classList.remove('active-track'));
        row.classList.add('active-track');
      }

      toggleMoreOptionsMenu(true, button);
    };
  });
}

bindPlaylistMenuButtons();

if (moreOptionsMenu) {
  moreOptionsMenu.addEventListener('click', async (event) => {
    const button = event.target.closest('.menu-item');

    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const selectedItem = getSelectedPlaylistElement();
    const selectedTrackRow = document.querySelector('.playlist-track-row.active-track');
    const selectedTitle = selectedItem?.dataset.playlistName || selectedTrackRow?.dataset.trackName || 'My Playlist';
    const selectedMeta = selectedItem?.dataset.playlistMeta || selectedTrackRow?.dataset.trackArtist || 'Playlist • Your music';

    if (action === 'edit-song' && selectedTrackRow?.dataset.trackId) {
      window.location.href = `/edit.html?id=${encodeURIComponent(selectedTrackRow.dataset.trackId)}`;
      return;
    }

    if (action === 'delete-song' && selectedTrackRow?.dataset.trackId) {
      const recordId = Number(selectedTrackRow.dataset.trackId);
      const trackName = selectedTrackRow.dataset.trackName || 'this song';

      if (!window.confirm(`Delete "${trackName}" from your playlist?`)) {
        toggleMoreOptionsMenu(false);
        return;
      }

      try {
        await deleteSongFromPlaylist(recordId);
      } catch (error) {
        console.error('Delete song failed:', error);
      }
      return;
    }

    if (action === 'add-to-queue') {
      const currentSong = selectedTrackRow?.dataset.trackName || document.querySelector('.track-details strong')?.textContent || selectedTitle;
      const currentArtist = selectedTrackRow?.dataset.trackArtist || document.querySelector('.track-details span')?.textContent || 'Playlist';
      showStatusToast(`Added “${currentSong}” to queue`);
      const queueList = JSON.parse(localStorage.getItem('musicQueue') || '[]');
      queueList.push({ song: currentSong, artist: currentArtist });
      localStorage.setItem('musicQueue', JSON.stringify(queueList));
    }

    if (action === 'start-jam') {
      localStorage.setItem('musicJam', 'true');
      showStatusToast('Jam started');
    }

    if (action === 'remove-from-profile') {
      if (selectedItem) {
        selectedItem.remove();
        refreshPlaylistLibrary();
      }
      showStatusToast('Playlist removed from profile');
    }

    if (action === 'edit-details') {
      const nextName = window.prompt('Rename playlist', selectedTitle || 'My Playlist');
      if (nextName && selectedItem) {
        selectedItem.dataset.playlistName = nextName.trim();
        selectedItem.querySelector('strong').textContent = nextName.trim();
        selectedItem.dataset.playlistMeta = selectedMeta;
        syncSelectedPlaylistMeta(nextName.trim(), selectedMeta);
        showStatusToast('Playlist renamed');
      }
    }

    if (action === 'create-playlist') {
      const nextName = window.prompt('Name your playlist', 'New Playlist');
      const trimmedName = nextName ? nextName.trim() : '';

      if (!trimmedName) {
        toggleMoreOptionsMenu(false);
        return;
      }

      try {
        const response = await fetch('/api/playlists', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: trimmedName }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Could not create the playlist.');
        }

        await loadPlaylistLibrary();
        syncSelectedPlaylistMeta(result.name, 'Playlist • 0 tracks');
        showStatusToast('Playlist created');
      } catch (error) {
        showStatusToast(error.message);
      }
    }

    if (action === 'make-private') {
      const privateLabel = selectedMeta.includes('Private') ? selectedMeta.replace('Private • ', '') : `Private • ${selectedMeta}`;
      if (selectedItem) {
        selectedItem.dataset.playlistMeta = privateLabel;
        const small = selectedItem.querySelector('small');
        if (small) {
          small.textContent = privateLabel;
        }
      }
      syncSelectedPlaylistMeta(selectedTitle, privateLabel);
      showStatusToast('Playlist made private');
    }

    if (action === 'invite-collaborators') {
      const email = window.prompt('Invite a collaborator by email', 'friend@example.com');
      if (email) {
        showStatusToast(`Invitation sent to ${email}`);
      }
    }

    if (action === 'delete-playlist') {
      if (selectedItem) {
        selectedItem.remove();
        refreshPlaylistLibrary();
      }
      showStatusToast('Playlist deleted');
    }

    button.blur();
    toggleMoreOptionsMenu(false);
  });
}

document.addEventListener('contextmenu', (event) => {
  if (!moreOptionsMenu) {
    return;
  }

  const playlistBtn = event.target.closest('.playlist-menu-btn');
  const playlistItem = event.target.closest('.library-item');
  const anchor = playlistBtn || (playlistItem ? playlistItem.querySelector('.playlist-menu-btn') : moreOptionsBtn);

  const isInsideSidebar = event.target.closest('.sidebar, .nav-cluster, .library-panel');
  if (!isInsideSidebar) {
    return;
  }

  event.preventDefault();
  toggleMoreOptionsMenu(true, anchor || moreOptionsBtn);
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('musicUsername');
    if (accountMenu) {
      accountMenu.classList.add('hidden');
    }
    window.location.href = '/';
  });
}

async function loadPlaylist() {
  if (!playlistList) {
    return;
  }

  if (!requireLogin()) {
    return;
  }

  try {
    const response = await fetch('/api/music', {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem('musicUsername');
      window.location.href = '/';
      return;
    }

    const records = await response.json();

    if (!records.length) {
      renderPlaylistSelection('My Playlist', 'Playlist • Your music', []);
      return;
    }

    renderPlaylistSelection('My Playlist', 'Playlist • Your music', records);
    updateNowPlaying(records[0].song, records[0].artist, 'My Playlist');
  } catch (error) {
    playlistList.innerHTML = `
      <div class="playlist-card" draggable="true" data-draggable="playlist-card">
        <div class="playlist-art"></div>
        <div>
          <strong>Unable to load playlist</strong>
          <small>Please try again</small>
        </div>
      </div>
    `;
    initializeCustomDraggableLayout();
    console.error('Load playlist error:', error);
  }
}

const predefinedPlaylists = {
  'Liked Songs': [],
  'Old but Gold': [],
  'ROADTRIP OPM 90s': [],
  'This is LANY': [],
  KALEY: [],
  'Father Figure': [],
};

function renderPlaylistSelection(title, meta, tracks) {
  const bannerTitle = document.getElementById('selectedPlaylistTitle');
  const bannerMeta = document.getElementById('selectedPlaylistMeta');

  if (bannerTitle) {
    bannerTitle.textContent = title;
  }

  if (bannerMeta) {
    bannerMeta.textContent = meta;
  }

  if (!playlistList) {
    return;
  }

  if (!tracks || !tracks.length) {
    playlistList.innerHTML = `
      <div class="playlist-card" draggable="true" data-draggable="playlist-card">
        <div class="playlist-art"></div>
        <div>
          <strong>No tracks here</strong>
          <small>Try another playlist</small>
        </div>
      </div>
    `;
    initializeCustomDraggableLayout();
    return;
  }

  playlistList.classList.add('playlist-track-list');
  playlistList.innerHTML = `
    <div class="playlist-track-header">
      <span>#</span>
      <span>Title</span>
      <span>Artist</span>
      <span>Duration</span>
      <span></span>
    </div>
    ${tracks
      .map(
        (track, index) => `
          <div class="playlist-track-row" draggable="true" data-draggable="playlist-track-row" data-track-id="${escapeHtml(track.id)}" data-track-name="${escapeHtml(track.song)}" data-track-artist="${escapeHtml(track.artist)}" data-track-duration="${escapeHtml(track.duration || '3:30')}">
            <span class="track-number">${index + 1}</span>
            <div class="track-main">
              <div class="track-art" style="background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(66,123,255,0.9));"></div>
              <div class="track-copy">
                <strong>${escapeHtml(track.song)}</strong>
              </div>
            </div>
            <span class="track-artist">${escapeHtml(track.artist)}</span>
            <span class="track-duration">${escapeHtml(track.duration || '3:30')}</span>
            <button class="track-menu-btn playlist-menu-btn" aria-label="More options for ${escapeHtml(track.song)}">•••</button>
          </div>
        `
      )
      .join('')}
  `;

  initializeCustomDraggableLayout();
  playlistList.querySelectorAll('.track-menu-btn').forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const row = button.closest('.playlist-track-row');
      if (row) {
        document.querySelectorAll('.playlist-track-row').forEach((trackRow) => trackRow.classList.remove('active-track'));
        row.classList.add('active-track');
      }
      const isHidden = moreOptionsMenu && moreOptionsMenu.classList.contains('hidden');
      toggleMoreOptionsMenu(Boolean(isHidden), button);
    };

    button.oncontextmenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const row = button.closest('.playlist-track-row');
      if (row) {
        document.querySelectorAll('.playlist-track-row').forEach((trackRow) => trackRow.classList.remove('active-track'));
        row.classList.add('active-track');
      }
      toggleMoreOptionsMenu(true, button);
    };
  });
  setupPlayerControls();
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function initializeCustomDraggableLayout() {
  const dragTargets = document.querySelectorAll('[data-draggable]');

  dragTargets.forEach((element) => {
    if (element.dataset.dragBound === 'true') {
      return;
    }

    element.dataset.dragBound = 'true';
    element.setAttribute('draggable', 'true');

    element.addEventListener('click', () => {
      if (element.classList.contains('playlist-track-row')) {
        const song = element.querySelector('.track-copy strong')?.textContent || 'Unknown track';
        const artist = element.querySelector('.track-artist')?.textContent || 'Artist';
        const playlistName = document.getElementById('selectedPlaylistTitle')?.textContent || 'Playlist';

        document.querySelectorAll('.playlist-track-row').forEach((row) => row.classList.remove('active-track'));
        element.classList.add('active-track');
        updateNowPlaying(song, artist, playlistName);
        return;
      }

      const title = element.dataset.playlistName || element.querySelector('strong')?.textContent || 'Playlist';
      const meta = element.dataset.playlistMeta || 'Your personalized mix';
      const bannerTitle = document.getElementById('selectedPlaylistTitle');
      const bannerMeta = document.getElementById('selectedPlaylistMeta');

      if (bannerTitle) {
        bannerTitle.textContent = title;
      }

      if (bannerMeta) {
        bannerMeta.textContent = meta;
      }

      const playlistTracks = predefinedPlaylists[title] || [
        { song: title, artist: 'Playlist', genre: 'Custom', duration: '3:30' },
      ];

      renderPlaylistSelection(title, meta, playlistTracks);
      updateNowPlaying(playlistTracks[0]?.song || title, playlistTracks[0]?.artist || 'Playlist', title);

      document.querySelectorAll('.library-item, .playlist-card').forEach((item) => item.classList.remove('selected-playlist'));
      element.classList.add('selected-playlist');
    });

    element.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', element.dataset.draggable);
      element.classList.add('dragging');
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      document.querySelectorAll('.drop-target').forEach((item) => item.classList.remove('drop-target'));
    });

    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      const parent = element.parentElement;
      if (parent) {
        parent.querySelectorAll('.drop-target').forEach((item) => item.classList.remove('drop-target'));
      }
      element.classList.add('drop-target');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('drop-target');
    });

    element.addEventListener('drop', (event) => {
      event.preventDefault();
      const draggedElement = document.querySelector('.dragging');
      if (!draggedElement || draggedElement === element) {
        return;
      }

      const parent = element.parentElement;
      if (parent) {
        parent.insertBefore(draggedElement, element);
      }

      element.classList.remove('drop-target');
      draggedElement.classList.remove('dragging');
    });
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function addSongToPlaylist(song, artist, genre) {
  if (!requireLogin()) {
    return;
  }

  const payload = { song, artist, genre };

  try {
    const response = await fetch('/api/music', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not save the song.');
    }

    showStatusToast(`${song} added to your playlist`);
    await loadPlaylist();
    return result;
  } catch (error) {
    showStatusToast(error.message);
    throw error;
  }
}

async function editSongInPlaylist(id, song, artist, genre) {
  if (!requireLogin()) {
    return;
  }

  const payload = { song, artist, genre };

  try {
    const response = await fetch(`/api/music/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not update the song.');
    }

    showStatusToast(`${song} updated`);
    await loadPlaylist();
    return result;
  } catch (error) {
    showStatusToast(error.message);
    throw error;
  }
}

async function deleteSongFromPlaylist(id) {
  if (!requireLogin()) {
    return;
  }

  try {
    const response = await fetch(`/api/music/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not delete the song.');
    }

    showStatusToast('Song deleted');
    await loadPlaylist();
    return result;
  } catch (error) {
    showStatusToast(error.message);
    throw error;
  }
}

if (musicForm) {
  musicForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const song = document.getElementById('song')?.value.trim();
    const artist = document.getElementById('artist')?.value.trim();
    const genre = document.getElementById('genre')?.value.trim();

    if (!song || !artist || !genre) {
      showStatusToast('Please fill in all song fields.');
      return;
    }

    try {
      await addSongToPlaylist(song, artist, genre);
      musicForm.reset();
    } catch (error) {
      console.error('Add song failed:', error);
    }
  });
}

if (searchBtn && searchTermInput) {
  searchBtn.addEventListener('click', async () => {
    if (!requireLogin()) {
      return;
    }

    const term = searchTermInput.value.trim();

    if (!term) {
      showStatusToast('Enter a song or artist to search.');
      return;
    }

    try {
      const response = await fetch(`/api/lookup?term=${encodeURIComponent(term)}`);
      const results = await response.json();

      if (!response.ok) {
        throw new Error(results.error || 'Lookup failed');
      }

      if (!results.length) {
        searchResults.innerHTML = '<p>No results found from iTunes.</p>';
        return;
      }

      searchResults.innerHTML = results
        .map(
          (item) => `
            <div class="result-item">
              <p><strong>Track:</strong> ${escapeHtml(item.song)}</p>
              <p><strong>Artist:</strong> ${escapeHtml(item.artist)}</p>
              <p><strong>Genre:</strong> ${escapeHtml(item.genre)}</p>
              <button class="use-result" data-song="${encodeURIComponent(item.song)}" data-artist="${encodeURIComponent(item.artist)}" data-genre="${encodeURIComponent(item.genre)}">Use this song</button>
            </div>
          `
        )
        .join('');

      document.querySelectorAll('.use-result').forEach((button) => {
        button.addEventListener('click', async () => {
          const song = decodeURIComponent(button.dataset.song || '');
          const artist = decodeURIComponent(button.dataset.artist || '');
          const genre = decodeURIComponent(button.dataset.genre || '');

          if (document.getElementById('song')) {
            document.getElementById('song').value = song;
            document.getElementById('artist').value = artist;
            document.getElementById('genre').value = genre;
          }

          try {
            await addSongToPlaylist(song, artist, genre);
          } catch (error) {
            console.error('Use this song failed:', error);
          }
        });
      });
    } catch (error) {
      searchResults.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    }
  });

  searchTermInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchBtn.click();
    }
  });
}

function decodeHtml(value) {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = value;
  return textArea.value;
}

if (editForm) {
  const params = new URLSearchParams(window.location.search);
  const recordId = Number(params.get('id'));

  if (!recordId || Number.isNaN(recordId)) {
    showStatusToast('No song selected for editing.');
    window.location.href = '/index.html';
  } else {
    async function loadTrackForEditing() {
      try {
        const response = await fetch(`/api/music/${recordId}`, {
          headers: authHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Song could not be loaded.');
        }

        const songField = document.getElementById('song');
        const artistField = document.getElementById('artist');
        const genreField = document.getElementById('genre');

        if (songField) songField.value = result.song || '';
        if (artistField) artistField.value = result.artist || '';
        if (genreField) genreField.value = result.genre || '';
      } catch (error) {
        console.error('Load track for editing failed:', error);
        showStatusToast(error.message);
      }
    }

    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const song = document.getElementById('song')?.value.trim();
      const artist = document.getElementById('artist')?.value.trim();
      const genre = document.getElementById('genre')?.value.trim();

      if (!song || !artist || !genre) {
        showStatusToast('Please fill in all song fields.');
        return;
      }

      try {
        await editSongInPlaylist(recordId, song, artist, genre);
        window.location.href = '/index.html';
      } catch (error) {
        console.error('Edit song failed:', error);
      }
    });

    loadTrackForEditing();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = window.location.pathname === '/' || window.location.pathname.endsWith('/login.html');

  if (isLoginPage) {
    if (currentUsername()) {
      window.location.href = '/index.html';
    }
    return;
  }

  if (!currentUsername()) {
    window.location.href = '/';
    return;
  }

  updateAuthUI();
  bindUtilityIcons();
  initializeCustomDraggableLayout();
  loadPlaylistLibrary();
  loadPlaylist();
});
