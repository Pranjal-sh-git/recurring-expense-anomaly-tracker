require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Initialize Server ─────────────────────────────────────────────────────────

let server;

const startServer = async () => {
  try {
    // Attempt database connection
    await connectDB();
  } catch (error) {
    console.warn(`[Warning] Database connection deferred or failed: ${error.message}`);
    if (NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  server = app.listen(PORT, () => {
    console.log(`[KharchaSense API] Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`[KharchaSense API] Health check available at http://localhost:${PORT}/api/health`);
  });
};

startServer();

// ─── Process Error & Shutdown Handling ─────────────────────────────────────────

process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection] ${err.name}: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error(`[Uncaught Exception] ${err.name}: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('[KharchaSense API] SIGTERM received. Gracefully shutting down...');
  if (server) {
    server.close(() => {
      console.log('[KharchaSense API] HTTP server closed.');
      process.exit(0);
    });
  }
});
