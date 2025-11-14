const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  system: { type: String, required: true },
  name: String,
  path: String,
  image: String,
  thumbnail: String,
  desc: String,
  rating: Number,
  releasedate: String,
  developer: String,
  publisher: String,
  genre: String,
  players: String,
  region: String,
  ratio: String,
  timeplayed: Number,
  lastplayed: String,
  playcount: Number
});
const Game = mongoose.model('Game', gameSchema);

async function migrate() {
  try {
    const MONGO_URI = 'YOUR_MONGO_URI_HERE'; // e.g., 'mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority'
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    const yourUserId = '6bd71761-a3c7-4f03-a6ff-338af03804e1';
    const result = await Game.updateMany({ userId: { $exists: false } }, { $set: { userId: yourUserId } });
    console.log('Migration complete. Updated:', result.modifiedCount, 'documents');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrate();