#!/usr/bin/env node
const { program } = require('commander');
const { importGames } = require('./scripts/import');
const exportGames = require('./scripts/export');
const mergeGames = require('./scripts/merge');

program
  .command('import')
  .description('Import games from XML file to MongoDB')
  .requiredOption('-s, --system <system>', 'System name (e.g., mame, megadrive)')
  .requiredOption('-f, --file <filePath>', 'Path to XML gamelist file')
  .option('-i, --ignore [fields...]', 'Fields to ignore (e.g., path image)', [])
  .action(async ({ system, file, ignore }) => {
    try {
      await importGames(system, file, ignore);
      console.log(`Import complete for ${system}`);
      process.exit(0);
    } catch (err) {
      console.error('Import failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('export')
  .description('Export games from MongoDB to XML file')
  .requiredOption('-s, --system <system>', 'System name (e.g., mame, megadrive)')
  .requiredOption('-o, --output <outputPath>', 'Output XML file path')
  .action(async ({ system, output }) => {
    try {
      await exportGames(system, output);
      console.log(`Export complete for ${system}`);
      process.exit(0);
    } catch (err) {
      console.error('Export failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('merge')
  .description('Merge metadata from complete XML (updates existing only)')
  .requiredOption('-s, --system <system>', 'System name (e.g., mame)')
  .requiredOption('-f, --file <filePath>', 'Path to complete XML')
  .option('-i, --ignore [fields...]', 'Fields to ignore from complete', [])
  .action(async ({ system, file, ignore }) => {
    try {
      await mergeGames(system, file, ignore);
      console.log(`Merge complete for ${system}`);
      process.exit(0);
    } catch (err) {
      console.error('Merge failed:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);