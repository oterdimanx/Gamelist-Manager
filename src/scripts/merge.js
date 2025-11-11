const connectDB = require('../utils/db');
const Game = require('../models/Game');
const { parseXML } = require('../utils/xmlParser');
const parseESDate = require('./import').parseESDate;

const mergeGames = async (system, completeFilePath, ignoreFields = []) => {
  await connectDB();
  const completeGames = parseXML(completeFilePath);

  if (!Array.isArray(completeGames)) {
    throw new Error('No games found in complete XML or invalid structure');
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let noMatchCount = 0;

  for (const completeGame of completeGames) {
    console.log(`Processing game:`, completeGame);

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

    const existing = await Game.findOne({
      system,
      name: { $regex: `^${completeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
    if (existing) {
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
        console.log(`Merged ${completeName}: Added fields ${Object.keys(updates).join(', ')}`);
        updatedCount++;
      } else {
        console.log(`Skipped ${completeName}: No new fields to add`);
        skippedCount++;
      }
    } else {
      console.log(`No match for ${completeName} in DB`);
      noMatchCount++;
    }
  }
  console.log(`Merged ${updatedCount} games, skipped ${skippedCount}, no match for ${noMatchCount} for ${system}`);
};

module.exports = mergeGames;