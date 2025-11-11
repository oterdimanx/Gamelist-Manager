const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const parseXML = (filePath) => {
  const xmlData = fs.readFileSync(filePath, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    allowBooleanAttributes: true
  });
  const result = parser.parse(xmlData);
  return result.gameList.game || [];  // Array of games with attributes like game['@source']
};

module.exports = { parseXML };