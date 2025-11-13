const fs = require('fs');
const path = require('path');
const { parseXML } = require('../utils/xmlParser');
const stringSimilarity = require('string-similarity');

const normalizeName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/\s*$$ .*? $$\s*/g, '') // Remove (1983), (Pet Boat), (PAL), (USA)
    .replace(/[!+]/g, '') // Remove [!], [+]
    .replace(/\s*(REV\s*\d+|JUE|U|W|$$ h\d+ $$)/gi, '') // Remove clone suffixes
    .trim()
    .toLowerCase();
};

function mapImages(gameName, imageFiles) {
  const normalizedGame = normalizeName(gameName);
  let bestMatch = null;
  let maxSimilarity = 0;
  for (const image of imageFiles) {
    const normalizedImage = normalizeName(path.basename(image, path.extname(image)));
    const similarity = stringSimilarity.compareTwoStrings(normalizedGame, normalizedImage);
    if (similarity > maxSimilarity && similarity >= 0.85) {
      maxSimilarity = similarity;
      bestMatch = image;
    }
  }
  return bestMatch ? `downloaded_images/${bestMatch}` : undefined;
}

function generateCompleteXML(system, initialXMLPath, imagesPath, outputPath) {
  const initialGames = parseXML(initialXMLPath);
  if (!Array.isArray(initialGames)) throw new Error('Invalid initial XML');
  
  const imageFiles = fs.readdirSync(imagesPath).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
  console.log(`Found ${imageFiles.length} images in ${imagesPath}`);
  const games = initialGames.map(game => {
    const gameName = game.name || path.basename(game.path, path.extname(game.path));
    const image = mapImages(gameName, imageFiles);
    if (image) {
      console.log(`Mapped ${gameName} to ${image} (similarity: ${stringSimilarity.compareTwoStrings(normalizeName(gameName), normalizeName(path.basename(image, path.extname(image))))})`);
    } else {
      console.log(`No image match for ${gameName}`);
    }
    return {
      name: gameName,
      path: game.path || `./roms/${gameName}.bin` || `./roms/${gameName}.a26`,
      image,
      developer: game.developer || 'Unknown',
      publisher: game.publisher || 'Unknown',
      genre: game.genre || 'Unknown',
      releasedate: game.releasedate || '19700101T000000'
    };
  });

  const xml = `<?xml version="1.0"?><gameList>
${games.map(game => `  <game>
<name>${game.name}</name>
<path>${game.path}</path>
${game.image ? `<image>${game.image}</image>` : ''}
<developer>${game.developer}</developer>
<publisher>${game.publisher}</publisher>
<genre>${game.genre}</genre>
<releasedate>${game.releasedate}</releasedate>
</game>`).join('\n')}
</gameList>`;
fs.writeFileSync(outputPath, xml);
console.log(`Generated ${outputPath} with ${games.length} games`);
}
module.exports = { generateCompleteXML };