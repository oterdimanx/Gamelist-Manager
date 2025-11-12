const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const { importGames } = require('../src/scripts/import');
const mergeGames = require('../src/scripts/merge');
const exportGames = require('../src/scripts/export');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ 
  dest: '/tmp/uploads/', 
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

app.post('/api/import-initial', upload.single('initialFile'), async (req, res) => {
  try {
    console.log('Processing /api/import-initial', req.body, req.file);
    const system = req.body.system;
    if (!system) throw new Error('System is required');
    let ignoreFields = req.body.ignore ? req.body.ignore.split(',').map(f => f.trim()) : [];
    if (system === 'gamegear' || system === 'snes') {
      ignoreFields.push('ratio', 'region');
    }
    if (!req.file) throw new Error('No file uploaded');
    const start = parseInt(req.body.start) || 0;
    const end = parseInt(req.body.end) || undefined;
    await importGames(system, req.file.path, ignoreFields, start, end);
    fs.unlinkSync(req.file.path);
    res.json({ 
      success: true, 
      message: `Imported games ${start}-${end || 'end'} for ${system}`,
      start,
      end
    });
  } catch (err) {
    console.error('Import error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/merge-complete', upload.single('completeFile'), async (req, res) => {
  try {
    console.log('Processing /api/merge-complete', req.body, req.file);
    const system = req.body.system;
    if (!system) throw new Error('System is required');
    let ignoreFields = req.body.ignore ? req.body.ignore.split(',').map(f => f.trim()) : [];
    if (system === 'gamegear' || system === 'snes') {
      ignoreFields.push('ratio', 'region');
    }
    if (!req.file) throw new Error('No file uploaded');
    const start = parseInt(req.body.start) || 0;
    const end = parseInt(req.body.end) || undefined;
    await mergeGames(system, req.file.path, ignoreFields, start, end);
    fs.unlinkSync(req.file.path);
    res.json({ 
      success: true, 
      message: `Merged games ${start}-${end || 'end'} for ${system}`,
      start,
      end
    });
  } catch (err) {
    console.error('Merge error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/export', async (req, res) => {
  try {
    console.log('Processing /api/export', req.body);
    const system = req.body.system;
    if (!system) throw new Error('System is required');
    const outputPath = `/tmp/generated-${system}.xml`;
    await exportGames(system, outputPath);
    res.download(outputPath, `generated-${system}.xml`, (err) => {
      if (err) {
        console.error('Download error:', err);
        throw err;
      }
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('Export error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports.handler = serverless(app);