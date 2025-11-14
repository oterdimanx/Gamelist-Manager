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

app.post('/api/get-stats', upload.single('gamelistFile'), async (req, res) => {

//console.log('Get-stats: Headers:', req.headers, 'Body:', req.body, 'File:', req.file ? req.file.originalname : 'none');
let userId = null;
const authHeader = req.headers.authorization;

if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.decode(token);
    userId = decoded.sub; // Matches user.id (6bd71761-a3c7-4f03-a6ff-338af03804e1)
    console.log('Get-stats: Decoded userId:', userId);
  } catch (err) {
    console.error('Get-stats: JWT decode error:', err.message);
  }
}

if (!userId) {
  console.log('Get-stats: 401 Unauthorized');
  return res.status(401).json({ error: 'Unauthorized - please log in' });
}

try {
    await connectDB();
    const { system } = req.body;
    const file = req.file;

    if (!system && !file) {
      console.log('Get-stats: 400 Missing system or file');
      return res.status(400).json({ error: 'System or file required' });
    }

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

    if (file) {
      console.log('Get-stats: Parsing file', file.originalname);
      const xmlContent = file.buffer.toString();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const parsed = parser.parse(xmlContent);
      const games = Array.isArray(parsed.gameList.game) ? parsed.gameList.game : [parsed.gameList.game].filter(Boolean);
      stats.totalGames = games.length;
      stats.withImage = games.filter(g => g.image && g.image !== 'Unknown' && g.image !== '').length;
      stats.withDeveloper = games.filter(g => g.developer && g.developer !== 'Unknown' && g.developer !== '').length;
      stats.withPublisher = games.filter(g => g.publisher && g.publisher !== 'Unknown' && g.publisher !== '').length;
      stats.withGenre = games.filter(g => g.genre && g.genre !== 'Unknown' && g.genre !== '').length;
      stats.withReleaseDate = games.filter(g => g.releasedate && g.releasedate !== 'Unknown' && g.releasedate !== '').length;
      stats.withRating = games.filter(g => g.rating && g.rating !== 'Unknown' && g.rating !== '').length;
      stats.withPlayers = games.filter(g => g.players && g.players !== 'Unknown' && g.players !== '').length;
      stats.withRatio = games.filter(g => g.ratio && g.ratio !== 'Unknown' && g.ratio !== '').length;
      stats.withRegion = games.filter(g => g.region && g.region !== 'Unknown' && g.region !== '').length;
      stats.withPlaycount = games.filter(g => g.playcount && g.playcount !== 'Unknown' && g.playcount !== '').length;
      stats.withLastplayed = games.filter(g => g.lastplayed && g.lastplayed !== 'Unknown' && g.lastplayed !== '').length;
      stats.withTimeplayed = games.filter(g => g.timeplayed && g.timeplayed !== 'Unknown' && g.timeplayed !== '').length;
      stats.withRomtype = games.filter(g => g.romtype && g.romtype !== 'Unknown' && g.romtype !== '').length;
      stats.withDesc = games.filter(g => g.desc && g.desc !== 'Unknown' && g.desc !== '').length;
    } else {
      console.log('Get-stats: Querying DB for system:', system, 'userId:', userId);
      const games = await Game.find({ system, userId });
      stats.totalGames = games.length;
      stats.withImage = games.filter(g => g.image && g.image !== 'Unknown' && g.image !== '').length;
      stats.withDeveloper = games.filter(g => g.developer && g.developer !== 'Unknown' && g.developer !== '').length;
      stats.withPublisher = games.filter(g => g.publisher && g.publisher !== 'Unknown' && g.publisher !== '').length;
      stats.withGenre = games.filter(g => g.genre && g.genre !== 'Unknown' && g.genre !== '').length;
      stats.withReleaseDate = games.filter(g => g.releasedate && g.releasedate !== 'Unknown' && g.releasedate !== '').length;
      stats.withRating = games.filter(g => g.rating && g.rating !== 'Unknown' && g.rating !== '').length;
      stats.withPlayers = games.filter(g => g.players && g.players !== 'Unknown' && g.players !== '').length;
      stats.withRatio = games.filter(g => g.ratio && g.ratio !== 'Unknown' && g.ratio !== '').length;
      stats.withRegion = games.filter(g => g.region && g.region !== 'Unknown' && g.region !== '').length;
      stats.withPlaycount = games.filter(g => g.playcount && g.playcount !== 'Unknown' && g.playcount !== '').length;
      stats.withLastplayed = games.filter(g => g.lastplayed && g.lastplayed !== 'Unknown' && g.lastplayed !== '').length;
      stats.withTimeplayed = games.filter(g => g.timeplayed && g.timeplayed !== 'Unknown' && g.timeplayed !== '').length;
      stats.withRomtype = games.filter(g => g.romtype && g.romtype !== 'Unknown' && g.romtype !== '').length;
      stats.withDesc = games.filter(g => g.desc && g.desc !== 'Unknown' && g.desc !== '').length;
    }

    console.log('Get-stats: Returning stats', stats);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Get-stats error:', err.message, err.stack);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.post('/api/clean-images', async (req, res) => {

  console.log('Clean-images: Headers:', req.headers, 'Body:', req.body);
  let userId = null;
  const authHeader = req.headers.authorization;
  console.log('Clean-images: Auth header:', authHeader ? 'Present' : 'Missing');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('Clean-images: Token extracted:', token.slice(0, 10) + '...');
    try {
      const decoded = jwt.decode(token);
      userId = decoded.sub;
      console.log('Clean-images: Decoded userId:', userId);
    } catch (err) {
      console.error('Clean-images: JWT decode error:', err.message);
    }
  }
  if (!userId) {
    console.log('Clean-images: 401 Unauthorized');
    return res.status(401).json({ error: 'Unauthorized - please log in' });
  }

  try {
    console.log('Processing /api/clean-images', req.body);
    const system = req.body.system;
    if (!system) throw new Error('System is required');
    await connectDB();

    const games = await Game.find({ system, image: { $exists: true, $ne: null, $ne: 'Unknown', $ne: '' } });
    const usedImages = new Set();
    for (const game of games) {
      if (game.image) {
        const imageName = path.basename(game.image);
        usedImages.add(imageName);
      }
    }

    const imagesPath = path.join(__dirname, '..', 'roms', 'images_stock');
    const usedImagesPath = path.join(__dirname, '..', 'roms', 'downloaded_images');
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

  console.log('import-initial: Headers:', req.headers, 'Body:', req.body, 'File:', req.file ? req.file.originalname : 'none');
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.decode(token);
      userId = decoded.sub; // Matches user.id (6bd71761-a3c7-4f03-a6ff-338af03804e1)
      console.log('import-initial: Decoded userId:', userId);
    } catch (err) {
      console.error('import-initial: JWT decode error:', err.message);
    }
  }
  if (!userId) {
    console.log('import-initial: 401 Unauthorized');
    return res.status(401).json({ error: 'Unauthorized - please log in' });
  }

  try {
    console.log('Processing /api/import-initial', req.body, req.file);
    const system = req.body.system;
    if (!system) throw new Error('System is required');
    let ignoreFields = req.body.ignore ? req.body.ignore.split(',').map(f => f.trim()) : [];
    if (['gamegear', 'snes', 'megadrive', 'sms', 'pce', 'n64', '2600'].includes(system)) {
      ignoreFields.push('ratio', 'region');
    }
    if (!req.file) throw new Error('No file uploaded');
    const start = parseInt(req.body.start) || 0;
    const end = parseInt(req.body.end) || undefined;
    await importGames(system, req.file.path, ignoreFields, start, end, userId);
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

  console.log('Merge-complete: Headers:', req.headers, 'Body:', req.body, 'File:', req.file ? req.file.originalname : 'none');
  let userId = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.decode(token);
      userId = decoded.sub;
      console.log('Merge-complete: Decoded userId:', userId);
    } catch (err) {
      console.error('Merge-complete: JWT decode error:', err.message);
    }

  }

  if (!userId) {
    console.log('Merge-complete: 401 Unauthorized');
    return res.status(401).json({ error: 'Unauthorized - please log in' });
  }

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
    await mergeGames(system, req.file.path, ignoreFields, false, start, end, userId);
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