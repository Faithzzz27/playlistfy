// app.js - Full frontend logic for Playlistfy
// UI Rehaul with Lucide Icons, interactive modals, volume slider, favorites filtering,
// full HTML5 audio streaming from iTunes, and 100% working button interactions.

// State
let currentListId = 'main';
let currentPlaylistName = 'My Playlist';
let allPlaylists = [];
let currentSongs = [];
let playQueue = [];
let currentTrackIndex = -1;
let currentPlayingTrack = null;
let isShuffle = false;
let isRepeat = false;
let activeContextTrack = null;
let likedTrackIds = new Set();
let isShowingLikedOnly = false;
let isJamActive = false;
let isPrivateSession = false;
let notifications = [
  { title: 'System initialized', text: 'Connected to JSON database & iTunes API', time: 'Just now' }
];

// Audio player instance
const audio = new Audio();
audio.preload = 'auto';
audio.volume = 0.8;

// Helper to re-render Lucide icons
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Push notification
function addNotification(title, text) {
  notifications.unshift({
    title,
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notificationList');
  if (!container) return;
  container.innerHTML = notifications.slice(0, 15).map(n => `
    <div class="notification-item">
      <i data-lucide="info" style="color: var(--green); margin-top: 2px;"></i>
      <div>
        <div style="font-weight: 600;">${escapeHtml(n.title)}</div>
        <div style="color: var(--soft);">${escapeHtml(n.text)}</div>
        <div class="time">${escapeHtml(n.time)}</div>
      </div>
    </div>
  `).join('');
  refreshIcons();
}

// Modal helpers
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.remove('hidden');
    refreshIcons();
  }
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('hidden');
}

// DOM Elements
const libraryList = document.querySelector('.library-list');
const playlistList = document.getElementById('playlistList');
const musicForm = document.getElementById('musicForm');
const musicFormPanel = document.getElementById('musicFormPanel');
const searchTermInput = document.getElementById('searchTerm');
const searchClearBtn = document.getElementById('searchClearBtn');
const searchSpinner = document.getElementById('searchSpinner');
const searchSection = document.getElementById('searchSection');
const searchResults = document.getElementById('searchResults');
const featuredSection = document.querySelector('.featured-section');
const selectedPlaylistBanner = document.getElementById('selectedPlaylistBanner');
const moreOptionsBtn = document.getElementById('moreOptionsBtn');
const moreOptionsMenu = document.getElementById('moreOptionsMenu');
const avatarButton = document.getElementById('avatarButton');
const accountMenu = document.getElementById('accountMenu');
const logoutBtn = document.getElementById('logoutBtn');
const addPlaylistBtn = document.getElementById('addPlaylistBtn');
const browseBtn = document.getElementById('browseBtn');
const navBackBtn = document.getElementById('navBackBtn');
const navForwardBtn = document.getElementById('navForwardBtn');
const savedSongsBtn = document.getElementById('savedSongsBtn');
const notificationBtn = document.getElementById('notificationBtn');
const notificationPopup = document.getElementById('notificationPopup');
const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const exitBtn = document.getElementById('exitBtn');

// View Elements
const homeView = document.getElementById('homeView');
const playlistView = document.getElementById('playlistView');
const sidebarHomeBtn = document.getElementById('sidebarHomeBtn');
const sidebarSearchBtn = document.getElementById('sidebarSearchBtn');
const playlistBackBtn = document.getElementById('playlistBackBtn');
const playlistBreadcrumb = document.getElementById('playlistBreadcrumb');
const bannerImportBtn = document.getElementById('bannerImportBtn');
const playlistTypeBadge = document.getElementById('playlistTypeBadge');
const homeUserPlaylistsGrid = document.getElementById('homeUserPlaylistsGrid');
const homeStatSongCount = document.getElementById('homeStatSongCount');
const homeStatPlCount = document.getElementById('homeStatPlCount');
const homeGreetingTitle = document.getElementById('homeGreetingTitle');
let currentCuratedPlaylist = null;
let currentView = 'home';

// Banner Elements
const bannerTitle = document.getElementById('selectedPlaylistTitle');
const bannerMeta = document.getElementById('selectedPlaylistMeta');
const bannerCover = document.getElementById('selectedPlaylistCover');
const bannerPlayAllBtn = document.getElementById('bannerPlayAllBtn');
const bannerShuffleBtn = document.getElementById('bannerShuffleBtn');
const bannerAddSongBtn = document.getElementById('bannerAddSongBtn');
const bannerChangeCoverBtn = document.getElementById('bannerChangeCoverBtn');
const jamSessionBadge = document.getElementById('jamSessionBadge');

// Change Playlist Cover Modal Elements
const changeCoverForm = document.getElementById('changeCoverForm');
const coverPreviewBox = document.getElementById('coverPreviewBox');
const coverFileInput = document.getElementById('coverFileInput');
const coverUploadTriggerBtn = document.getElementById('coverUploadTriggerBtn');
const coverUrlInput = document.getElementById('coverUrlInput');
const coverSuggestionsGrid = document.getElementById('coverSuggestionsGrid');
const resetCoverBtn = document.getElementById('resetCoverBtn');
let pendingCoverValue = '';

function getCoverCssStyle(coverValue, fallbackGradient = 'linear-gradient(135deg, #7c3aed, #06b6d4)') {
  const val = String(coverValue || '').trim();
  if (!val) return `background-image: ${fallbackGradient};`;
  if (val.startsWith('linear-gradient') || val.startsWith('radial-gradient')) {
    return `background-image: ${val};`;
  }
  const safeUrl = val.replace(/["'\\]/g, '\\$&');
  return `background-image: url('${safeUrl}'); background-size: cover; background-position: center;`;
}

function applyCoverBackground(elem, coverValue, fallbackGradient = 'linear-gradient(135deg, #7c3aed, #06b6d4)') {
  if (!elem) return;
  const val = String(coverValue || '').trim();
  if (!val) {
    elem.style.backgroundImage = fallbackGradient;
    elem.style.backgroundSize = 'cover';
    elem.style.backgroundPosition = 'center';
  } else if (val.startsWith('linear-gradient') || val.startsWith('radial-gradient')) {
    elem.style.backgroundImage = val;
    elem.style.backgroundSize = 'cover';
    elem.style.backgroundPosition = 'center';
  } else {
    elem.style.backgroundImage = `url("${val.replace(/"/g, '\\"')}")`;
    elem.style.backgroundSize = 'cover';
    elem.style.backgroundPosition = 'center';
  }
}

// Player Elements (Sticky footer)
const playerBar = document.getElementById('playerBar');
const playerMiniArt = document.getElementById('playerMiniArt');
const playerTrackTitle = document.getElementById('playerTrackTitle');
const playerTrackArtist = document.getElementById('playerTrackArtist');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const playerCurrentTime = document.getElementById('playerCurrentTime');
const playerTotalTime = document.getElementById('playerTotalTime');
const playerProgressBar = document.getElementById('playerProgressBar');
const playerProgressFill = document.getElementById('playerProgressFill');
const likeBtn = document.getElementById('likeBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');
const playerExpandBtn = document.getElementById('playerExpandBtn');
const playerCollapseBtn = document.getElementById('playerCollapseBtn');

// Expanded Player Elements
const expandedPlayer = document.getElementById('expandedPlayer');
const expandedArt = document.getElementById('expandedArt');
const expandedTitle = document.getElementById('expandedTitle');
const expandedArtist = document.getElementById('expandedArtist');
const expPlayBtn = document.getElementById('expPlayBtn');
const expPrevBtn = document.getElementById('expPrevBtn');
const expNextBtn = document.getElementById('expNextBtn');
const expShuffleBtn = document.getElementById('expShuffleBtn');
const expRepeatBtn = document.getElementById('expRepeatBtn');
const expCurrentTime = document.getElementById('expCurrentTime');
const expTotalTime = document.getElementById('expTotalTime');
const expProgressBar = document.getElementById('expProgressBar');
const expProgressFill = document.getElementById('expProgressFill');

// Right Rail Elements
const railAlbumArt = document.getElementById('railAlbumArt');
const railTrackTitle = document.getElementById('railTrackTitle');
const railTrackArtist = document.getElementById('railTrackArtist');
const railPlayBtn = document.getElementById('railPlayBtn');

// ==========================================
// 1. AUTHENTICATION & INITIALIZATION
// ==========================================

function initAuth() {
  const username = currentUsername();
  if (avatarButton && username) {
    avatarButton.textContent = username.charAt(0).toUpperCase();
  }
  return true;
}

// ==========================================
// 2. REAL AUDIO PLAYBACK & AUDIO CONTROLS
// ==========================================

function updatePlayerUI(track, isPlayingState) {
  const title = track ? track.song : 'Ready to Play';
  const artist = track ? `${track.artist} • ${track.genre || 'Music'}` : 'Select a song';
  const artUrl = track && track.artwork ? track.artwork : '';

  // Sticky footer
  if (playerTrackTitle) playerTrackTitle.textContent = title;
  if (playerTrackArtist) playerTrackArtist.textContent = artist;
  if (playerMiniArt) {
    if (artUrl) {
      playerMiniArt.style.backgroundImage = `url('${artUrl}')`;
      playerMiniArt.style.backgroundSize = 'cover';
    } else {
      playerMiniArt.style.backgroundImage = 'linear-gradient(135deg, #7c3aed, #06b6d4)';
    }
  }

  // Right Rail
  if (railTrackTitle) railTrackTitle.textContent = title;
  if (railTrackArtist) railTrackArtist.textContent = track ? `${track.artist} (${track.genre})` : 'Select a song to play preview';
  if (railAlbumArt) {
    if (artUrl) {
      railAlbumArt.style.backgroundImage = `url('${artUrl}')`;
    } else {
      railAlbumArt.style.backgroundImage = 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(6,182,212,0.15))';
    }
  }

  // Expanded Player
  if (expandedTitle) expandedTitle.textContent = title;
  if (expandedArtist) expandedArtist.textContent = artist;
  if (expandedArt) {
    if (artUrl) {
      expandedArt.style.backgroundImage = `url('${artUrl}')`;
    } else {
      expandedArt.style.backgroundImage = 'linear-gradient(135deg, #7c3aed, #06b6d4)';
    }
  }

  // Play/Pause buttons with Lucide icon swapping
  const iconMarkup = isPlayingState ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
  if (playBtn) {
    playBtn.innerHTML = iconMarkup;
    playBtn.classList.toggle('is-playing', isPlayingState);
  }
  if (expPlayBtn) {
    expPlayBtn.innerHTML = iconMarkup;
    expPlayBtn.classList.toggle('is-playing', isPlayingState);
  }
  if (railPlayBtn) {
    railPlayBtn.innerHTML = isPlayingState ? '<i data-lucide="pause"></i> Pause' : '<i data-lucide="play"></i> Play Preview';
  }

  // Like button
  if (likeBtn && track) {
    const isLiked = likedTrackIds.has(track.id);
    likeBtn.style.color = isLiked ? '#f43f5e' : '';
    likeBtn.innerHTML = isLiked ? '<i data-lucide="heart" style="fill: #f43f5e; color: #f43f5e;"></i>' : '<i data-lucide="heart"></i>';
  }

  // Highlight active row in playlist
  document.querySelectorAll('.playlist-track-row').forEach((row) => {
    const rowId = Number(row.dataset.trackId);
    row.classList.toggle('active-track', track && rowId === track.id);
    const numSpan = row.querySelector('.track-number');
    if (numSpan) {
      const idx = Number(row.dataset.index) + 1;
      if (track && rowId === track.id) {
        numSpan.innerHTML = isPlayingState ? '<span class="eq-visualizer"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></span>' : '<i data-lucide="pause" style="width: 15px; height: 15px; color: var(--cyan);"></i>';
      } else {
        numSpan.textContent = idx;
      }
    }
  });

  // Highlight active track in search results (if open)
  document.querySelectorAll('.search-preview-btn').forEach((btn) => {
    try {
      const t = JSON.parse(btn.dataset.track);
      const isMatch = track && (track.previewUrl === t.previewUrl || (track.song === t.song && track.artist === t.artist));
      const icon = isMatch && isPlayingState ? 'pause' : 'play';
      const isTopBtn = btn.classList.contains('top-result-play-btn');
      if (isTopBtn) {
        btn.innerHTML = `<i data-lucide="${icon}"></i> ${isMatch && isPlayingState ? 'Pause Preview' : 'Play Preview'}`;
      } else {
        btn.innerHTML = `<i data-lucide="${icon}" style="width: 16px; height: 16px;"></i>`;
      }
      btn.classList.toggle('is-playing', isMatch && isPlayingState);
      const parentCard = btn.closest('.search-row-item, .search-grid-card, .top-result-card');
      if (parentCard) {
        parentCard.classList.toggle('is-playing', isMatch && isPlayingState);
      }
    } catch (_) {}
  });

  // Highlight active track in recommended playlist modal (if open)
  document.querySelectorAll('.rec-play-track-btn').forEach((btn) => {
    if (!activeRecommendedPlaylist) return;
    const idx = Number(btn.dataset.idx);
    const s = activeRecommendedPlaylist.songs[idx];
    const isMatch = s && track && (track.previewUrl === s.previewUrl || (track.song === s.song && track.artist === s.artist));
    btn.innerHTML = `<i data-lucide="${isMatch && isPlayingState ? 'pause' : 'play'}" style="width: 13px; height: 13px;"></i>`;
    const row = btn.closest('.rec-song-row');
    if (row) row.classList.toggle('is-playing', isMatch && isPlayingState);
  });

  refreshIcons();
}

// Play a given track object
async function playTrack(track) {
  if (!track) return;
  currentPlayingTrack = track;

  // If track doesn't have a previewUrl yet, look it up on iTunes
  if (!track.previewUrl) {
    showToast(`Looking up iTunes preview for "${track.song}"...`);
    try {
      const searchRes = await api(`/api/lookup?term=${encodeURIComponent(track.song + ' ' + track.artist)}&limit=1`);
      if (searchRes && searchRes.length && searchRes[0].previewUrl) {
        track.previewUrl = searchRes[0].previewUrl;
        track.artwork = searchRes[0].artwork;
        track.album = searchRes[0].album;
        track.durationMs = searchRes[0].durationMs;
      }
    } catch (e) {
      console.warn('Preview lookup failed:', e.message);
    }
  }

  if (track.previewUrl) {
    audio.src = track.previewUrl;
    try {
      await audio.play();
      updatePlayerUI(track, true);
      showToast(`Playing: ${track.song}`);
      addNotification('Now Playing', `${track.song} by ${track.artist}`);
    } catch (err) {
      console.error('Audio playback error:', err);
      updatePlayerUI(track, false);
      showToast('Click play again to start audio playback.');
    }
  } else {
    updatePlayerUI(track, false);
    showToast(`No audio preview available for "${track.song}".`);
  }
}

// Next / Previous track handling
function playNextTrack() {
  if (!currentSongs.length) return;

  if (isShuffle) {
    currentTrackIndex = Math.floor(Math.random() * currentSongs.length);
  } else {
    currentTrackIndex = (currentTrackIndex + 1) % currentSongs.length;
  }

  playTrack(currentSongs[currentTrackIndex]);
}

function playPrevTrack() {
  if (!currentSongs.length) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  if (isShuffle) {
    currentTrackIndex = Math.floor(Math.random() * currentSongs.length);
  } else {
    currentTrackIndex = (currentTrackIndex - 1 + currentSongs.length) % currentSongs.length;
  }

  playTrack(currentSongs[currentTrackIndex]);
}

// Toggle Play / Pause
function togglePlayPause() {
  if (!currentPlayingTrack) {
    if (currentSongs.length > 0) {
      currentTrackIndex = 0;
      playTrack(currentSongs[0]);
    } else {
      showToast('Add songs or search iTunes to play music.');
    }
    return;
  }

  if (audio.paused) {
    audio.play().then(() => {
      updatePlayerUI(currentPlayingTrack, true);
    }).catch((e) => console.warn(e));
  } else {
    audio.pause();
    updatePlayerUI(currentPlayingTrack, false);
  }
}

// Audio Event Listeners
audio.addEventListener('timeupdate', () => {
  const current = audio.currentTime || 0;
  const duration = audio.duration || 30;
  const pct = Math.min(100, (current / duration) * 100);

  const formattedCurr = formatSeconds(current);
  const formattedTotal = formatSeconds(duration);

  if (playerCurrentTime) playerCurrentTime.textContent = formattedCurr;
  if (expCurrentTime) expCurrentTime.textContent = formattedCurr;
  if (playerTotalTime) playerTotalTime.textContent = formattedTotal;
  if (expTotalTime) expTotalTime.textContent = formattedTotal;

  if (playerProgressFill) playerProgressFill.style.width = `${pct}%`;
  if (expProgressFill) expProgressFill.style.width = `${pct}%`;
});

audio.addEventListener('ended', () => {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
  } else {
    playNextTrack();
  }
});

audio.addEventListener('play', () => {
  if (currentPlayingTrack) updatePlayerUI(currentPlayingTrack, true);
});

audio.addEventListener('pause', () => {
  if (currentPlayingTrack) updatePlayerUI(currentPlayingTrack, false);
});

// Seek bar click
function handleSeek(e, progressBarElem) {
  if (!audio.duration) return;
  const rect = progressBarElem.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  audio.currentTime = ratio * audio.duration;
}

if (playerProgressBar) {
  playerProgressBar.addEventListener('click', (e) => handleSeek(e, playerProgressBar));
}
if (expProgressBar) {
  expProgressBar.addEventListener('click', (e) => handleSeek(e, expProgressBar));
}

// Volume Controls
if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audio.volume = val;
    audio.muted = (val === 0);
    if (muteBtn) {
      muteBtn.innerHTML = val === 0 ? '<i data-lucide="volume-x"></i>' : (val < 0.5 ? '<i data-lucide="volume-1"></i>' : '<i data-lucide="volume-2"></i>');
      refreshIcons();
    }
  });
}

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.muted) {
      if (volumeSlider) volumeSlider.value = 0;
      muteBtn.innerHTML = '<i data-lucide="volume-x"></i>';
      showToast('Audio muted');
    } else {
      if (volumeSlider) volumeSlider.value = audio.volume || 0.8;
      muteBtn.innerHTML = '<i data-lucide="volume-2"></i>';
      showToast('Audio unmuted');
    }
    refreshIcons();
  });
}

// ==========================================
// 3. CRUD: SONGS (Read, Create, Delete, Edit)
// ==========================================

async function loadPlaylist() {
  try {
    const records = await api(`/api/music?list=${encodeURIComponent(currentListId)}`);
    currentSongs = Array.isArray(records) ? records : [];
    renderPlaylist();
    updateBannerMeta();
  } catch (error) {
    console.error('Load playlist error:', error);
    if (playlistList) {
      playlistList.innerHTML = `<p style="padding: 20px; color: var(--soft);">Unable to load songs: ${escapeHtml(error.message)}</p>`;
    }
  }
}

function updateBannerMeta() {
  if (bannerTitle) bannerTitle.textContent = currentPlaylistName;
  const displayedCount = isShowingLikedOnly ? currentSongs.filter(s => likedTrackIds.has(s.id)).length : currentSongs.length;
  if (bannerMeta) {
    bannerMeta.textContent = `${displayedCount} song${displayedCount === 1 ? '' : 's'} • ${isShowingLikedOnly ? 'Favorites Filter Active' : 'Saved in musicPlaylist.json'}`;
  }
}

function renderPlaylist() {
  if (!playlistList) return;

  const songsToDisplay = isShowingLikedOnly ? currentSongs.filter(s => likedTrackIds.has(s.id)) : currentSongs;

  if (!songsToDisplay.length) {
    playlistList.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed var(--line);">
        <p style="font-size: 1.15rem; color: var(--text); margin-bottom: 6px;">
          ${isShowingLikedOnly ? 'No liked songs yet' : 'Your playlist is empty'}
        </p>
        <p style="color: var(--soft); margin-bottom: 16px;">
          ${isShowingLikedOnly ? 'Click the heart icon on any song to save it here!' : 'Add a song using the form or search iTunes to discover tracks!'}
        </p>
        ${isShowingLikedOnly ? `<button id="resetFilterBtn" class="primary-btn"><i data-lucide="list"></i> Show All Songs</button>` : `<button id="emptySearchBtn" class="primary-btn"><i data-lucide="search"></i> Search iTunes</button>`}
      </div>
    `;

    const resetBtn = document.getElementById('resetFilterBtn');
    if (resetBtn) resetBtn.onclick = () => { isShowingLikedOnly = false; savedSongsBtn?.classList.remove('is-active'); renderPlaylist(); };
    const btn = document.getElementById('emptySearchBtn');
    if (btn) btn.onclick = () => { if (searchTermInput) { searchTermInput.focus(); searchTermInput.scrollIntoView({ behavior: 'smooth' }); } };
    refreshIcons();
    return;
  }

  playlistList.classList.add('playlist-track-list');
  playlistList.innerHTML = `
    <div class="playlist-track-header">
      <span class="header-num">#</span>
      <span class="header-title">Title</span>
      <span class="header-artist">Artist & Genre</span>
      <span class="header-duration">Duration</span>
      <span class="header-actions">Actions</span>
    </div>
    ${songsToDisplay
      .map((track, index) => {
        const isCurrent = currentPlayingTrack && currentPlayingTrack.id === track.id;
        const durationText = track.durationMs ? formatDuration(track.durationMs) : '0:30';
        const art = track.artwork || '';
        const isLiked = likedTrackIds.has(track.id);

        return `
          <div class="playlist-track-row ${isCurrent ? 'active-track' : ''}" data-track-id="${escapeHtml(track.id)}" data-index="${index}">
            <span class="track-number">${isCurrent && !audio.paused ? '<span class="eq-visualizer"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></span>' : index + 1}</span>
            <div class="track-main">
              <div class="track-art" style="${art ? `background-image: url('${art}'); background-size: cover;` : 'background: linear-gradient(135deg, #7c3aed, #06b6d4);'}"></div>
              <div class="track-copy">
                <strong>${escapeHtml(track.song)}</strong>
                <span class="track-sub-artist">${escapeHtml(track.artist)}</span>
              </div>
            </div>
            <span class="track-artist">${escapeHtml(track.artist)} • <small>${escapeHtml(track.genre)}</small></span>
            <span class="track-duration">${durationText}</span>
            <div class="track-actions">
              <button class="track-action-btn track-like-btn ${isLiked ? 'liked' : ''}" data-id="${escapeHtml(track.id || track.song)}" title="${isLiked ? 'Unlike' : 'Like'}">
                <i data-lucide="heart" style="${isLiked ? 'fill: #f43f5e; color: #f43f5e;' : ''}"></i>
              </button>
              ${currentCuratedPlaylist ? `
                <button class="track-action-btn track-curated-add-btn" data-index="${index}" title="Add song to your library" style="padding: 5px 10px; background: rgba(255,255,255,0.06); gap: 4px;">
                  <i data-lucide="plus" style="width: 13px; height: 13px;"></i> <span>Add</span>
                </button>
              ` : `
                <a href="/edit.html?id=${encodeURIComponent(track.id)}&list=${encodeURIComponent(currentListId)}" class="track-action-btn track-edit-btn edit-btn" title="Edit this song">
                  <i data-lucide="pencil" style="width: 13px; height: 13px;"></i> <span>Edit</span>
                </a>
                <button class="track-action-btn track-delete-btn delete-btn" data-id="${escapeHtml(track.id)}" data-name="${escapeHtml(track.song)}" title="Delete this song">
                  <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                </button>
                <button class="track-action-btn track-menu-btn" data-id="${escapeHtml(track.id)}" title="More options">
                  <i data-lucide="more-horizontal" style="width: 15px; height: 15px;"></i>
                </button>
              `}
            </div>
          </div>
        `;
      })
      .join('')}
  `;

  // Attach row click listeners for instant audio playback
  playlistList.querySelectorAll('.playlist-track-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.track-action-btn') || e.target.closest('.table-btn') || e.target.closest('.track-menu-btn')) return;
      const index = Number(row.dataset.index);
      currentTrackIndex = index;
      playTrack(songsToDisplay[index]);
    });
  });

  // Track like buttons inside rows
  playlistList.querySelectorAll('.track-like-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rawId = btn.dataset.id;
      const numId = Number(rawId);
      const isNum = !Number.isNaN(numId);
      const key = isNum ? numId : rawId;
      if (likedTrackIds.has(key)) {
        likedTrackIds.delete(key);
        showToast('Removed from favorites');
      } else {
        likedTrackIds.add(key);
        showToast('Added to favorites!');
      }
      renderPlaylist();
      if (currentPlayingTrack && (currentPlayingTrack.id === numId || currentPlayingTrack.song === rawId)) {
        updatePlayerUI(currentPlayingTrack, !audio.paused);
      }
    });
  });

  // Track add buttons (when in curated playlist)
  playlistList.querySelectorAll('.track-curated-add-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.index);
      const s = songsToDisplay[idx];
      if (!s) return;
      try {
        await api('/api/music?list=main', {
          method: 'POST',
          body: JSON.stringify({
            song: s.song,
            artist: s.artist,
            genre: s.genre,
            previewUrl: s.previewUrl || '',
            artwork: s.artwork || '',
            album: s.album || '',
            durationMs: s.durationMs || 0
          })
        });
        btn.innerHTML = '<i data-lucide="check" style="color: var(--green); width: 13px; height: 13px;"></i> <span>Added</span>';
        btn.disabled = true;
        showToast(`Added "${s.song}" to your playlist!`);
        addNotification('Song Added', `Added "${s.song}" from ${currentPlaylistName}`);
        refreshIcons();
        await loadPlaylistLibrary();
      } catch (err) {
        showToast(err.message || 'Could not add song.');
      }
    });
  });

  // Attach delete buttons
  playlistList.querySelectorAll('.track-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      if (!confirm(`Are you sure you want to delete "${name}" from this playlist?`)) return;

      try {
        await api(`/api/music/${id}?list=${encodeURIComponent(currentListId)}`, { method: 'DELETE' });
        showToast(`Deleted "${name}"`);
        addNotification('Song Deleted', `Removed "${name}" from ${currentPlaylistName}`);
        if (currentPlayingTrack && currentPlayingTrack.id === Number(id)) {
          audio.pause();
          currentPlayingTrack = null;
          updatePlayerUI(null, false);
        }
        await loadPlaylist();
      } catch (err) {
        showToast(err.message || 'Failed to delete song.');
      }
    });
  });

  // Attach context menu buttons on each row
  playlistList.querySelectorAll('.track-menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      activeContextTrack = currentSongs.find((s) => s.id === id) || null;
      toggleMoreOptionsMenu(true, btn);
    });
  });

  refreshIcons();
}

// Add Song via form (CRUD Create)
if (musicForm) {
  musicForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const songInput = document.getElementById('song');
    const artistInput = document.getElementById('artist');
    const genreInput = document.getElementById('genre');

    const song = songInput.value.trim();
    const artist = artistInput.value.trim();
    const genre = genreInput.value.trim();

    if (!song || !artist || !genre) {
      showToast('Please fill in song, artist, and genre.');
      return;
    }

    try {
      const newRecord = await api(`/api/music?list=${encodeURIComponent(currentListId)}`, {
        method: 'POST',
        body: JSON.stringify({ song, artist, genre }),
      });

      showToast(`Added "${newRecord.song}" to ${currentPlaylistName}`);
      addNotification('Song Added', `Added "${newRecord.song}" by ${newRecord.artist}`);
      musicForm.reset();
      await loadPlaylist();
    } catch (err) {
      showToast(err.message || 'Could not add song.');
    }
  });
}

// ==========================================
// 4. ITUNES ONLINE SEARCH & AUDIO INTEGRATION
// ==========================================

let searchDebounceTimer = null;
let currentSearchQuery = '';
let searchOpenedFromHome = false;

// Switch between Main Views / Tabs: 'all' (playlist), 'add' (form), 'search' (iTunes lookup)
function switchTab(tabName, pushHistory = true) {
  document.querySelectorAll('.pill-row .tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  if (tabName === 'search') {
    const wasOnHome = homeView && !homeView.classList.contains('hidden');
    if (wasOnHome) {
      searchOpenedFromHome = true;
      homeView.classList.add('hidden');
    }
    if (playlistView && playlistView.classList.contains('hidden')) {
      playlistView.classList.remove('hidden');
    }

    sidebarHomeBtn?.classList.remove('active');
    sidebarSearchBtn?.classList.add('active');

    if (searchOpenedFromHome) {
      if (playlistBreadcrumb) playlistBreadcrumb.textContent = 'Home / Search';
      if (selectedPlaylistBanner) selectedPlaylistBanner.classList.add('hidden');
    } else {
      if (playlistBreadcrumb) playlistBreadcrumb.textContent = `Home / ${currentPlaylistName} / Search`;
    }

    if (playlistList) playlistList.classList.add('hidden');
    if (musicFormPanel) musicFormPanel.classList.add('hidden');
    if (searchSection) searchSection.classList.remove('hidden');

    if (pushHistory && history.state?.view !== 'search') {
      history.pushState({ view: 'search' }, '', '?search=1');
    }

    if (searchTermInput) {
      if (document.activeElement !== searchTermInput) {
        searchTermInput.focus();
      }
      if (!searchTermInput.value.trim()) {
        renderSearchExplore();
      }
    }
  } else if (tabName === 'add') {
    searchOpenedFromHome = false;
    if (homeView && !homeView.classList.contains('hidden')) {
      homeView.classList.add('hidden');
    }
    if (playlistView && playlistView.classList.contains('hidden')) {
      playlistView.classList.remove('hidden');
    }
    sidebarHomeBtn?.classList.remove('active');
    sidebarSearchBtn?.classList.remove('active');

    if (selectedPlaylistBanner) selectedPlaylistBanner.classList.remove('hidden');
    if (searchSection) searchSection.classList.add('hidden');
    if (playlistList) playlistList.classList.remove('hidden');
    if (musicFormPanel) {
      musicFormPanel.classList.remove('hidden');
      musicFormPanel.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('song')?.focus();
    }
    if (playlistBreadcrumb) playlistBreadcrumb.textContent = `Home / ${currentPlaylistName}`;
  } else {
    // 'all' tracks
    searchOpenedFromHome = false;
    if (homeView && !homeView.classList.contains('hidden')) {
      homeView.classList.add('hidden');
    }
    if (playlistView && playlistView.classList.contains('hidden')) {
      playlistView.classList.remove('hidden');
    }
    sidebarHomeBtn?.classList.remove('active');
    sidebarSearchBtn?.classList.remove('active');

    if (selectedPlaylistBanner) selectedPlaylistBanner.classList.remove('hidden');
    if (searchSection) searchSection.classList.add('hidden');
    if (musicFormPanel) musicFormPanel.classList.add('hidden');
    if (playlistList) playlistList.classList.remove('hidden');
    if (playlistBreadcrumb) playlistBreadcrumb.textContent = `Home / ${currentPlaylistName}`;
    if (!currentSongs.length && currentListId) {
      loadPlaylist();
    }
  }

  refreshIcons();
}

// Render the initial discovery / category exploration state
function renderSearchExplore() {
  if (!searchResults) return;

  const categories = [
    { title: 'Rock Classics', desc: 'Legendary riffs & anthems', color: 'linear-gradient(135deg, #e65f5f, #ffdb7d)', query: 'Rock Classics' },
    { title: 'Pop Hits & Anthems', desc: 'Trending charts & vocal hooks', color: 'linear-gradient(135deg, #4447f3, #a259ff)', query: 'Pop Hits' },
    { title: 'Chill & Lo-Fi Beats', desc: 'Focus, study & relaxing vibes', color: 'linear-gradient(135deg, #0f6a6e, #2db58a)', query: 'Lofi Chill' },
    { title: 'Hip-Hop & R&B', desc: 'Heavy bass & fresh flow', color: 'linear-gradient(135deg, #d46d4d, #f7b868)', query: 'Hip Hop' },
    { title: 'Acoustic & Folk', desc: 'Warm strings & raw voices', color: 'linear-gradient(135deg, #98650d, #d6a23d)', query: 'Acoustic' },
    { title: 'Indie & Alternative', desc: 'Underground favorites', color: 'linear-gradient(135deg, #76cba2, #287d58)', query: 'Alternative Indie' },
  ];

  searchResults.innerHTML = `
    <div class="search-explore-banner">
      <h3><i data-lucide="compass" style="color: var(--green);"></i> Explore & Discover Music</h3>
      <p>Search millions of tracks on the iTunes Catalog, stream 30-second high-fidelity previews, and save tracks to your playlist in one click.</p>
    </div>

    <div class="browse-categories-grid">
      ${categories.map(c => `
        <div class="browse-category-card" data-query="${escapeHtml(c.query)}" style="background: ${c.color};">
          <strong>${escapeHtml(c.title)}</strong>
          <span>${escapeHtml(c.desc)}</span>
        </div>
      `).join('')}
    </div>
  `;

  // Attach card click handlers
  searchResults.querySelectorAll('.browse-category-card').forEach(card => {
    card.addEventListener('click', () => {
      const q = card.dataset.query;
      if (searchTermInput) {
        searchTermInput.value = q;
        searchClearBtn?.classList.remove('hidden');
      }
      performSearch(q);
    });
  });

  refreshIcons();
}

// Render empty / no results state
function renderSearchEmpty(query) {
  if (!searchResults) return;

  const suggestions = ['Taylor Swift', 'Coldplay', 'The Weeknd', 'Billie Eilish', 'Pop Hits'];

  searchResults.innerHTML = `
    <div class="search-empty-state">
      <i data-lucide="search-x" class="empty-icon"></i>
      <h4>No results found for "${escapeHtml(query)}"</h4>
      <p>Please check your spelling, or try searching for a different song title, artist, or genre.</p>
      <div class="search-suggestions-row">
        ${suggestions.map(s => `
          <button type="button" class="search-tag-chip" data-query="${escapeHtml(s)}">Try "${escapeHtml(s)}"</button>
        `).join('')}
      </div>
    </div>
  `;

  searchResults.querySelectorAll('.search-tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      if (searchTermInput) searchTermInput.value = q;
      performSearch(q);
    });
  });

  refreshIcons();
}

// Perform search against iTunes API
async function performSearch(queryParam) {
  const query = (queryParam !== undefined ? queryParam : (searchTermInput ? searchTermInput.value : '')).trim();
  currentSearchQuery = query;

  if (searchClearBtn) {
    searchClearBtn.classList.toggle('hidden', !query);
  }

  if (!query) {
    renderSearchExplore();
    return;
  }

  // Ensure searchSection and playlistView are active
  if ((playlistView && playlistView.classList.contains('hidden')) || (searchSection && searchSection.classList.contains('hidden'))) {
    switchTab('search', false);
  }

  // Show loading spinner
  if (searchSpinner) searchSpinner.classList.remove('hidden');

  try {
    const results = await api(`/api/lookup?term=${encodeURIComponent(query)}&limit=12`);
    if (searchSpinner) searchSpinner.classList.add('hidden');

    // Check if query is still current (prevent race conditions)
    if (query !== currentSearchQuery) return;

    if (!results || !results.length) {
      renderSearchEmpty(query);
      return;
    }

    renderSearchResults(query, results);
  } catch (error) {
    if (searchSpinner) searchSpinner.classList.add('hidden');
    console.error('Search error:', error);
    if (searchResults) {
      searchResults.innerHTML = `
        <div class="search-empty-state">
          <i data-lucide="alert-circle" class="empty-icon" style="color: #ff6b6b;"></i>
          <h4>Search unavailable</h4>
          <p>${escapeHtml(error.message || 'Unable to connect to iTunes service. Please check your internet connection.')}</p>
          <button class="primary-btn retry-search-btn" style="display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="rotate-cw"></i> Try Again
          </button>
        </div>
      `;
      searchResults.querySelector('.retry-search-btn')?.addEventListener('click', () => performSearch(query));
      refreshIcons();
    }
  }
}

// Render search results: Spotify-style Top Result + Songs Column + More Tracks Grid
function renderSearchResults(query, results) {
  if (!searchResults) return;

  const topResult = results[0];
  const listTracks = results.slice(1, 5);
  const gridTracks = results.slice(5);

  const isTopPlaying = currentPlayingTrack && currentPlayingTrack.song === topResult.song && currentPlayingTrack.artist === topResult.artist && !audio.paused;

  searchResults.innerHTML = `
    <div class="search-results-header">
      <h3>
        <i data-lucide="search" style="color: var(--green); width: 20px; height: 20px;"></i>
        Results for "<span>${escapeHtml(query)}</span>"
        <span class="count-badge">${results.length} found</span>
      </h3>
      <button id="closeSearchBtn" class="text-link" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.88rem;">
        <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i> ${searchOpenedFromHome ? 'Return to Home' : 'Return to Playlist'}
      </button>
    </div>

    <!-- Hero Layout: Top Result (Left) + Top Songs (Right) -->
    <div class="search-hero-layout">
      <!-- Top Result Card -->
      <div class="top-result-card">
        <span class="card-label">Top Result</span>
        <div class="top-result-media">
          <img src="${escapeHtml(topResult.artwork || topResult.artworkSmall)}" alt="${escapeHtml(topResult.song)}" class="top-result-art" onerror="this.src=''" />
          <div class="top-result-info">
            <div class="song-name" title="${escapeHtml(topResult.song)}">${escapeHtml(topResult.song)}</div>
            <div class="artist-name" title="${escapeHtml(topResult.artist)}">${escapeHtml(topResult.artist)}</div>
            <span class="genre-pill">${escapeHtml(topResult.genre || 'Music')}</span>
          </div>
        </div>
        <div class="top-result-actions">
          ${topResult.previewUrl ? `
            <button class="top-result-play-btn search-preview-btn ${isTopPlaying ? 'is-playing' : ''}" data-track='${escapeHtml(JSON.stringify(topResult))}'>
              <i data-lucide="${isTopPlaying ? 'pause' : 'play'}"></i> ${isTopPlaying ? 'Pause Preview' : 'Play Preview'}
            </button>
          ` : ''}
          <button class="top-result-add-btn search-add-track-btn" data-track='${escapeHtml(JSON.stringify(topResult))}'>
            <i data-lucide="plus"></i> Add to Playlist
          </button>
        </div>
      </div>

      <!-- Songs List Column -->
      <div class="search-songs-col">
        <span class="col-label">Top Songs</span>
        <div class="search-track-rows">
          ${(listTracks.length ? listTracks : [topResult]).map((t) => {
            const isPlaying = currentPlayingTrack && currentPlayingTrack.song === t.song && currentPlayingTrack.artist === t.artist && !audio.paused;
            return `
              <div class="search-row-item ${isPlaying ? 'is-playing' : ''}">
                <div class="search-row-lead">
                  <div class="search-row-art-wrap">
                    <img src="${escapeHtml(t.artworkSmall || t.artwork)}" alt="${escapeHtml(t.song)}" class="search-row-art" onerror="this.style.display='none'" />
                    ${t.previewUrl ? `
                      <button class="search-row-play-overlay search-preview-btn" data-track='${escapeHtml(JSON.stringify(t))}' title="Play preview">
                        <i data-lucide="${isPlaying ? 'pause' : 'play'}" style="width: 16px; height: 16px;"></i>
                      </button>
                    ` : ''}
                  </div>
                  <div class="search-row-meta">
                    <strong title="${escapeHtml(t.song)}">${escapeHtml(t.song)}</strong>
                    <span>${escapeHtml(t.artist)} • <small style="color: var(--muted);">${escapeHtml(t.genre)}</small></span>
                  </div>
                </div>
                <div class="search-row-actions">
                  <span class="search-row-duration">${t.durationMs ? formatDuration(t.durationMs) : '0:30'}</span>
                  <button class="search-add-btn search-add-track-btn" data-track='${escapeHtml(JSON.stringify(t))}'>
                    <i data-lucide="plus" style="width: 13px; height: 13px;"></i> Add
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- More Tracks Grid (if any) -->
    ${gridTracks.length ? `
      <div class="more-results-section">
        <div class="more-results-title">More Tracks from iTunes</div>
        <div class="search-card-grid">
          ${gridTracks.map((t) => {
            const isPlaying = currentPlayingTrack && currentPlayingTrack.song === t.song && currentPlayingTrack.artist === t.artist && !audio.paused;
            return `
              <div class="search-grid-card ${isPlaying ? 'is-playing' : ''}">
                <div class="art-wrap">
                  <img src="${escapeHtml(t.artwork || t.artworkSmall)}" alt="${escapeHtml(t.song)}" onerror="this.style.display='none'" />
                  ${t.previewUrl ? `
                    <button class="card-play-overlay search-preview-btn" data-track='${escapeHtml(JSON.stringify(t))}' title="Play preview">
                      <i data-lucide="${isPlaying ? 'pause' : 'play'}" style="width: 16px; height: 16px;"></i>
                    </button>
                  ` : ''}
                </div>
                <strong title="${escapeHtml(t.song)}">${escapeHtml(t.song)}</strong>
                <span>${escapeHtml(t.artist)}</span>
                <div class="card-footer">
                  <span style="font-size: 0.75rem; color: var(--soft);">${escapeHtml(t.genre)}</span>
                  <button class="search-add-btn search-add-track-btn" data-track='${escapeHtml(JSON.stringify(t))}'>
                    <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Add
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Attach Close Button
  const closeBtn = document.getElementById('closeSearchBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      if (searchOpenedFromHome) {
        showHomeView();
      } else {
        switchTab('all');
      }
    };
  }

  // Attach Preview Play Buttons
  searchResults.querySelectorAll('.search-preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        const trackData = JSON.parse(btn.dataset.track);
        if (currentPlayingTrack && currentPlayingTrack.previewUrl === trackData.previewUrl && !audio.paused) {
          togglePlayPause();
        } else {
          playTrack(trackData);
        }
      } catch (err) {
        console.error('Play preview error:', err);
      }
    });
  });

  // Attach Add Track Buttons
  searchResults.querySelectorAll('.search-add-track-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const item = JSON.parse(btn.dataset.track);
        const payload = {
          song: item.song,
          artist: item.artist,
          genre: item.genre,
          previewUrl: item.previewUrl || '',
          artwork: item.artwork || '',
          album: item.album || '',
          durationMs: Number(item.durationMs) || 0,
        };

        await api(`/api/music?list=${encodeURIComponent(currentListId)}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        showToast(`Added "${payload.song}" to ${currentPlaylistName}`);
        addNotification('Song Imported', `Imported "${payload.song}" from iTunes`);
        
        btn.classList.add('added');
        btn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i> Added';
        btn.disabled = true;

        refreshIcons();
        await loadPlaylist();
      } catch (err) {
        showToast(err.message || 'Could not add song.');
      }
    });
  });

  refreshIcons();
}

// Search input listeners (live debounced search, clear button, enter key)
if (searchTermInput) {
  searchTermInput.addEventListener('input', () => {
    const val = searchTermInput.value;
    if (searchClearBtn) {
      searchClearBtn.classList.toggle('hidden', !val.trim());
    }

    clearTimeout(searchDebounceTimer);

    if ((playlistView && playlistView.classList.contains('hidden')) || (searchSection && searchSection.classList.contains('hidden'))) {
      switchTab('search', false);
    }

    if (!val.trim()) {
      renderSearchExplore();
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      performSearch(val.trim());
    }, 320);
  });

  searchTermInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      clearTimeout(searchDebounceTimer);
      if ((playlistView && playlistView.classList.contains('hidden')) || (searchSection && searchSection.classList.contains('hidden'))) {
        switchTab('search', false);
      }
      performSearch(searchTermInput.value.trim());
    } else if (e.key === 'Escape') {
      searchTermInput.value = '';
      searchClearBtn?.classList.add('hidden');
      clearTimeout(searchDebounceTimer);
      searchTermInput.blur();
      if (searchOpenedFromHome) {
        showHomeView();
      } else {
        renderSearchExplore();
      }
    }
  });

  searchTermInput.addEventListener('focus', () => {
    if ((playlistView && playlistView.classList.contains('hidden')) || (searchSection && searchSection.classList.contains('hidden'))) {
      switchTab('search', false);
    }
  });
}

if (searchClearBtn && searchTermInput) {
  searchClearBtn.addEventListener('click', () => {
    searchTermInput.value = '';
    searchClearBtn.classList.add('hidden');
    clearTimeout(searchDebounceTimer);
    renderSearchExplore();
    searchTermInput.focus();
  });
}

// Quick browse tag chips listener using delegation
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.search-tag-chip');
  if (chip) {
    const q = chip.dataset.query;
    if (q) {
      if (searchTermInput) {
        searchTermInput.value = q;
        searchClearBtn?.classList.remove('hidden');
      }
      switchTab('search');
      performSearch(q);
    }
  }
});

// ==========================================
// 5. PLAYLIST LIBRARY MANAGEMENT
// ==========================================

async function loadPlaylistLibrary() {
  if (!libraryList) return;

  try {
    const playlists = await api('/api/playlists');
    allPlaylists = Array.isArray(playlists) ? playlists : [];

    libraryList.innerHTML = allPlaylists
      .map((pl) => {
        const hasCover = Boolean(pl.cover && String(pl.cover).trim());
        const coverStyle = hasCover ? getCoverCssStyle(pl.cover) : '';
        return `
          <div class="library-item ${String(pl.id) === String(currentListId) ? 'selected-playlist' : ''}" data-id="${escapeHtml(pl.id)}" data-name="${escapeHtml(pl.name)}">
            <span class="mini-icon ${hasCover ? 'has-cover' : (String(pl.id) === 'main' ? 'purple' : 'teal')}" style="${coverStyle}">
              ${hasCover && !String(pl.cover).startsWith('linear-gradient') ? '' : '<i data-lucide="list-music" style="width: 20px; height: 20px;"></i>'}
            </span>
            <div>
              <strong>${escapeHtml(pl.name)}</strong>
              <small>${pl.count || 0} track${pl.count === 1 ? '' : 's'}</small>
            </div>
            <button class="playlist-menu-btn" data-id="${escapeHtml(pl.id)}" data-name="${escapeHtml(pl.name)}" title="Playlist options">
              <i data-lucide="more-vertical" style="width: 15px; height: 15px;"></i>
            </button>
          </div>
        `;
      })
      .join('');

    refreshIcons();

    // Clicking a playlist loads it and goes to that particular playlist
    libraryList.querySelectorAll('.library-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.playlist-menu-btn')) return;
        openUserPlaylist(item.dataset.id, item.dataset.name);
      });
    });

    // Playlist menu buttons
    libraryList.querySelectorAll('.playlist-menu-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentListId = btn.dataset.id;
        currentPlaylistName = btn.dataset.name;
        activeContextTrack = null;
        toggleMoreOptionsMenu(true, btn);
      });
    });

    renderHomeUserPlaylists();
  } catch (err) {
    console.error('Load playlist library error:', err);
  }
}

// Create Playlist Modal Handling
if (addPlaylistBtn) {
  addPlaylistBtn.addEventListener('click', () => {
    openModal('createPlaylistModal');
    document.getElementById('newPlaylistName')?.focus();
  });
}

const createPlaylistForm = document.getElementById('createPlaylistForm');
if (createPlaylistForm) {
  createPlaylistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newPlaylistName');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    try {
      const created = await api('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });

      closeModal('createPlaylistModal');
      createPlaylistForm.reset();
      showToast(`Created playlist "${created.name}"`);
      addNotification('Playlist Created', `Created new playlist "${created.name}"`);
      currentListId = created.id;
      currentPlaylistName = created.name;
      await loadPlaylistLibrary();
      await loadPlaylist();
    } catch (err) {
      showToast(err.message || 'Could not create playlist.');
    }
  });
}

// Rename Playlist Modal Handling
const renamePlaylistForm = document.getElementById('renamePlaylistForm');
if (renamePlaylistForm) {
  renamePlaylistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('editPlaylistName');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    try {
      const updated = await api(`/api/playlists/${currentListId}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });

      closeModal('renamePlaylistModal');
      currentPlaylistName = updated.name;
      showToast(`Renamed to "${updated.name}"`);
      addNotification('Playlist Renamed', `Renamed playlist to "${updated.name}"`);
      await loadPlaylistLibrary();
      updateBannerMeta();
    } catch (err) {
      showToast(err.message || 'Could not rename playlist.');
    }
  });
}

// Change Playlist Picture Modal Handling
const PRESET_COVERS = [
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #7c3aed 100%)',
  'linear-gradient(135deg, #10b981 0%, #06b6d4 55%, #3b82f6 100%)',
  'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
];

function updateCoverModalPreview(val) {
  pendingCoverValue = String(val || '').trim();
  applyCoverBackground(coverPreviewBox, pendingCoverValue);
  if (coverSuggestionsGrid) {
    coverSuggestionsGrid.querySelectorAll('.cover-suggestion-item').forEach((item) => {
      item.classList.toggle('selected', item.dataset.cover === pendingCoverValue);
    });
  }
}

function openChangeCoverModal() {
  if (currentCuratedPlaylist) {
    showToast('Save this curated playlist to your library first to customize its picture.');
    return;
  }

  const plObj = allPlaylists.find((p) => String(p.id) === String(currentListId));
  const existingCover = plObj && plObj.cover ? plObj.cover : '';
  pendingCoverValue = existingCover;

  if (coverFileInput) coverFileInput.value = '';
  if (coverUrlInput) {
    coverUrlInput.value = existingCover && !existingCover.startsWith('data:') && !existingCover.startsWith('linear-gradient')
      ? existingCover
      : '';
  }

  // Build suggestions from current songs + recommended covers + presets
  if (coverSuggestionsGrid) {
    const songArtworks = [];
    currentSongs.forEach((s) => {
      if (s.artwork && !songArtworks.includes(s.artwork)) {
        songArtworks.push(s.artwork);
      }
    });
    if (songArtworks.length < 4 && Array.isArray(recommendedPlaylists)) {
      recommendedPlaylists.forEach((rp) => {
        if (rp.cover && !songArtworks.includes(rp.cover) && songArtworks.length < 6) {
          songArtworks.push(rp.cover);
        }
      });
    }

    const suggestions = [...songArtworks.slice(0, 6), ...PRESET_COVERS];
    coverSuggestionsGrid.innerHTML = suggestions
      .map((item, idx) => {
        const style = getCoverCssStyle(item);
        const isSelected = item === existingCover;
        return `<button type="button" class="cover-suggestion-item ${isSelected ? 'selected' : ''}" data-cover="${escapeHtml(item)}" style="${style}" title="Select option ${idx + 1}"></button>`;
      })
      .join('');

    coverSuggestionsGrid.querySelectorAll('.cover-suggestion-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = btn.dataset.cover || '';
        if (coverUrlInput) {
          coverUrlInput.value = chosen.startsWith('http') ? chosen : '';
        }
        updateCoverModalPreview(chosen);
      });
    });
  }

  updateCoverModalPreview(existingCover);
  openModal('changeCoverModal');
}

if (coverUploadTriggerBtn && coverFileInput) {
  coverUploadTriggerBtn.addEventListener('click', () => {
    coverFileInput.click();
  });

  coverFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl !== 'string') return;

      // Resize/crop to max 500x500 square via canvas to keep JSON storage fast and compact
      const img = new Image();
      img.onload = () => {
        try {
          const size = Math.min(img.width, img.height);
          const targetSize = Math.min(size, 500);
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
          const compressed = canvas.toDataURL('image/jpeg', 0.86);
          if (coverUrlInput) coverUrlInput.value = '';
          updateCoverModalPreview(compressed);
          showToast('Image ready! Click Save Picture to apply.');
        } catch (_) {
          if (coverUrlInput) coverUrlInput.value = '';
          updateCoverModalPreview(dataUrl);
        }
      };
      img.onerror = () => {
        if (coverUrlInput) coverUrlInput.value = '';
        updateCoverModalPreview(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

if (coverUrlInput) {
  coverUrlInput.addEventListener('input', () => {
    const urlVal = coverUrlInput.value.trim();
    updateCoverModalPreview(urlVal);
  });
}

if (resetCoverBtn) {
  resetCoverBtn.addEventListener('click', () => {
    if (coverFileInput) coverFileInput.value = '';
    if (coverUrlInput) coverUrlInput.value = '';
    updateCoverModalPreview('');
    showToast('Preview reset to default gradient');
  });
}

if (changeCoverForm) {
  changeCoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const updated = await api(`/api/playlists/${encodeURIComponent(currentListId)}/cover`, {
        method: 'PUT',
        body: JSON.stringify({ cover: pendingCoverValue }),
      });

      closeModal('changeCoverModal');
      if (!currentCuratedPlaylist && bannerCover) {
        applyCoverBackground(bannerCover, updated.cover);
      }
      await loadPlaylistLibrary();
      showToast(updated.cover ? 'Playlist picture updated!' : 'Playlist picture reset to default.');
      addNotification('Playlist Picture Changed', `Updated cover for "${currentPlaylistName}"`);
    } catch (err) {
      showToast(err.message || 'Could not update playlist picture.');
    }
  });
}

if (bannerCover) {
  bannerCover.addEventListener('click', () => {
    if (!currentCuratedPlaylist) {
      openChangeCoverModal();
    }
  });
  bannerCover.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !currentCuratedPlaylist) {
      e.preventDefault();
      openChangeCoverModal();
    }
  });
}

if (bannerChangeCoverBtn) {
  bannerChangeCoverBtn.addEventListener('click', () => {
    openChangeCoverModal();
  });
}

// Browse Button
if (browseBtn) {
  browseBtn.addEventListener('click', () => {
    switchTab('search');
    showToast('Browsing iTunes Catalog');
  });
}

// Nav back & forward (switch between playlists)
if (navBackBtn && navForwardBtn) {
  function cyclePlaylist(direction) {
    const items = Array.from(document.querySelectorAll('.library-item'));
    if (!items.length) return;
    const currIdx = items.findIndex((item) => item.dataset.id === String(currentListId));
    let nextIdx = currIdx + direction;
    if (nextIdx < 0) nextIdx = items.length - 1;
    if (nextIdx >= items.length) nextIdx = 0;
    items[nextIdx].click();
  }

  navBackBtn.addEventListener('click', () => cyclePlaylist(-1));
  navForwardBtn.addEventListener('click', () => cyclePlaylist(1));
}

// Banner Action Buttons
if (bannerPlayAllBtn) {
  bannerPlayAllBtn.addEventListener('click', () => {
    if (!currentSongs.length) {
      showToast('No tracks to play in this playlist.');
      return;
    }
    currentTrackIndex = 0;
    playTrack(currentSongs[0]);
  });
}

if (bannerShuffleBtn) {
  bannerShuffleBtn.addEventListener('click', () => {
    if (!currentSongs.length) {
      showToast('No tracks to shuffle.');
      return;
    }
    isShuffle = true;
    shuffleBtn?.classList.add('active');
    expShuffleBtn?.classList.add('active');
    currentTrackIndex = Math.floor(Math.random() * currentSongs.length);
    playTrack(currentSongs[currentTrackIndex]);
    showToast('Shuffling playlist');
  });
}

if (bannerAddSongBtn) {
  bannerAddSongBtn.addEventListener('click', () => {
    const formPanel = document.getElementById('musicFormPanel');
    if (formPanel) {
      formPanel.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('song')?.focus();
    }
  });
}

if (railPlayBtn) {
  railPlayBtn.addEventListener('click', togglePlayPause);
}

// ==========================================
// 6. CONTEXT MENU & ACCOUNT ACTIONS
// ==========================================

function toggleMoreOptionsMenu(show, anchor = moreOptionsBtn) {
  if (!moreOptionsMenu) return;
  moreOptionsMenu.classList.toggle('hidden', !show);

  if (show && anchor) {
    const rect = anchor.getBoundingClientRect();
    moreOptionsMenu.style.left = `${Math.min(rect.left, window.innerWidth - 290)}px`;
    moreOptionsMenu.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 380)}px`;
    refreshIcons();
  }
}

if (moreOptionsBtn) {
  moreOptionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = moreOptionsMenu.classList.contains('hidden');
    toggleMoreOptionsMenu(isHidden, moreOptionsBtn);
  });
}

document.addEventListener('click', (e) => {
  if (moreOptionsMenu && !moreOptionsMenu.contains(e.target) && e.target !== moreOptionsBtn) {
    toggleMoreOptionsMenu(false);
  }
  if (accountMenu && !accountMenu.contains(e.target) && e.target !== avatarButton) {
    accountMenu.classList.add('hidden');
  }
  if (notificationPopup && !notificationPopup.contains(e.target) && e.target !== notificationBtn) {
    notificationPopup.classList.add('hidden');
  }
});

// Modal close button delegation
document.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('[data-close-modal]');
  if (closeBtn) {
    const modalId = closeBtn.dataset.closeModal;
    closeModal(modalId);
  }
});

// Context Menu Action Dispatcher
if (moreOptionsMenu) {
  moreOptionsMenu.addEventListener('click', async (e) => {
    const btn = e.target.closest('.menu-item');
    if (!btn) return;
    const action = btn.dataset.action;
    toggleMoreOptionsMenu(false);

    switch (action) {
      case 'add-to-queue':
        if (activeContextTrack) {
          playQueue.push(activeContextTrack);
          showToast(`Added "${activeContextTrack.song}" to queue`);
        } else if (currentPlayingTrack) {
          playQueue.push(currentPlayingTrack);
          showToast(`Added "${currentPlayingTrack.song}" to queue`);
        } else {
          showToast('Select a song to add to queue');
        }
        break;

      case 'start-jam':
        isJamActive = !isJamActive;
        if (jamSessionBadge) jamSessionBadge.classList.toggle('hidden', !isJamActive);
        showToast(isJamActive ? 'Jam session started! Group listening enabled.' : 'Jam session ended.');
        addNotification('Jam Mode', isJamActive ? 'Live jam started' : 'Jam ended');
        break;

      case 'change-cover':
        openChangeCoverModal();
        break;

      case 'edit-details':
        if (currentListId === 'main') {
          showToast('The main playlist cannot be renamed.');
          return;
        }
        const editInput = document.getElementById('editPlaylistName');
        if (editInput) editInput.value = currentPlaylistName;
        openModal('renamePlaylistModal');
        break;

      case 'edit-song':
        if (activeContextTrack) {
          window.location.href = `/edit.html?id=${encodeURIComponent(activeContextTrack.id)}&list=${encodeURIComponent(currentListId)}`;
        } else if (currentSongs.length > 0) {
          window.location.href = `/edit.html?id=${encodeURIComponent(currentSongs[0].id)}&list=${encodeURIComponent(currentListId)}`;
        } else {
          showToast('No song selected to edit.');
        }
        break;

      case 'create-playlist':
        openModal('createPlaylistModal');
        break;

      case 'make-private':
        isPrivateSession = !isPrivateSession;
        showToast(`Playlist visibility: ${isPrivateSession ? 'Private' : 'Public'}`);
        break;

      case 'invite-collaborators':
        const email = prompt('Enter collaborator email address to share this playlist:');
        if (email && email.trim()) {
          showToast(`Invitation sent to ${email.trim()}!`);
          addNotification('Collaborator Invited', `Sent invite to ${email.trim()}`);
        }
        break;

      case 'delete-song':
        if (activeContextTrack) {
          if (confirm(`Delete "${activeContextTrack.song}" from this playlist?`)) {
            try {
              await api(`/api/music/${activeContextTrack.id}?list=${encodeURIComponent(currentListId)}`, { method: 'DELETE' });
              showToast(`Deleted "${activeContextTrack.song}"`);
              addNotification('Song Deleted', `Deleted "${activeContextTrack.song}"`);
              activeContextTrack = null;
              await loadPlaylist();
            } catch (err) {
              showToast(err.message || 'Failed to delete song.');
            }
          }
        } else {
          showToast('Select a song using ••• to delete.');
        }
        break;

      case 'delete-playlist':
        if (currentListId === 'main') {
          showToast('You cannot delete your default playlist.');
          return;
        }
        if (confirm(`Delete the entire playlist "${currentPlaylistName}"?`)) {
          try {
            await api(`/api/playlists/${currentListId}`, { method: 'DELETE' });
            showToast(`Deleted playlist "${currentPlaylistName}"`);
            addNotification('Playlist Deleted', `Deleted "${currentPlaylistName}"`);
            currentListId = 'main';
            currentPlaylistName = 'My Playlist';
            await loadPlaylistLibrary();
            await loadPlaylist();
          } catch (err) {
            showToast(err.message || 'Could not delete playlist.');
          }
        }
        break;
    }
  });
}

// Account Menu Actions
if (avatarButton && accountMenu) {
  avatarButton.addEventListener('click', (e) => {
    e.stopPropagation();
    accountMenu.classList.toggle('hidden');
    refreshIcons();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    logout();
  });
}

const accountProfileBtn = document.getElementById('accountProfileBtn');
if (accountProfileBtn) {
  accountProfileBtn.onclick = () => {
    accountMenu.classList.add('hidden');
    const uSpan = document.getElementById('profileUsername');
    if (uSpan) uSpan.textContent = currentUsername();
    const songCountSpan = document.getElementById('statSongCount');
    if (songCountSpan) songCountSpan.textContent = currentSongs.length;
    const plCountSpan = document.getElementById('statPlaylistCount');
    if (plCountSpan) plCountSpan.textContent = allPlaylists.length;
    openModal('profileModal');
  };
}

const accountSupportBtn = document.getElementById('accountSupportBtn');
if (accountSupportBtn) {
  accountSupportBtn.onclick = () => {
    accountMenu.classList.add('hidden');
    openModal('supportModal');
  };
}

const accountPrivateBtn = document.getElementById('accountPrivateBtn');
if (accountPrivateBtn) {
  accountPrivateBtn.onclick = () => {
    accountMenu.classList.add('hidden');
    isPrivateSession = !isPrivateSession;
    showToast(isPrivateSession ? 'Private listening enabled.' : 'Private session turned off.');
  };
}

const accountSettingsBtn = document.getElementById('accountSettingsBtn');
if (accountSettingsBtn) {
  accountSettingsBtn.onclick = () => {
    accountMenu.classList.add('hidden');
    showToast('Settings: Audio stream format AAC/M4A 256kbps');
  };
}

// Notification Drawer Toggle
if (notificationBtn && notificationPopup) {
  notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = notificationPopup.classList.contains('hidden');
    notificationPopup.classList.toggle('hidden', !isHidden);
    if (!notificationPopup.classList.contains('hidden')) {
      renderNotifications();
    }
  });
}

if (clearNotificationsBtn) {
  clearNotificationsBtn.addEventListener('click', () => {
    notifications = [];
    renderNotifications();
    showToast('Notifications cleared');
  });
}

// Favorites Filter Toggle (Saved songs button)
if (savedSongsBtn) {
  savedSongsBtn.addEventListener('click', () => {
    isShowingLikedOnly = !isShowingLikedOnly;
    savedSongsBtn.classList.toggle('is-active', isShowingLikedOnly);
    savedSongsBtn.style.color = isShowingLikedOnly ? 'var(--cyan)' : '';
    showToast(isShowingLikedOnly ? `Showing favorites (${likedTrackIds.size} saved)` : 'Showing all playlist songs');
    renderPlaylist();
    updateBannerMeta();
  });
}

// Window minimize/collapse toggle
if (minimizeBtn) {
  minimizeBtn.addEventListener('click', () => {
    document.querySelector('.spotify-desktop')?.classList.toggle('app-minimized');
    showToast('Toggled compact view');
  });
}

// Sidebar toggle button (Maximize button)
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    const desktop = document.querySelector('.spotify-desktop');
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      const isHidden = sidebar.style.display === 'none';
      sidebar.style.display = isHidden ? '' : 'none';
      if (desktop) {
        desktop.style.gridTemplateColumns = isHidden ? 'minmax(260px, 360px) minmax(0, 1fr)' : '1fr';
      }
      showToast(isHidden ? 'Sidebar expanded' : 'Sidebar hidden (Full width)');
    }
  });
}

// Exit button
if (exitBtn) {
  exitBtn.addEventListener('click', () => {
    if (confirm('Sign out and exit to login?')) {
      logout();
    }
  });
}

// Tab navigation (All, Add New, Search iTunes)
document.querySelectorAll('.pill-row .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabType = tab.dataset.tab;
    switchTab(tabType);
  });
});

// Library filter chips (Playlists / Favorites)
document.querySelectorAll('.chip-row .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip-row .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    const filter = chip.dataset.filter;
    if (filter === 'liked') {
      isShowingLikedOnly = true;
      savedSongsBtn?.classList.add('is-active');
      showToast(`Showing favorites (${likedTrackIds.size} saved)`);
    } else {
      isShowingLikedOnly = false;
      savedSongsBtn?.classList.remove('is-active');
      showToast('Showing all playlists');
    }
    renderPlaylist();
    updateBannerMeta();
  });
});

// Featured Recommendations Cards
document.querySelectorAll('.feature-card').forEach((card) => {
  card.addEventListener('click', () => {
    const term = card.dataset.search || card.querySelector('span')?.textContent || '';
    if (term) {
      if (searchTermInput) {
        searchTermInput.value = term;
        searchClearBtn?.classList.remove('hidden');
      }
      switchTab('search');
      performSearch(term);
    }
  });
});

const showAllFeaturedBtn = document.getElementById('showAllFeaturedBtn');
if (showAllFeaturedBtn) {
  showAllFeaturedBtn.onclick = () => {
    if (searchTermInput) {
      searchTermInput.value = 'Top Hits 2026';
      searchClearBtn?.classList.remove('hidden');
    }
    switchTab('search');
    performSearch('Top Hits 2026');
  };
}

// Related panel artist search
const miniVideo = document.querySelector('.mini-video');
if (miniVideo) {
  miniVideo.onclick = () => {
    if (searchTermInput) {
      searchTermInput.value = 'Taylor Swift';
      searchClearBtn?.classList.remove('hidden');
    }
    switchTab('search');
    performSearch('Taylor Swift');
  };
}

// Player Bar Buttons
if (playBtn) playBtn.addEventListener('click', togglePlayPause);
if (expPlayBtn) expPlayBtn.addEventListener('click', togglePlayPause);
if (nextBtn) nextBtn.addEventListener('click', playNextTrack);
if (expNextBtn) expNextBtn.addEventListener('click', playNextTrack);
if (prevBtn) prevBtn.addEventListener('click', playPrevTrack);
if (expPrevBtn) expPrevBtn.addEventListener('click', playPrevTrack);

if (shuffleBtn) {
  shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
    if (expShuffleBtn) expShuffleBtn.classList.toggle('active', isShuffle);
    showToast(isShuffle ? 'Shuffle enabled' : 'Shuffle disabled');
  });
}

if (expShuffleBtn) {
  expShuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    expShuffleBtn.classList.toggle('active', isShuffle);
    if (shuffleBtn) shuffleBtn.classList.toggle('active', isShuffle);
    showToast(isShuffle ? 'Shuffle enabled' : 'Shuffle disabled');
  });
}

if (repeatBtn) {
  repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
    if (expRepeatBtn) expRepeatBtn.classList.toggle('active', isRepeat);
    showToast(isRepeat ? 'Repeat enabled' : 'Repeat disabled');
  });
}

if (expRepeatBtn) {
  expRepeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    expRepeatBtn.classList.toggle('active', isRepeat);
    if (repeatBtn) repeatBtn.classList.toggle('active', isRepeat);
    showToast(isRepeat ? 'Repeat enabled' : 'Repeat disabled');
  });
}

if (likeBtn) {
  likeBtn.addEventListener('click', () => {
    if (!currentPlayingTrack) {
      showToast('No track is currently playing.');
      return;
    }
    const id = currentPlayingTrack.id;
    if (likedTrackIds.has(id)) {
      likedTrackIds.delete(id);
      likeBtn.style.color = '';
      likeBtn.innerHTML = '<i data-lucide="heart"></i>';
      showToast(`Removed "${currentPlayingTrack.song}" from favorites`);
    } else {
      likedTrackIds.add(id);
      likeBtn.style.color = '#f43f5e';
      likeBtn.innerHTML = '<i data-lucide="heart" style="fill: #f43f5e; color: #f43f5e;"></i>';
      showToast(`Saved "${currentPlayingTrack.song}" to favorites!`);
    }
    refreshIcons();
    renderPlaylist();
  });
}

// Expanded Player Overlay Toggle
if (playerExpandBtn && expandedPlayer) {
  playerExpandBtn.addEventListener('click', () => {
    expandedPlayer.classList.remove('hidden');
    refreshIcons();
  });
}

if (playerCollapseBtn && expandedPlayer) {
  playerCollapseBtn.addEventListener('click', () => {
    expandedPlayer.classList.add('hidden');
  });
}

// ==========================================
// 6.5. RECOMMENDED CURATED PLAYLISTS
// ==========================================

let recommendedPlaylists = [];
let activeRecommendedPlaylist = null;

const recommendedGrid = document.getElementById('recommendedGrid');
const recModalCover = document.getElementById('recModalCover');
const recModalHeading = document.getElementById('recModalHeading');
const recModalDesc = document.getElementById('recModalDesc');
const recModalTag = document.getElementById('recModalTag');
const recPlayAllBtn = document.getElementById('recPlayAllBtn');
const recImportBtn = document.getElementById('recImportBtn');
const recModalSongList = document.getElementById('recModalSongList');

async function loadRecommendedPlaylists() {
  if (!recommendedGrid) return;

  try {
    const list = await api('/api/recommended-playlists');
    recommendedPlaylists = Array.isArray(list) ? list : [];

    recommendedGrid.innerHTML = recommendedPlaylists.map(pl => {
      const artistSummary = pl.songs.slice(0, 3).map(s => s.artist).join(', ') + (pl.songs.length > 3 ? '...' : '');
      return `
        <div class="recommended-card" data-id="${escapeHtml(pl.id)}">
          <div class="rec-cover-wrap">
            <img src="${escapeHtml(pl.cover)}" alt="${escapeHtml(pl.name)}" class="rec-cover-img" onerror="this.src=''" />
            <span class="rec-tag-badge">${escapeHtml(pl.tag || 'Curated')}</span>
            <button class="rec-hover-play" data-id="${escapeHtml(pl.id)}" title="Play ${escapeHtml(pl.name)}">
              <i data-lucide="play" style="fill: #08170d; width: 18px; height: 18px;"></i>
            </button>
          </div>
          <strong title="${escapeHtml(pl.name)}">${escapeHtml(pl.name)}</strong>
          <p>${escapeHtml(pl.description || artistSummary)}</p>
          <div class="rec-card-meta">
            <span><i data-lucide="music-2" style="width: 12px; height: 12px; margin-right: 4px;"></i> ${pl.songs.length} tracks</span>
            <span style="color: var(--green); font-weight: 600;">Explore →</span>
          </div>
        </div>
      `;
    }).join('');

    refreshIcons();

    // Attach card click handlers - Goes directly to that particular playlist!
    recommendedGrid.querySelectorAll('.recommended-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.rec-hover-play')) return;
        const id = card.dataset.id;
        const pl = recommendedPlaylists.find(p => p.id === id);
        if (pl) {
          openParticularPlaylist(pl);
        }
      });
    });

    // Attach card hover play button handlers - opens playlist & begins playing
    recommendedGrid.querySelectorAll('.rec-hover-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const pl = recommendedPlaylists.find(p => p.id === id);
        if (pl && pl.songs.length) {
          openParticularPlaylist(pl);
          playTrack(pl.songs[0]);
        }
      });
    });

  } catch (err) {
    console.error('Failed to load recommended playlists:', err);
  }
}

// ==========================================
// 6. VIEW NAVIGATION (Home View vs Playlist View)
// ==========================================

// Open a curated recommended playlist view
function openParticularPlaylist(pl, pushHistory = true) {
  if (!pl) return;
  activeRecommendedPlaylist = pl;
  currentCuratedPlaylist = pl;
  currentPlaylistName = pl.name;
  searchOpenedFromHome = false;

  if (homeView) homeView.classList.add('hidden');
  if (playlistView) playlistView.classList.remove('hidden');
  if (sidebarHomeBtn) sidebarHomeBtn.classList.remove('active');
  if (sidebarSearchBtn) sidebarSearchBtn.classList.remove('active');
  if (selectedPlaylistBanner) selectedPlaylistBanner.classList.remove('hidden');

  // De-select sidebar library items
  libraryList?.querySelectorAll('.library-item').forEach((i) => i.classList.remove('selected-playlist'));

  // Update breadcrumb
  if (playlistBreadcrumb) playlistBreadcrumb.textContent = `Home / ${pl.name}`;

  // Update banner cover, title, meta, badges
  if (bannerCover) {
    bannerCover.classList.add('readonly-cover');
    applyCoverBackground(bannerCover, pl.cover);
  }
  if (bannerTitle) bannerTitle.textContent = pl.name;
  if (bannerMeta) {
    bannerMeta.textContent = `${pl.songs.length} songs • ${pl.description || 'Curated soundtrack'}`;
  }
  if (playlistTypeBadge) {
    playlistTypeBadge.textContent = pl.tag ? `Curated • ${pl.tag}` : 'Curated Playlist';
  }

  // Hide Add Song Form tab for un-imported curated playlists
  const addTab = document.getElementById('addSongTabBtn');
  if (addTab) addTab.classList.add('hidden');
  switchTab('all', false);

  // Import button handling
  const alreadyImported = allPlaylists.find((p) => p.name === pl.name || p.name === `${pl.name} (Curated)`);
  if (bannerImportBtn) {
    bannerImportBtn.classList.remove('hidden');
    if (alreadyImported) {
      bannerImportBtn.innerHTML = '<i data-lucide="check"></i> In Your Library';
      bannerImportBtn.disabled = true;
      bannerImportBtn.style.opacity = '0.75';
    } else {
      bannerImportBtn.innerHTML = '<i data-lucide="folder-plus"></i> Save to Your Library';
      bannerImportBtn.disabled = false;
      bannerImportBtn.style.opacity = '1';
      bannerImportBtn.onclick = async () => {
        await importCuratedPlaylist(pl);
      };
    }
  }

  if (bannerAddSongBtn) bannerAddSongBtn.classList.add('hidden');
  if (bannerChangeCoverBtn) bannerChangeCoverBtn.classList.add('hidden');

  currentSongs = [...pl.songs];
  renderPlaylist();
  refreshIcons();

  if (pushHistory) {
    history.pushState({ view: 'playlist', isCurated: true, id: pl.id }, '', `?list=${encodeURIComponent(pl.id)}`);
  }

  document.querySelector('.center-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// Open a user playlist from library
async function openUserPlaylist(listId, listName, pushHistory = true) {
  currentListId = String(listId);
  currentPlaylistName = listName || 'My Playlist';
  activeRecommendedPlaylist = null;
  currentCuratedPlaylist = null;
  searchOpenedFromHome = false;

  if (homeView) homeView.classList.add('hidden');
  if (playlistView) playlistView.classList.remove('hidden');
  if (sidebarHomeBtn) sidebarHomeBtn.classList.remove('active');
  if (sidebarSearchBtn) sidebarSearchBtn.classList.remove('active');
  if (selectedPlaylistBanner) selectedPlaylistBanner.classList.remove('hidden');

  // Highlight in sidebar library
  libraryList?.querySelectorAll('.library-item').forEach((i) => {
    i.classList.toggle('selected-playlist', String(i.dataset.id) === String(currentListId));
  });

  // Update breadcrumb
  if (playlistBreadcrumb) playlistBreadcrumb.textContent = `Home / ${currentPlaylistName}`;

  if (playlistTypeBadge) playlistTypeBadge.textContent = 'Playlist';
  if (bannerImportBtn) bannerImportBtn.classList.add('hidden');
  if (bannerAddSongBtn) bannerAddSongBtn.classList.remove('hidden');
  if (bannerChangeCoverBtn) bannerChangeCoverBtn.classList.remove('hidden');

  const addTab = document.getElementById('addSongTabBtn');
  if (addTab) addTab.classList.remove('hidden');

  const plObj = allPlaylists.find((p) => String(p.id) === String(currentListId));
  if (bannerCover) {
    bannerCover.classList.remove('readonly-cover');
    applyCoverBackground(bannerCover, plObj ? plObj.cover : '');
  }

  switchTab('all', false);
  await loadPlaylist();

  if (pushHistory) {
    history.pushState({ view: 'playlist', isCurated: false, id: currentListId, name: currentPlaylistName }, '', `?list=${encodeURIComponent(currentListId)}`);
  }

  document.querySelector('.center-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// Return to Home View
function showHomeView(pushHistory = true) {
  currentCuratedPlaylist = null;
  activeRecommendedPlaylist = null;
  searchOpenedFromHome = false;

  if (homeView) homeView.classList.remove('hidden');
  if (playlistView) playlistView.classList.add('hidden');
  if (sidebarHomeBtn) sidebarHomeBtn.classList.add('active');
  if (sidebarSearchBtn) sidebarSearchBtn.classList.remove('active');

  if (selectedPlaylistBanner) selectedPlaylistBanner.classList.remove('hidden');
  if (searchTermInput) searchTermInput.value = '';
  if (searchClearBtn) searchClearBtn.classList.add('hidden');
  clearTimeout(searchDebounceTimer);

  libraryList?.querySelectorAll('.library-item').forEach((i) => i.classList.remove('selected-playlist'));

  updateHomeGreeting();
  updateHomeStats();
  renderHomeUserPlaylists();

  if (pushHistory) {
    history.pushState({ view: 'home' }, '', '/index.html');
  }

  document.querySelector('.center-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateHomeGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour >= 5 && hour < 12) greeting = 'Good morning';
  else if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
  if (homeGreetingTitle) homeGreetingTitle.textContent = greeting;
}

function updateHomeStats() {
  if (homeStatSongCount) {
    const totalSongs = allPlaylists.reduce((acc, pl) => acc + (pl.count || 0), 0);
    homeStatSongCount.textContent = totalSongs || currentSongs.length || 0;
  }
  if (homeStatPlCount) {
    homeStatPlCount.textContent = allPlaylists.length || 1;
  }
}

function renderHomeUserPlaylists() {
  if (!homeUserPlaylistsGrid) return;
  if (!allPlaylists.length) {
    homeUserPlaylistsGrid.innerHTML = `
      <div class="home-pl-card" data-id="main" data-name="My Playlist">
        <div class="home-pl-icon"><i data-lucide="list-music"></i></div>
        <div class="home-pl-meta">
          <strong>My Playlist</strong>
          <small>Default playlist</small>
        </div>
      </div>
    `;
  } else {
    homeUserPlaylistsGrid.innerHTML = allPlaylists.map((pl) => {
      const hasCover = Boolean(pl.cover && String(pl.cover).trim());
      const coverStyle = hasCover ? getCoverCssStyle(pl.cover) : '';
      return `
        <div class="home-pl-card" data-id="${escapeHtml(pl.id)}" data-name="${escapeHtml(pl.name)}">
          <div class="home-pl-icon ${hasCover ? 'has-cover' : ''}" style="${coverStyle}">
            ${hasCover && !String(pl.cover).startsWith('linear-gradient') ? '' : '<i data-lucide="list-music"></i>'}
          </div>
          <div class="home-pl-meta">
            <strong>${escapeHtml(pl.name)}</strong>
            <small>${pl.count || 0} song${pl.count === 1 ? '' : 's'}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  homeUserPlaylistsGrid.querySelectorAll('.home-pl-card').forEach(card => {
    card.addEventListener('click', () => {
      openUserPlaylist(card.dataset.id, card.dataset.name);
    });
  });

  refreshIcons();
}

async function importCuratedPlaylist(pl) {
  try {
    const res = await api(`/api/recommended-playlists/${encodeURIComponent(pl.id)}/import`, { method: 'POST' });
    showToast(res.message || 'Imported to your library!');
    addNotification('Playlist Imported', `Imported "${pl.name}" into your library`);
    await loadPlaylistLibrary();
    if (res.playlist && res.playlist.id) {
      await openUserPlaylist(res.playlist.id, res.playlist.name);
    }
  } catch (err) {
    showToast(err.message || 'Could not import playlist.');
  }
}

// Navigation event listeners
if (sidebarHomeBtn) {
  sidebarHomeBtn.addEventListener('click', () => showHomeView());
}

if (playlistBackBtn) {
  playlistBackBtn.addEventListener('click', () => showHomeView());
}

if (sidebarSearchBtn) {
  sidebarSearchBtn.addEventListener('click', () => {
    switchTab('search');
    searchTermInput?.focus();
  });
}

// Nav back & forward (switch between views & playlists)
if (navBackBtn && navForwardBtn) {
  function cyclePlaylist(direction) {
    const items = Array.from(document.querySelectorAll('.library-item'));
    if (!items.length) return;
    const currIdx = items.findIndex((item) => item.dataset.id === String(currentListId));
    let nextIdx = currIdx + direction;
    if (nextIdx < 0) nextIdx = items.length - 1;
    if (nextIdx >= items.length) nextIdx = 0;
    items[nextIdx].click();
  }

  navBackBtn.addEventListener('click', () => {
    if (playlistView && !playlistView.classList.contains('hidden')) {
      showHomeView();
    } else {
      cyclePlaylist(-1);
    }
  });

  navForwardBtn.addEventListener('click', () => {
    if (homeView && !homeView.classList.contains('hidden')) {
      openUserPlaylist(currentListId || 'main', currentPlaylistName || 'My Playlist');
    } else {
      cyclePlaylist(1);
    }
  });
}

// Popstate handler for browser back/forward buttons
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view === 'playlist') {
    if (e.state.isCurated) {
      const pl = recommendedPlaylists.find(p => p.id === e.state.id);
      if (pl) openParticularPlaylist(pl, false);
    } else {
      openUserPlaylist(e.state.id, e.state.name, false);
    }
  } else if (e.state && e.state.view === 'search') {
    switchTab('search', false);
  } else {
    showHomeView(false);
  }
});

// ==========================================
// 7. BOOTSTRAP APPLICATION
// ==========================================

async function initApp() {
  initAuth();
  await loadPlaylistLibrary();
  await loadRecommendedPlaylists();

  // Check URL query param: e.g. ?list=123 or ?search=1
  const urlParams = new URLSearchParams(window.location.search);
  const listParam = urlParams.get('list');
  const searchParam = urlParams.get('search');

  if (listParam) {
    const curated = recommendedPlaylists.find(p => p.id === listParam);
    if (curated) {
      openParticularPlaylist(curated, false);
    } else {
      const pl = allPlaylists.find(p => String(p.id) === String(listParam));
      await openUserPlaylist(listParam, pl ? pl.name : 'My Playlist', false);
    }
  } else if (searchParam) {
    switchTab('search', false);
  } else {
    // Start on Home view!
    showHomeView(false);
  }

  refreshIcons();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
