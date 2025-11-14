console.log('Initializing Dashboard...');

if (typeof netlifyIdentity === 'undefined') {
  console.error('Netlify Identity script not loaded');
} else {
  netlifyIdentity.init({ API_ENDPOINT: 'https://gamelist-manager.netlify.app/.netlify/identity' });
  console.log('Netlify Identity initialized');
  const currentUser = netlifyIdentity.currentUser();
  if (currentUser) {
    console.log('Restored session:', currentUser.email, 'ID:', currentUser.id);
    handleAuthChange(currentUser);
  } else {
    console.log('No session to restore');
    window.location.href = '/';
  }
}

netlifyIdentity.on('init', user => {
  console.log('Identity init:', user ? user.email : 'No user');
  handleAuthChange(user);
});

netlifyIdentity.on('login', user => {
  console.log('Login:', user.email, 'ID:', user.id);
  handleAuthChange(user);
  netlifyIdentity.close();
});

netlifyIdentity.on('logout', () => {
  console.log('Logout');
  handleAuthChange(null);
  window.location.href = '/';
});

function handleAuthChange(user) {
  window.currentUser = user;
  const logoutBtn = document.getElementById('logout-btn');
  const actionStatus = document.getElementById('action-status');
  if (user) {
    logoutBtn.style.display = 'inline';
    actionStatus.textContent = '';
    loadSystems();
  } else {
    logoutBtn.style.display = 'none';
    actionStatus.textContent = 'Please log in';
    window.location.href = '/';
  }
}

async function loadSystems() {
  const select = document.getElementById('system-select');
  const actionStatus = document.getElementById('action-status');
  try {
    actionStatus.textContent = 'Loading systems...';
    const response = await fetch('/api/get-systems', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${window.currentUser.token.access_token}`
      }
    });
    const data = await response.json();
    console.log('Get-systems response:', data);
    if (response.ok) {
      const systems = data.systems || [];
      select.innerHTML = '<option value="">Select System</option>' + systems.map(s => `<option value="${s}">${s}</option>`).join('');
      select.addEventListener('change', (e) => loadGames(e.target.value, 1));
      actionStatus.textContent = '';
    } else {
      actionStatus.textContent = data.error || 'Failed to load systems';
    }
  } catch (err) {
    console.error('Load systems error:', err);
    actionStatus.textContent = 'Error loading systems';
  }
}

async function loadGames(system, page = 1) {
  const gamesList = document.getElementById('games-list');
  const actionStatus = document.getElementById('action-status');
  const searchInput = document.getElementById('search-input');
  const search = searchInput ? searchInput.value : '';
  const limit = 50;
  try {
    actionStatus.textContent = 'Loading games...';
    const params = new URLSearchParams({ system, page, limit, search });
    const response = await fetch(`/api/get-games?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${window.currentUser.token.access_token}`
      }
    });
    const data = await response.json();
    console.log('Get-games response:', data);
    if (response.ok) {
      const games = data.games || [];
      const total = data.total || 0;
      const pages = Math.ceil(total / limit);
      
      // Remove existing pagination div (fix for stacking)
      const existingPagination = document.querySelector('.pagination');
      if (existingPagination) existingPagination.remove();
      
      gamesList.innerHTML = games.map(game => `
        <div class="game-item" id="game-${game._id}">
          <h3>${game.name}</h3>
          <p>Path: ${game.path}</p>
          <button onclick="editGame('${game._id}')">Edit</button>
          <form id="edit-form-${game._id}" class="edit-form">
            <input type="text" id="name-${game._id}" value="${game.name || ''}" placeholder="Name">
            <input type="text" id="image-${game._id}" value="${game.image || ''}" placeholder="Image">
            <textarea id="desc-${game._id}" placeholder="Description">${game.desc || ''}</textarea>
            <input type="number" id="rating-${game._id}" value="${game.rating || ''}" placeholder="Rating">
            <input type="text" id="releasedate-${game._id}" value="${game.releasedate || ''}" placeholder="Release Date">
            <input type="text" id="developer-${game._id}" value="${game.developer || ''}" placeholder="Developer">
            <input type="text" id="publisher-${game._id}" value="${game.publisher || ''}" placeholder="Publisher">
            <input type="text" id="genre-${game._id}" value="${game.genre || ''}" placeholder="Genre">
            <input type="text" id="players-${game._id}" value="${game.players || ''}" placeholder="Players">
            <button type="button" onclick="saveGame('${game._id}')">Save</button>
            <button type="button" onclick="cancelEdit('${game._id}')">Cancel</button>
          </form>
        </div>
      `).join('');
      gamesList.insertAdjacentHTML('afterend', `
        <div class="pagination">
          <button onclick="loadGames('${system}', ${page - 1})" ${page === 1 ? 'disabled' : ''}>Prev</button>
          <span>Page ${page} of ${pages}</span>
          <button onclick="loadGames('${system}', ${page + 1})" ${page >= pages ? 'disabled' : ''}>Next</button>
        </div>
      `);
      actionStatus.textContent = '';
    } else {
      actionStatus.textContent = data.error || 'Failed to load games';
    }
  } catch (err) {
    console.error('Load games error:', err);
    actionStatus.textContent = 'Error loading games';
  }
}

function editGame(id) {
  document.getElementById(`edit-form-${id}`).style.display = 'block';
}

function cancelEdit(id) {
  document.getElementById(`edit-form-${id}`).style.display = 'none';
}

async function saveGame(id) {
  const updates = {
    name: document.getElementById(`name-${id}`).value,
    image: document.getElementById(`image-${id}`).value,
    desc: document.getElementById(`desc-${id}`).value,
    rating: parseFloat(document.getElementById(`rating-${id}`).value) || null,
    releasedate: document.getElementById(`releasedate-${id}`).value,
    developer: document.getElementById(`developer-${id}`).value,
    publisher: document.getElementById(`publisher-${id}`).value,
    genre: document.getElementById(`genre-${id}`).value,
    players: document.getElementById(`players-${id}`).value
  };
  const actionStatus = document.getElementById('action-status');
  try {
    actionStatus.textContent = 'Saving...';
    const response = await fetch('/api/update-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.currentUser.token.access_token}`
      },
      body: JSON.stringify({ id, updates })
    });
    const data = await response.json();
    console.log('Update-game response:', data);
    if (response.ok) {
      actionStatus.textContent = 'Game updated successfully';
      document.getElementById(`edit-form-${id}`).style.display = 'none';
      // Reload games to reflect changes
      const system = document.getElementById('system-select').value;
      loadGames(system, 1);
    } else {
      actionStatus.textContent = data.error || 'Failed to update game';
    }
  } catch (err) {
    console.error('Update game error:', err);
    actionStatus.textContent = 'Error updating game';
  }
}