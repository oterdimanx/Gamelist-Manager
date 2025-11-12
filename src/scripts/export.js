const connectDB = require('../utils/db');
const Game = require('../models/Game');
const { XMLBuilder } = require('fast-xml-parser');
const fs = require('fs');

// Helper to format Date to EmulationStation YYYYMMDDTHHMMSS
const formatESDate = (date) => {
  if (!date || isNaN(date)) return undefined;
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hour = date.getUTCHours().toString().padStart(2, '0');
  const minute = date.getUTCMinutes().toString().padStart(2, '0');
  const second = date.getUTCSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}T${hour}${minute}${second}`;
};

const exportGames = async (system, outputPath) => {
  await connectDB();
  const games = await Game.find({ system }).lean();
//console.log({ system })
  if (games.length === 0) {
    throw new Error(`No games found for system "${system}"`);
  }

  const xmlData = {
    gameList: {
      game: games.map(g => ({
        '@source': g.source,
        '@timestamp': g.timestamp,
        path: g.path || './',
        name: g.name,
        ...(g.image && { image: g.image }),
        ...(g.rating !== undefined && { rating: g.rating }),
        ...(g.releasedate && { releasedate: formatESDate(g.releasedate) }),
        ...(g.developer && { developer: g.developer }),
        ...(g.publisher && { publisher: g.publisher }),
        ...(g.genre && { genre: g.genre }),
        ...(g.players && { players: g.players }),
        ...(g.ratio && { ratio: g.ratio }),
        ...(g.region && { region: g.region }),
        ...(g.playcount !== undefined && { playcount: g.playcount }),
        ...(g.lastplayed && { lastplayed: formatESDate(g.lastplayed) }),
        ...(g.timeplayed !== undefined && { timeplayed: g.timeplayed }),
        ...(g.romtype && { romtype: g.romtype }),
        ...(g.desc && { desc: g.desc }),
      }))
    }
  };

  const builder = new XMLBuilder({
    format: true,
    attributeNamePrefix: '@',
    ignoreAttributes: false,
    suppressEmptyNode: true
  });
  const xmlString = builder.build(xmlData);
  fs.writeFileSync(outputPath, '<?xml version="1.0"?>\n' + xmlString);
  console.log(`Exported ${games.length} games to ${outputPath}`);
};

module.exports = exportGames;