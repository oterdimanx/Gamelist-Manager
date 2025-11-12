async function postAPI(url, formData, action) {
  const statusText = document.getElementById('status-text');
  const progress = document.getElementById('progress');
  const progressBar = document.querySelector('.progress-bar');

  // Reset UI
  statusText.textContent = `Starting ${action}...`;
  progress.classList.remove('hidden');
  progressBar.style.width = '0%';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', url);

  // Upload progress
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total * 100).toFixed(0);
      statusText.textContent = `Uploading: ${percent}%`;
      progressBar.style.width = `${percent}%`;
    }
  };

  // Simulate processing progress
  let processingPercent = 0;
  const processingInterval = setInterval(() => {
    if (processingPercent < 90) {
      processingPercent += 10; // Gradual increase
      statusText.textContent = `Processing ${action}: ${processingPercent}%`;
      progressBar.style.width = `${processingPercent}%`;
    }
  }, 500);

  xhr.onload = async () => {
    clearInterval(processingInterval);
    try {
      const data = await xhr.response.json();
      progressBar.style.width = '100%';
      statusText.textContent = data.message || data.error;
      setTimeout(() => {
        progress.classList.add('hidden');
      }, 1000);
    } catch (err) {
      statusText.textContent = `Error: ${err.message}`;
      progress.classList.add('hidden');
    }
  };

  xhr.onerror = () => {
    clearInterval(processingInterval);
    statusText.textContent = `${action} failed`;
    progress.classList.add('hidden');
  };

  xhr.responseType = 'json';
  xhr.send(formData);
}

async function importInitial() {
  const system = document.getElementById('system').value;
  const ignore = document.getElementById('ignore').value;
  const initialFile = document.getElementById('initialFile').files[0];
  if (!system || !initialFile) {
    document.getElementById('status-text').textContent = 'Please select system and file';
    return;
  }
  const formData = new FormData();
  formData.append('system', system);
  formData.append('ignore', ignore);
  formData.append('initialFile', initialFile);
  await postAPI('/.netlify/functions/api/import-initial', formData, 'Import');
}

async function mergeComplete() {
  const system = document.getElementById('system').value;
  const ignore = document.getElementById('ignore').value;
  const completeFile = document.getElementById('completeFile').files[0];
  if (!system || !completeFile) {
    document.getElementById('status-text').textContent = 'Please select system and file';
    return;
  }
  const formData = new FormData();
  formData.append('system', system);
  formData.append('ignore', ignore);
  formData.append('completeFile', completeFile);
  await postAPI('/.netlify/functions/api/merge-complete', formData, 'Merge');
}

async function exportMerged() {
  const system = document.getElementById('system').value;
  if (!system) {
    document.getElementById('status-text').textContent = 'Please select system';
    return;
  }
  const formData = new FormData();
  formData.append('system', system);
  await postAPI('/.netlify/functions/api/export', formData, 'Export');
}