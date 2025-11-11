const status = document.getElementById('status');

async function postAPI(url, formData) {
  try {
    const response = await fetch(url, { method: 'POST', body: formData });
    const data = await response.json();
    status.textContent = data.message || data.error;
    return data;
  } catch (err) {
    status.textContent = err.message;
  }
}

async function importInitial() {
  const system = document.getElementById('system').value;
  const ignore = document.getElementById('ignore').value;
  const file = document.getElementById('initialFile').files[0];
  if (!file) return status.textContent = 'Select file';

  const formData = new FormData();
  formData.append('system', system);
  formData.append('ignore', ignore);
  formData.append('initialFile', file);

  await postAPI('/api/import-initial', formData);
}

async function mergeComplete() {
  const system = document.getElementById('system').value;
  const ignore = document.getElementById('ignore').value;
  const file = document.getElementById('completeFile').files[0];
  if (!file) return status.textContent = 'Select file';

  const formData = new FormData();
  formData.append('system', system);
  formData.append('ignore', ignore);
  formData.append('completeFile', file);

  await postAPI('/api/merge-complete', formData);
}

async function exportMerged() {
  const system = document.getElementById('system').value;
  console.log('Exporting system:', system); // Debug
  if (!system) return status.textContent = 'Select a system';

  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system })
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${system}.xml`;
    a.click();
    status.textContent = 'Export successful';
  } else {
    const data = await response.json();
    status.textContent = data.error || 'Export failed';
  }
}