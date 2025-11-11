const mongoose = require('mongoose');
require('dotenv').config({ silent: true }); // Suppress logs

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected to:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;