console.log('Initializing Dashboard...');
if (typeof netlifyIdentity === 'undefined') {
  console.error('Netlify Identity script not loaded');
} else {
  netlifyIdentity.init({ API_ENDPOINT: 'https://gamelist-manager.netlify.app/.netlify/identity' });
  console.log('Netlify Identity initialized');
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
  window.location.href = '/'; // Redirect to home
});

function handleAuthChange(user) {
  window.currentUser = user;
  const status = document.getElementById('status');
  const logoutBtn = document.getElementById('logout-btn');
  if (user) {
    logoutBtn.style.display = 'inline';
    loadSystems();
  } else {
    logoutBtn.style.display = 'none';
    status.textContent = 'Please log in';
    window.location.href = '/';
  }
}

async function loadSystems() {
  const status = document.getElementById('status');
  const systemsList = document.getElementById('systems-list');
  try {
    status.textContent = 'Loading systems...';
    const headers = {};
    if (window.currentUser) {
      headers['Authorization'] = `Bearer ${window.currentUser.token.access_token}`;
    }
    const response = await fetch('/api/get-systems', {
      method: 'GET',
      headers
    });
    const data = await response.json();
    console.log('Get-systems response:', data);
    if (response.ok) {
      const systems = data.systems || [];
      if (systems.length === 0) {
        status.textContent = 'No systems found';
        systemsList.innerHTML = '';
      } else {
        status.textContent = '';
        systemsList.innerHTML = systems.map(system => `
          <div class="system-item">
            <h3>${system}</h3>
            <button onclick="loadStats('${system}')">View Stats</button>
            <div id="stats-${system}"></div>
          </div>
        `).join('');
      }
    } else {
      status.textContent = data.error || 'Failed to load systems';
    }
  } catch (err) {
    console.error('Load systems error:', err);
    status.textContent = 'Error loading systems';
  }
}

async function loadStats(system) {
  const statsDiv = document.getElementById(`stats-${system}`);
  try {
    statsDiv.textContent = 'Loading stats...';
    const formData = new FormData();
    formData.append('system', system);
    const headers = {};
    if (window.currentUser) {
      headers['Authorization'] = `Bearer ${window.currentUser.token.access_token}`;
    }
    const response = await fetch('/api/get-stats', {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await response.json();
    console.log('Get-stats response:', data);
    if (response.ok) {
      const stats = data.stats || {};
      statsDiv.innerHTML = `
        <p>Games: ${stats.totalGames}</p>
        <p>With Image: ${stats.withImage}</p>
        <p>With Developer: ${stats.withDeveloper}</p>
        <p>With Publisher: ${stats.withPublisher}</p>
      `;
    } else {
      statsDiv.textContent = data.error || 'Failed to load stats';
    }
  } catch (err) {
    console.error('Load stats error:', err);
    statsDiv.textContent = 'Error loading stats';
  }
}