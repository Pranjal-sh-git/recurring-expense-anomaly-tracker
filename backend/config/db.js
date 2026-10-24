require('dotenv').config();
const dns = require('node:dns');
const mongoose = require('mongoose');

// Configure reliable DNS servers to resolve MongoDB Atlas SRV records across all network environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {
  // Gracefully fallback to default system DNS if restricted
}

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
    const safeMsg = (error.message || '').replace(/:\/\/[^@\s]+@/, '://***:***@');
    console.error(`[Database Error] Failed to connect to MongoDB: ${safeMsg}`);
    // In production or strict environments, exit process on database failure
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Disconnect from MongoDB instance (useful for testing and graceful shutdown)
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly.');
  } catch (error) {
    console.error(`[Database Error] Disconnection error: ${error.message}`);
  }
};

connectDB.disconnectDB = disconnectDB;

module.exports = connectDB;
