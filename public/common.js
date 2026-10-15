// common.js - small helpers shared by every page (login, playlist, edit).

function currentUsername() {
  let user = localStorage.getItem('musicUsername');
  if (!user || user.trim() === '') {
    user = 'demo';
    localStorage.setItem('musicUsername', 'demo');
  }
  return user.trim();
}

function logout() {
  localStorage.removeItem('musicUsername');
  window.location.href = '/login.html';
}

// Sends a request to our server with the logged-in user attached.
// Returns the JSON body, or throws an Error with the server's message.
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User': currentUsername(),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (response.status === 401 && currentUsername()) {
    logout();
  }

  if (!response.ok) {
    throw new Error((data && data.error) || 'Something went wrong. Please try again.');
  }

  return data;
}

// Stops HTML injection when we put text inside innerHTML
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 269208 ms -> "4:29"
function formatDuration(ms) {
  if (!ms || Number.isNaN(Number(ms))) return '--:--';
  return formatSeconds(Number(ms) / 1000);
}

// 75 -> "1:15"
function formatSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Small pop-up message at the bottom of the screen
function showToast(message) {
  let toast = document.getElementById('statusToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'statusToast';
    toast.className = 'status-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2200);
}
