netlifyIdentity.on('init', user => {
  handleAuthChange(user);
});

netlifyIdentity.on('login', user => {
  handleAuthChange(user);
  netlifyIdentity.close();
});

netlifyIdentity.on('logout', () => {
  handleAuthChange(null);
});

function handleAuthChange(user) {
  window.currentUser = user;
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const dashboardLink = document.getElementById('dashboard-link');
  if (user) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline';
    dashboardLink.style.display = 'inline';
    console.log('Logged in as:', user.email);
  } else {
    loginBtn.style.display = 'inline';
    logoutBtn.style.display = 'none';
    dashboardLink.style.display = 'none';
    console.log('Not logged in');
  }
}

async function postAPI(url, formData, action) {

  const headers = { 'Content-Type': 'application/json' };
  if (window.currentUser) {
    headers['Authorization'] = `Bearer ${window.currentUser.token.access_token}`;
  }

  const statusText = document.getElementById('status-text');
  const progress = document.getElementById('progress');
  const progressBar = document.querySelector('.progress-bar');

  console.log(`Sending ${action} to ${url}`);
  statusText.textContent = `Starting ${action}...`;
  progress.classList.remove('hidden');
  progressBar.style.width = '0%';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', url);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total * 100).toFixed(0);
      statusText.textContent = `Uploading: ${percent}%`;
      progressBar.style.width = `${percent}%`;
    }
  };

  let processingPercent = 0;
  const processingInterval = setInterval(() => {
    if (processingPercent < 90) {
      processingPercent += 10;
      statusText.textContent = `Processing ${action}: ${processingPercent}%`;
      progressBar.style.width = `${processingPercent}%`;
    }
  }, 500);

  return new Promise((resolve, reject) => {
    xhr.onload = async () => {
      clearInterval(processingInterval);
      try {
        console.log('Response:', xhr.status, xhr.response);
        if (xhr.status >= 200 && xhr.status < 300) {
          if (action === 'Export') {
            // Handle file download
            const blob = xhr.response;
            const contentDisposition = xhr.getResponseHeader('Content-Disposition');
            const filename = contentDisposition
              ? contentDisposition.match(/filename="(.+)"/)?.[1] || `generated-${formData.get('system')}.xml`
              : `generated-${formData.get('system')}.xml`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            progressBar.style.width = '100%';
            statusText.textContent = `Downloaded ${filename}`;
            resolve({ success: true, message: `Downloaded ${filename}` });
          } else {
            const data = xhr.response ? xhr.response : { error: 'Empty response' };
            progressBar.style.width = '100%';
            statusText.textContent = data.message || data.error;
            resolve(data);
          }
        } else {
          const errorMsg = xhr.status === 500 ? 
            `${action} timed out, but may have completed. Check MongoDB.` : 
            `HTTP ${xhr.status}: ${xhr.status}`;
          progressBar.style.width = '100%';
          statusText.textContent = errorMsg;
          resolve({ error: errorMsg });
        }
      } catch (err) {
        console.error('Request failed:', err, { status: xhr.status, response: xhr.response });
        statusText.textContent = `Error: ${err.message}`;
        progress.classList.add('hidden');
        reject(err);
      }
    };

    xhr.onerror = () => {
      clearInterval(processingInterval);
      console.error('Network error:', xhr.status);
      statusText.textContent = `${action} failed: Network error`;
      progress.classList.add('hidden');
      reject(new Error('Network error'));
    };

    // Set responseType based on action
    xhr.responseType = action === 'Export' ? 'blob' : 'json';
    xhr.send(formData);
  });
}

async function cleanImages() {
  const system = document.getElementById('system').value;
  if (!system) {
    document.getElementById('action-status').textContent = 'Please select system';
    return;
  }
  
  if (!window.currentUser) {
    document.getElementById('action-status').textContent = 'Please log in to clean images';
    return;
  }

  try {
    document.getElementById('action-status').textContent = 'Cleaning images...';
    
    const response = await fetch('/api/clean-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ system })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Full clean images response:', result); // Added for more detailed logging
    
    if (result.success) {
      document.getElementById('action-status').textContent = result.message || 'Cleaning completed successfully';
      console.log('Clean images success:', result.message);
    } else {
      document.getElementById('action-status').textContent = 'Error cleaning images: ' + (result.error || 'Unknown error');
      console.log('Clean images failure:', result);
    }

    // Delay stats refresh to let message show
    setTimeout(async () => {
      const stats = await getStats(system);
      displayStats(stats);
    }, 3000); // Increased to 3 seconds for better visibility
    
  } catch (error) {
    console.error('Error in cleanImages:', error);
    document.getElementById('action-status').textContent = 'Error: ' + error.message;
  }
}

async function getTotalGames(system, file, fileKey) {
  const formData = new FormData();
  formData.append('system', system);
  formData.append(fileKey, file);
  const response = await postAPI('/api/get-total-games', formData, 'Get Total Games');
  if (response.error) throw new Error(response.error);
  console.log(`Total games for ${system} (${fileKey}): ${response.totalGames}`);
  return response.totalGames;
}

async function getStats(system, file) {

  if (!window.currentUser) {
    document.getElementById('action-status').textContent = 'Please log in to check system statistics';
    return;
  }

  const formData = new FormData();
  formData.append('system', system);
  if (file) formData.append('gamelistFile', file);
  const response = await postAPI('/api/get-stats', formData, 'Get Stats');
  if (response.error) {
    console.error('Stats error:', response.error);
    return null;
  }
  return response.stats;
}

function displayStats(stats) {
  const statsBody = document.getElementById('stats-body');
  const statsDiv = document.getElementById('stats');
  if (!stats) {
    statsDiv.classList.add('hidden');
    return;
  }
  const total = stats.totalGames;
  const rows = [
    { metric: 'Total Games', value: total },
    { metric: 'With Image', value: `${stats.withImage} (${((stats.withImage / total) * 100).toFixed(1)}%)` },
    { metric: 'With Developer', value: `${stats.withDeveloper} (${((stats.withDeveloper / total) * 100).toFixed(1)}%)` },
    { metric: 'With Publisher', value: `${stats.withPublisher} (${((stats.withPublisher / total) * 100).toFixed(1)}%)` },
    { metric: 'With Genre', value: `${stats.withGenre} (${((stats.withGenre / total) * 100).toFixed(1)}%)` },
    { metric: 'With Release Date', value: `${stats.withReleaseDate} (${((stats.withReleaseDate / total) * 100).toFixed(1)}%)` },
    { metric: 'With Rating', value: `${stats.withRating} (${((stats.withRating / total) * 100).toFixed(1)}%)` },
    { metric: 'With Players', value: `${stats.withPlayers} (${((stats.withPlayers / total) * 100).toFixed(1)}%)` },
    { metric: 'With Ratio', value: `${stats.withRatio} (${((stats.withRatio / total) * 100).toFixed(1)}%)` },
    { metric: 'With Region', value: `${stats.withRegion} (${((stats.withRegion / total) * 100).toFixed(1)}%)` },
    { metric: 'With Playcount', value: `${stats.withPlaycount} (${((stats.withPlaycount / total) * 100).toFixed(1)}%)` },
    { metric: 'With Last Played', value: `${stats.withLastplayed} (${((stats.withLastplayed / total) * 100).toFixed(1)}%)` },
    { metric: 'With Time Played', value: `${stats.withTimeplayed} (${((stats.withTimeplayed / total) * 100).toFixed(1)}%)` },
    { metric: 'With ROM Type', value: `${stats.withRomtype} (${((stats.withRomtype / total) * 100).toFixed(1)}%)` },
    { metric: 'With Description', value: `${stats.withDesc} (${((stats.withDesc / total) * 100).toFixed(1)}%)` }
  ];
  statsBody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.metric}</td>
      <td>${row.value}</td>
    </tr>
  `).join('');
  statsDiv.classList.remove('hidden');
}

async function importInitial() {

  if (!window.currentUser) {
    document.getElementById('action-status').textContent = 'Please log in to import a system file';
    return;
  }

  const system = document.getElementById('system').value;
  const ignore = document.getElementById('ignore').value;
  const initialFile = document.getElementById('initialFile').files[0];
  if (!system || !initialFile) {
    document.getElementById('status-text').textContent = 'Please select system and file';
    return;
  }

  const CHUNK_SIZE = 2000;
  const totalGames = await getTotalGames(system, initialFile, 'initialFile');
  let start = 0;
  let processed = 0;

  while (start < totalGames) {
    const end = Math.min(start + CHUNK_SIZE, totalGames);
    const formData = new FormData();
    formData.append('system', system);
    formData.append('ignore', ignore);
    formData.append('initialFile', initialFile);
    formData.append('start', start);
    formData.append('end', end);

    document.getElementById('status-text').textContent = `Importing games ${start}-${end} for ${system}...`;
    const response = await postAPI('/api/import-initial', formData, `Import ${start}-${end}`);
    if (response.error) {
      console.warn(`Chunk ${start}-${end} had error: ${response.error}`);
    }
    processed += (end - start);
    document.querySelector('.progress-bar').style.width = `${(processed / totalGames * 100).toFixed(0)}%`;
    start += CHUNK_SIZE;
  }

  document.getElementById('status-text').textContent = `Initial import complete for ${system}`;
  document.getElementById('progress').classList.add('hidden');
}

async function mergeComplete() {

  if (!window.currentUser) {
    document.getElementById('action-status').textContent = 'Please log in to merge files';
    return;
  }

  const system = document.getElementById('system').value;
  const ignore = document.getElementById('ignore').value;
  const completeFile = document.getElementById('completeFile').files[0];
  if (!system || !completeFile) {
    document.getElementById('status-text').textContent = 'Please select system and file';
    return;
  }

  const CHUNK_SIZE = 10000;
  const totalGames = await getTotalGames(system, completeFile, 'completeFile');
  let start = 0;
  let processed = 0;

  while (start < totalGames) {
    const end = Math.min(start + CHUNK_SIZE, totalGames);
    const formData = new FormData();
    formData.append('system', system);
    formData.append('ignore', ignore);
    formData.append('completeFile', completeFile);
    formData.append('start', start);
    formData.append('end', end);

    document.getElementById('status-text').textContent = `Merging games ${start}-${end} for ${system}...`;
    const response = await postAPI('/api/merge-complete', formData, `Merge ${start}-${end}`);
    if (response.error) {
      console.warn(`Chunk ${start}-${end} had error: ${response.error}`);
    }
    processed += (end - start);
    document.querySelector('.progress-bar').style.width = `${(processed / totalGames * 100).toFixed(0)}%`;
    start += CHUNK_SIZE;
  }

  document.getElementById('status-text').textContent = `Merge complete for ${system}`;
  document.getElementById('progress').classList.add('hidden');
}

async function exportMerged() {

  if (!window.currentUser) {
    document.getElementById('action-status').textContent = 'Please log in to export files';
    return;
  }

  const system = document.getElementById('system').value;
  console.log('System element:', document.getElementById('system')); // Debug
  console.log('Exporting system:', system);
  if (!system) {
    document.getElementById('status-text').textContent = 'Please select system';
    return;
  }
  const formData = new FormData();
  formData.append('system', system);
  for (let [key, value] of formData.entries()) {
    console.log(`FormData: ${key}=${value}`);
  }
  await postAPI('/api/export', formData, 'Export');
}

// Update stats when system changes or file is selected
document.getElementById('system').addEventListener('change', async () => {
  const system = document.getElementById('system').value;
  if (system) {
    const stats = await getStats(system);
    displayStats(stats);
  } else {
    displayStats(null);
  }
});

document.getElementById('initialFile').addEventListener('change', async () => {
  const system = document.getElementById('system').value;
  const file = document.getElementById('initialFile').files[0];
  if (system && file) {
    const stats = await getStats(system, file);
    displayStats(stats);
  }
});

document.getElementById('completeFile').addEventListener('change', async () => {
  const system = document.getElementById('system').value;
  const file = document.getElementById('completeFile').files[0];
  if (system && file) {
    const stats = await getStats(system, file);
    displayStats(stats);
  }
});