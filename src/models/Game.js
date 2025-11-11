const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  system: { type: String, required: true },  // e.g., 'mame'
  path: { type: String, required: true },    // ROM path; unique per system+path
  name: { type: String, required: true },    // Game title
  image: { type: String },
  rating: { type: Number },
  releasedate: { type: Date },
  developer: { type: String },
  publisher: { type: String },
  genre: { type: String },
  players: { type: String },
  ratio: { type: String },                   // e.g., '16:9'
  region: { type: String },                  // e.g., 'US'
  playcount: { type: Number },               // e.g., 5 (times played)
  lastplayed: { type: Date },                // Parse from YYYYMMDDTHHMMSS
  timeplayed: { type: Number },              // e.g., 3600 (seconds played)
  romtype: { type: String },                 // e.g., 'rom' or 'bios'
  desc: { type: String },                    // Game description
  source: { type: String },                  // e.g., 'Recalbox'
  timestamp: { type: Number },               // e.g., 0
  sources: [{                                // Track origins
    file: { type: String },
    importedFields: [{ type: String }]
  }],
}, { timestamps: true });

gameSchema.index({ system: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('Game', gameSchema);