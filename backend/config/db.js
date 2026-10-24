const mongoose = require('mongoose');

/**
 * Connect to MongoDB database instance using Mongoose.
 * Reads connection URI from MONGO_URI environment variable with local fallback.
 *
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kharchasense';

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // In production or strict environments, exit process on database failure
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
