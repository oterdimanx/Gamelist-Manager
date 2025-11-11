const connectDB = require('../utils/db');
const Game = require('../models/Game');
const { parseXML } = require('../utils/xmlParser');

// Helper to parse EmulationStation date (YYYYMMDDTHHMMSS as UTC)
const parseESDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 15) return undefined;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  const hour = dateStr.slice(9, 11);
  const minute = dateStr.slice(11, 13);
  const second = dateStr.slice(13, 15);
  const parsedDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)));
  return isNaN(parsedDate) ? undefined : parsedDate;
};

const importGames = async (system, filePath, ignoreFields = []) => {
  await connectDB();
  console.time('parseXML');
  const games = parseXML(filePath);
  console.timeEnd('parseXML');

  if (!Array.isArray(games)) {
    throw new Error('No games found in XML or invalid XML structure');
  }

  console.log(`Importing ${games.length} games for ${system}`);
  const bulkOps = [];

  for (const gameData of games) {
    const ratingValue = gameData.rating ? parseFloat(gameData.rating) : undefined;
    const releasedateValue = gameData.releasedate ? parseESDate(gameData.releasedate) : undefined;
    const lastplayedValue = gameData.lastplayed ? parseESDate(gameData.lastplayed) : undefined;
    const gameDoc = {
      system,
      path: gameData.path,
      name: gameData.name,
      ...( !ignoreFields.includes('image') && gameData.image && { image: gameData.image } ),
      ...( !ignoreFields.includes('rating') && !isNaN(ratingValue) && { rating: ratingValue } ),
      ...( !ignoreFields.includes('releasedate') && releasedateValue && { releasedate: releasedateValue } ),
      ...( !ignoreFields.includes('developer') && gameData.developer && { developer: gameData.developer } ),
      ...( !ignoreFields.includes('publisher') && gameData.developer && { publisher: gameData.developer } ),
      ...( !ignoreFields.includes('genre') && gameData.genre && { genre: gameData.genre } ),
      ...( !ignoreFields.includes('players') && gameData.players && { players: gameData.players } ),
      ...( !ignoreFields.includes('ratio') && gameData.ratio && { ratio: gameData.ratio } ),
      ...( !ignoreFields.includes('region') && gameData.region && { region: gameData.region } ),
      ...( !ignoreFields.includes('playcount') && gameData.playcount && { playcount: parseInt(gameData.playcount, 10) } ),
      ...( !ignoreFields.includes('lastplayed') && lastplayedValue && { lastplayed: lastplayedValue } ),
      ...( !ignoreFields.includes('timeplayed') && gameData.timeplayed && { timeplayed: parseInt(gameData.timeplayed, 10) } ),
      ...( !ignoreFields.includes('romtype') && gameData.romtype && { romtype: gameData.romtype } ),
      ...( !ignoreFields.includes('desc') && gameData.desc && { desc: gameData.desc } ),
      ...( gameData['@source'] && { source: gameData['@source'] } ),
      ...( gameData['@timestamp'] && { timestamp: parseInt(gameData['@timestamp'], 10) } ),
    };

    bulkOps.push({
      updateOne: {
        filter: { system, path: gameDoc.path },
        update: { 
          $set: gameDoc, 
          $push: { sources: { file: filePath, importedFields: Object.keys(gameDoc).filter(k => k !== 'system' && k !== 'path') } }
        },
        upsert: true
      }
    });
  }

  console.time('bulkWrite');
  if (bulkOps.length > 0) {
    await Game.bulkWrite(bulkOps);
  }
  console.timeEnd('bulkWrite');
  console.log(`Imported ${bulkOps.length} games from ${filePath} for ${system}`);
};

module.exports = { importGames, parseESDate };