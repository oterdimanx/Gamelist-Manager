const jwt = require('jsonwebtoken');
const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const { importGames } = require('../src/scripts/import');
const mergeGames = require('../src/scripts/merge');
const exportGames = require('../src/scripts/export');
const { parseXML } = require('../src/utils/xmlParser');
const connectDB = require('../src/utils/db');
const Game = require('../src/models/Game');
const path = require('path');

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

// Middleware: Verify JWT and set req.userId
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.replace('Bearer ', '');
  try {
    // Use Netlify's site URL or env var for audience; secret from Netlify env (set NETLIFY_IDENTITY_JWT_SECRET)
    const decoded = jwt.verify(token, process.env.NETLIFY_IDENTITY_JWT_SECRET);
    req.userId = decoded.sub; // Unique user ID
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/get-total-games', upload.fields([{ name: 'initialFile' }, { name: 'completeFile' }]), async (req, res) => {
  try {
    console.log('Processing /api/get-total-games', req.body, req.files);
    const system = req.body.system;
    if (!system) throw new Error('System is required');
    const file = req.files.initialFile?.[0] || req.files.completeFile?.[0];
    if (!file) throw new Error('No file uploaded');
    console.log(`Parsing file: ${file.path}`);
    const games = parseXML(file.path);
    if (!Array.isArray(games)) throw new Error('Invalid XML structure');
    fs.unlinkSync(file.path);
    res.json({ success: true, totalGames: games.length });
  } catch (err) {
    console.error('Get total games error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/get-stats', authMiddleware, upload.single('gamelistFile'), async (req, res) => {
  try {
    console.log('Processing /api/get-stats', req.body, req.files);
    const system = req.body.system;
    const userId = req.userId;
    if (!system) throw new Error('System is required');
    await connectDB();

    let stats = {
      totalGames: 0,
      withImage: 0,
      withDeveloper: 0,
      withPublisher: 0,
      withGenre: 0,
      withReleaseDate: 0,
      withRating: 0,
      withPlayers: 0,
      withRatio: 0,
      withRegion: 0,
      withPlaycount: 0,
      withLastplayed: 0,
      withTimeplayed: 0,
      withRomtype: 0,
      withDesc: 0
    };

    if (req.file) {
      // Analyze uploaded gamelist file
      const games = parseXML(req.file.path);
      if (!Array.isArray(games)) throw new Error('Invalid XML structure');
      stats.totalGames = games.length;
      stats.withImage = games.filter(g => g.image && g.image !== 'Unknown').length;
      stats.withDeveloper = games.filter(g => g.developer && g.developer !== 'Unknown').length;
      stats.withPublisher = games.filter(g => g.publisher && g.publisher !== 'Unknown').length;
      stats.withGenre = games.filter(g => g.genre && g.genre !== 'Unknown').length;
      stats.withReleaseDate = games.filter(g => g.releasedate && g.releasedate !== 'Unknown' && g.releasedate !== '19700101T000000').length;
      stats.withRating = games.filter(g => g.rating && g.rating !== 'Unknown').length;
      stats.withPlayers = games.filter(g => g.players && g.players !== 'Unknown').length;
      stats.withRatio = games.filter(g => g.ratio && g.ratio !== 'Unknown').length;
      stats.withRegion = games.filter(g => g.region && g.region !== 'Unknown').length;
      stats.withPlaycount = games.filter(g => g.playcount && g.playcount !== 'Unknown').length;
      stats.withLastplayed = games.filter(g => g.lastplayed && g.lastplayed !== 'Unknown').length;
      stats.withTimeplayed = games.filter(g => g.timeplayed && g.timeplayed !== 'Unknown').length;
      stats.withRomtype = games.filter(g => g.romtype && g.romtype !== 'Unknown').length;
      stats.withDesc = games.filter(g => g.desc && g.desc !== 'Unknown').length;
      fs.unlinkSync(req.file.path);
    } else {
      // Query MongoDB
      const games = await Game.find({ system, userId });
      stats.totalGames = games.length;
      stats.withImage = games.filter(g => g.image && g.image !== 'Unknown').length;
      stats.withDeveloper = games.filter(g => g.developer && g.developer !== 'Unknown').length;
      stats.withPublisher = games.filter(g => g.publisher && g.publisher !== 'Unknown').length;
      stats.withGenre = games.filter(g => g.genre && g.genre !== 'Unknown').length;
      stats.withReleaseDate = games.filter(g => g.releasedate && g.releasedate !== 'Unknown' && g.releasedate !== '19700101T000000').length;
      stats.withRating = games.filter(g => g.rating && g.rating !== 'Unknown').length;
      stats.withPlayers = games.filter(g => g.players && g.players !== 'Unknown').length;
      stats.withRatio = games.filter(g => g.ratio && g.ratio !== 'Unknown').length;
      stats.withRegion = games.filter(g => g.region && g.region !== 'Unknown').length;
      stats.withPlaycount = games.filter(g => g.playcount && g.playcount !== 'Unknown').length;
      stats.withLastplayed = games.filter(g => g.lastplayed && g.lastplayed !== 'Unknown').length;
      stats.withTimeplayed = games.filter(g => g.timeplayed && g.timeplayed !== 'Unknown').length;
      stats.withRomtype = games.filter(g => g.romtype && g.romtype !== 'Unknown').length;
      stats.withDesc = games.filter(g => g.desc && g.desc !== 'Unknown').length;
    }

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Stats error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clean-images', authMiddleware, async (req, res) => {
  try {
    console.log('Processing /api/clean-images', req.body);
    const system = req.body.system;
    const userId = req.userId;
    if (!system) throw new Error('System is required');
    await connectDB();

    const games = await Game.find({ system, userId, image: { $exists: true, $ne: null, $ne: 'Unknown', $ne: '' } });
    const usedImages = new Set();
    for (const game of games) {
      if (game.image) {
        const imageName = path.basename(game.image);
        usedImages.add(imageName);
      }
    }

    const imagesPath = path.join(__dirname, '..', 'roms', 'downloaded_images');
    const usedImagesPath = path.join(__dirname, '..', 'roms', 'used_images');
    if (!fs.existsSync(imagesPath)) {
      throw new Error(`Images path ${imagesPath} does not exist`);
    }

    fs.mkdirSync(usedImagesPath, { recursive: true });
    const imageFiles = fs.readdirSync(imagesPath).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
    let copiedCount = 0;
    for (const image of imageFiles) {
      if (usedImages.has(image)) {
        fs.copyFileSync(
          path.join(imagesPath, image),
          path.join(usedImagesPath, image)
        );
        copiedCount++;
      }
    }

    res.json({
      success: true,
      message: `Copied ${copiedCount} images to ${usedImagesPath}`
    });
  } catch (err) {
    console.error('Clean images error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import-initial', upload.single('initialFile'), async (req, res) => {
  try {
    console.log('Processing /api/import-initial', req.body, req.file);
    const system = req.body.system;
    if (!system) throw new Error('System is required');
    let ignoreFields = req.body.ignore ? req.body.ignore.split(',').map(f => f.trim()) : [];
    if (['gamegear', 'snes', 'megadrive', 'sms', 'pce', 'n64', '2600', 'psx', 'saturn', '32x', 'gb', 'pcecd', 'segacd', 'nes'].includes(system)) {
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
    if (['gamegear', 'snes', 'megadrive', 'sms', 'pce', 'n64', '2600'].includes(system)) {
      ignoreFields.push('ratio', 'region');
    }
    if (system === 'mame') {
      ignoreFields.push('lastplayed', 'playcount', 'timeplayed');
    }
    if (!req.file) throw new Error('No file uploaded');
    const start = parseInt(req.body.start) || 0;
    const end = parseInt(req.body.end) || undefined;
    await mergeGames(system, req.file.path, ignoreFields, false, start, end);
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

app.post('/api/export', upload.none(), async (req, res) => {
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