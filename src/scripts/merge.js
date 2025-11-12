const connectDB = require('../utils/db');
const Game = require('../models/Game');
const { parseXML } = require('../utils/xmlParser');
const parseESDate = require('./import').parseESDate;
const stringSimilarity = require('string-similarity');

const normalizeName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses like (USA, Europe), (Rev A), (J) [!]
    .replace(/[!+]/g, '') // Remove [!], [+]
    .replace(/\s*(REV\s*\d+|JUE|U|W|\[h\d+\])/gi, '') // Remove common clone suffixes
    .trim()
    .toLowerCase();
};

const mergeGames = async (system, completeFilePath, ignoreFields = [], cloneMode = false, start = 0, end) => {
  await connectDB();
  // Add index for faster fetches (run once)
  Game.createIndexes({ system: 1, name: 1 });

  console.time('parseXML');
  const completeGames = parseXML(completeFilePath);
  console.timeEnd('parseXML');

  if (!Array.isArray(completeGames)) {
    throw new Error('No games found in complete XML or invalid structure');
  }

  const slicedGames = completeGames.slice(start, end);
  console.log(`Merging ${slicedGames.length} games for ${system} (start: ${start}, end: ${end || completeGames.length})`);

  console.time('fetch-existing');
  const existingGames = await Game.find({ system });
  console.timeEnd('fetch-existing');

  let updatedCount = 0;
  let skippedCount = 0;
  let noMatchCount = 0;

  const BATCH_SIZE = 50; // Smaller to avoid timeouts (test 100 if too slow)
  for (let i = 0; i < slicedGames.length; i += BATCH_SIZE) {
    const batch = slicedGames.slice(i, i + BATCH_SIZE);
    for (const completeGame of batch) {
      const completeName = typeof completeGame.name === 'string' && completeGame.name ? completeGame.name.trim() : null;
      if (!completeName) {
        console.log(`Skipping invalid game in complete XML: invalid name`, completeGame);
        skippedCount++;
        continue;
      }

      if (completeGame.image && typeof completeGame.image === 'string' && completeGame.image.startsWith('./')) {
        completeGame.image = completeGame.image.slice(2);
      }

      const isBios = completeGame.romtype === 'bios' || (
        Object.keys(completeGame).filter(k => k !== '@source' && k !== '@timestamp').length <= 3 &&
        completeGame.name && completeGame.path && completeGame.ratio
      );
      if (isBios) {
        console.log(`Skipping BIOS: ${completeName}`);
        skippedCount++;
        continue;
      }

      const ratingValue = completeGame.rating ? parseFloat(completeGame.rating) : undefined;
      const releasedateValue = completeGame.releasedate ? parseESDate(completeGame.releasedate) : undefined;
      const lastplayedValue = completeGame.lastplayed ? parseESDate(completeGame.lastplayed) : undefined;
      const updateDoc = {
        ...( !ignoreFields.includes('image') && completeGame.image && { image: completeGame.image } ),
        ...( !ignoreFields.includes('rating') && !isNaN(ratingValue) && { rating: ratingValue } ),
        ...( !ignoreFields.includes('releasedate') && releasedateValue && { releasedate: releasedateValue } ),
        ...( !ignoreFields.includes('developer') && completeGame.developer && { developer: completeGame.developer } ),
        ...( !ignoreFields.includes('publisher') && completeGame.publisher && { publisher: completeGame.publisher } ),
        ...( !ignoreFields.includes('genre') && completeGame.genre && { genre: completeGame.genre } ),
        ...( !ignoreFields.includes('players') && completeGame.players && { players: completeGame.players } ),
        ...( !ignoreFields.includes('ratio') && completeGame.ratio && { ratio: completeGame.ratio } ),
        ...( !ignoreFields.includes('region') && completeGame.region && { region: completeGame.region } ),
        ...( !ignoreFields.includes('playcount') && completeGame.playcount && { playcount: parseInt(completeGame.playcount, 10) } ),
        ...( !ignoreFields.includes('lastplayed') && lastplayedValue && { lastplayed: lastplayedValue } ),
        ...( !ignoreFields.includes('timeplayed') && completeGame.timeplayed && { timeplayed: parseInt(completeGame.timeplayed, 10) } ),
        ...( !ignoreFields.includes('romtype') && completeGame.romtype && { romtype: completeGame.romtype } ),
        ...( !ignoreFields.includes('desc') && completeGame.desc && { desc: completeGame.desc } ),
        ...( completeGame['@source'] && { source: completeGame['@source'] } ),
        ...( completeGame['@timestamp'] && { timestamp: parseInt(completeGame['@timestamp'], 10) } ),
      };

      let matchedVariants = [];
      let maxSimilarity = 0;

      for (const game of existingGames) {
        const normalizedExistingName = normalizeName(game.name);
        const similarity = stringSimilarity.compareTwoStrings(normalizeName(completeName), normalizedExistingName);
        if (similarity >= 0.85) {
          matchedVariants.push(game);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }

      if (matchedVariants.length > 0) {
        console.log(`Matched ${matchedVariants.length} variants for ${completeName} (max similarity: ${maxSimilarity})`);
        for (const existing of matchedVariants) {
          const updates = {};
          for (const [key, value] of Object.entries(updateDoc)) {
            if (existing[key] === undefined || existing[key] === null) {
              updates[key] = value;
            }
          }
          if (Object.keys(updates).length > 0) {
            await Game.updateOne(
              { _id: existing._id },
              { $set: updates, $push: { sources: { file: completeFilePath, importedFields: Object.keys(updates) } } }
            );
            console.log(`Merged variant ${existing.name}: Added fields ${Object.keys(updates).join(', ')}`);
            updatedCount++;
          } else {
            console.log(`Skipped variant ${existing.name}: No new fields to add`);
            skippedCount++;
          }
        }
      } else {
        console.log(`No match for ${completeName} in DB`);
        noMatchCount++;
      }
    }
    const progress = Math.min(((i + BATCH_SIZE) / slicedGames.length * 100).toFixed(0), 100);
    console.log(`Processed ${i + BATCH_SIZE}/${slicedGames.length} games (${progress}%)`);
  }

  console.log(`Merged ${updatedCount} games, skipped ${skippedCount}, no match for ${noMatchCount} for ${system}`);
};

module.exports = mergeGames;