const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Removed deprecated useNewUrlParser / useUnifiedTopology (no-ops in Mongoose 8+)
  const conn = await mongoose.connect(MONGODB_URI);
  console.log(`✅  MongoDB connected: ${conn.connection.host}`);

  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Mongoose disconnected — reconnecting automatically...');
  });

  // Graceful shutdown on process signals
  const gracefulExit = async () => {
    try { await mongoose.connection.close(); } catch (_) {}
    console.log('Mongoose connection closed on app termination');
    process.exit(0);
  };
  process.on('SIGINT',  gracefulExit);
  process.on('SIGTERM', gracefulExit);
};

module.exports = { connectDB };
