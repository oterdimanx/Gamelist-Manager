async function postAPI(url, formData, action) {
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
          const data = xhr.response ? xhr.response : { error: 'Empty response' };
          progressBar.style.width = '100%';
          statusText.textContent = data.message || data.error;
          resolve(data);
        } else {
          const errorMsg = xhr.status === 500 ? 
            `${action} timed out, but may have completed. Check MongoDB.` : 
            `HTTP ${xhr.status}: ${xhr.status}`;
          progressBar.style.width = '100%';
          statusText.textContent = errorMsg;
          resolve({ error: errorMsg }); // Resolve to continue chunking
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

    xhr.responseType = 'json';
    xhr.send(formData);
  });
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

async function importInitial() {
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
    progressBar.style.width = `${(processed / totalGames * 100).toFixed(0)}%`;
    start += CHUNK_SIZE;
  }

  document.getElementById('status-text').textContent = `Initial import complete for ${system}`;
  document.getElementById('progress').classList.add('hidden');
}

async function mergeComplete() {
  const system = document.getElementById('system').value;
  const ignore = document.getElementById('ignore').value;
  const completeFile = document.getElementById('completeFile').files[0];
  if (!system || !completeFile) {
    document.getElementById('status-text').textContent = 'Please select system and file';
    return;
  }

  const CHUNK_SIZE = 250; // Smaller to avoid timeouts
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
    progressBar.style.width = `${(processed / totalGames * 100).toFixed(0)}%`;
    start += CHUNK_SIZE;
  }

  document.getElementById('status-text').textContent = `Merge complete for ${system}`;
  document.getElementById('progress').classList.add('hidden');
}

async function exportMerged() {
  const system = document.getElementById('system').value;
  if (!system) {
    document.getElementById('status-text').textContent = 'Please select system';
    return;
  }
  const formData = new FormData();
  formData.append('system', system);
  await postAPI('/api/export', formData, 'Export');
}