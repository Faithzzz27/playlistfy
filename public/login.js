// login.js - log in or create an account (extra feature).
const loginForm = document.getElementById('loginForm');
const registerBtn = document.getElementById('registerBtn');
const loginError = document.getElementById('loginError');

function readCredentials() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  return { username, password };
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.toggle('hidden', !message);
}

async function submitAuth(endpoint) {
  const { username, password } = readCredentials();
  if (!username || !password) {
    showError('Please enter a username and password.');
    return;
  }

  try {
    const result = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('musicUsername', result.username);
    window.location.href = '/index.html';
  } catch (error) {
    showError(error.message);
  }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitAuth('/api/login');
});

registerBtn.addEventListener('click', () => submitAuth('/api/register'));
