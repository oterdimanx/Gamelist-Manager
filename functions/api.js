const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mergeGames = require('../src/scripts/merge');
const exportGames = require('../src/scripts/export');
const { importGames } = require('../src/scripts/import');

const app = express();
app.use(bodyParser.json()); // Parse JSON for /api/export
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ dest: '/tmp/uploads/' }); // Temp storage

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`, req.body);
  next();
});

app.post('/api/import-initial', upload.single('initialFile'), async (req, res) => {
  try {
    console.log('Processing /api/import-initial', req.body, req.file);
    const system = req.body.system;
    const ignoreFields = req.body.ignore ? req.body.ignore.split(',') : [];
    const filePath = req.file.path;
    await importGames(system, filePath, ignoreFields);
    fs.unlinkSync(filePath); // Clean up
    res.json({ success: true, message: `Initial import complete for ${system}` });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/merge-complete', upload.single('completeFile'), async (req, res) => {
  try {
    console.log('Processing /api/merge-complete', req.body, req.file);
    const system = req.body.system;
    const ignoreFields = req.body.ignore ? req.body.ignore.split(',') : [];
    const filePath = req.file.path;
    await mergeGames(system, filePath, ignoreFields);
    fs.unlinkSync(filePath); // Clean up
    res.json({ success: true, message: `Merge complete for ${system}` });
  } catch (err) {
    console.error('Merge error:', err);
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
      fs.unlinkSync(outputPath); // Clean up
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// For Netlify Functions
module.exports.handler = serverless(app);