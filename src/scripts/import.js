const connectDB = require('../utils/db');
const Game = require('../models/Game');
const { parseXML } = require('../utils/xmlParser');

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

const importGames = async (system, filePath, ignoreFields = [], start = 0, end, userId) => {
  await connectDB();
  console.time('parseXML');
  const games = parseXML(filePath);
  console.timeEnd('parseXML');

  if (!Array.isArray(games)) {
    throw new Error('No games found in XML or invalid XML structure');
  }

  const slicedGames = games.slice(start, end);
  console.log(`Importing ${slicedGames.length} games for ${system} (start: ${start}, end: ${end || games.length})`);
  const BATCH_SIZE = 500;

  console.time('bulkWrite');
  for (let i = 0; i < slicedGames.length; i += BATCH_SIZE) {
    const batch = slicedGames.slice(i, i + BATCH_SIZE).map(gameData => {
      const ratingValue = gameData.rating ? parseFloat(gameData.rating) : undefined;
      const releasedateValue = gameData.releasedate ? parseESDate(gameData.releasedate) : undefined;
      const lastplayedValue = gameData.lastplayed ? parseESDate(gameData.lastplayed) : undefined;
      const gameDoc = {
        userId,
        system,
        path: gameData.path,
        name: gameData.name,
        ...( !ignoreFields.includes('image') && gameData.image && { image: gameData.image } ),
        ...( !ignoreFields.includes('rating') && !isNaN(ratingValue) && { rating: ratingValue } ),
        ...( !ignoreFields.includes('releasedate') && releasedateValue && { releasedate: releasedateValue } ),
        ...( !ignoreFields.includes('developer') && gameData.developer && { developer: gameData.developer } ),
        ...( !ignoreFields.includes('publisher') && gameData.developer && { publisher: gameData.developer } ), // Fix: should be gameData.publisher
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

      return {
        updateOne: {
          filter: { system, path: gameDoc.path },
          update: { 
            $set: gameDoc, 
            $push: { sources: { file: filePath, importedFields: Object.keys(gameDoc).filter(k => k !== 'system' && k !== 'path') } }
          },
          upsert: true
        }
      };
    });

    await Game.bulkWrite(batch);
    const progress = Math.min(((i + BATCH_SIZE) / slicedGames.length * 100).toFixed(0), 100);
    console.log(`Imported ${i + batch.length}/${slicedGames.length} games (${progress}%)`);
  }

  console.timeEnd('bulkWrite');
  console.log(`Imported ${slicedGames.length} games from ${filePath} for ${system}`);
};

module.exports = { importGames, parseESDate };